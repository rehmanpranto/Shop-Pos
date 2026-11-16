import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { resolveCategoryId } from "../shared";

const rowSchema = z.object({
  name: z.string({ error: "Name is missing" }).trim().min(1, "Name is missing").max(200),
  sku: z.string({ error: "SKU is missing" }).trim().min(1, "SKU is missing").max(60),
  barcode: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  unit: z.string({ error: "Unit is missing" }).trim().min(1, "Unit is missing"),
  cost: z.number({ error: "Cost is missing or not a number" }).positive("Cost must be above zero"),
  retail: z.number({ error: "Retail price is missing or not a number" }).positive("Retail price must be above zero"),
  wholesale: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
});

const importSchema = z.object({ rows: z.array(z.unknown()).min(1).max(2000) });

/** Adds many products at once. Good rows are saved; bad rows are reported back with the reason. */
export async function POST(request: Request) {
  const auth = await requireApiAuth("products:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) return fail("The file has no rows, or more than 2,000 rows", 422);

  const [units, existing] = await Promise.all([
    prisma.unit.findMany({ select: { id: true, code: true, name: true } }),
    prisma.product.findMany({ where: { branchId }, select: { sku: true } }),
  ]);
  const unitByKey = new Map<string, string>();
  units.forEach((unit) => {
    unitByKey.set(unit.code.toLowerCase(), unit.id);
    unitByKey.set(unit.name.toLowerCase(), unit.id);
  });
  const usedSkus = new Set(existing.map((p) => p.sku.toLowerCase()));

  let created = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (const [index, raw] of parsed.data.rows.entries()) {
    const rowNumber = index + 2; // row 1 is the header
    const row = rowSchema.safeParse(raw);
    if (!row.success) {
      errors.push({ row: rowNumber, message: row.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    const data = row.data;
    const baseUnitId = unitByKey.get(data.unit.toLowerCase());
    if (!baseUnitId) {
      errors.push({ row: rowNumber, message: `Unknown unit "${data.unit}". Use one of: ${units.map((u) => u.code).join(", ")}` });
      continue;
    }
    if (usedSkus.has(data.sku.toLowerCase())) {
      errors.push({ row: rowNumber, message: `SKU ${data.sku} already exists` });
      continue;
    }
    const minPrice = data.minPrice ?? data.cost;
    if (minPrice > data.retail) {
      errors.push({ row: rowNumber, message: "Minimum price is higher than the retail price" });
      continue;
    }

    try {
      await prisma.product.create({
        data: {
          branchId,
          name: data.name,
          sku: data.sku,
          productCode: data.sku,
          barcode: data.barcode || data.sku,
          categoryId: await resolveCategoryId(prisma, branchId, data.category),
          baseUnitId,
          purchasePrice: data.cost,
          weightedAverageCost: data.cost,
          retailPrice: data.retail,
          wholesalePrice: data.wholesale ?? data.retail,
          minSellingPrice: minPrice,
          stockQty: data.stock,
          minStock: data.minStock,
        },
      });
      usedSkus.add(data.sku.toLowerCase());
      created += 1;
    } catch {
      errors.push({ row: rowNumber, message: "Could not save this row" });
    }
  }

  if (created > 0) {
    await prisma.auditLog.create({
      data: { userId: auth.user.id, branchId, action: "PRODUCTS_IMPORTED", entity: "Product", entityId: "import", newValues: JSON.stringify({ created, failed: errors.length }) },
    });
  }
  return ok({ created, errors });
}
