import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { conversionRows, conversionsSchema, resolveCategoryId, resolveSupplierId } from "./shared";

const createProductSchema = z.object({
  productCode: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  categoryName: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(80).optional(),
  baseUnitId: z.string().min(1),
  purchasePrice: z.number().positive(),
  retailPrice: z.number().positive(),
  wholesalePrice: z.number().positive(),
  minSellingPrice: z.number().positive(),
  stockQty: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  supplierId: z.string().optional(),
  conversions: conversionsSchema,
});

export async function GET(request: Request) {
  const auth = await requireApiAuth("products:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1), 2000);

  const where = {
    branchId: auth.user.branchId ?? undefined,
    categoryId,
    OR: q
      ? [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
          { barcode: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        baseUnit: true,
        supplier: { select: { id: true, name: true } },
        unitConversions: { select: { fromUnitId: true, factor: true, fromUnit: { select: { id: true, code: true, name: true } } } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return ok({ items, total, page, pageSize });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("products:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  try {
    const { categoryName, supplierId, conversions, ...payload } = createProductSchema.parse(await request.json());

    const product = await prisma.$transaction(async (tx) =>
      tx.product.create({
        data: {
          ...payload,
          barcode: payload.barcode || payload.sku,
          branchId,
          categoryId: await resolveCategoryId(tx, branchId, categoryName),
          supplierId: await resolveSupplierId(tx, branchId, supplierId),
          weightedAverageCost: payload.purchasePrice,
          unitConversions: { create: conversionRows(payload.baseUnitId, conversions) },
        },
      }),
    );

    return ok(product, 201);
  } catch (error) {
    const duplicate = `${error}`.includes("Unique constraint");
    return fail(duplicate ? "A product with that SKU already exists" : "Failed to create product", 400, duplicate ? undefined : `${error}`);
  }
}
