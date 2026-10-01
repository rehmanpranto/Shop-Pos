import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { z } from "zod";

const createProductSchema = z.object({
  productCode: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  baseUnitId: z.string().min(1),
  purchasePrice: z.number().positive(),
  retailPrice: z.number().positive(),
  wholesalePrice: z.number().positive(),
  minSellingPrice: z.number().positive(),
  stockQty: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).default(0),
  supplierId: z.string().optional(),
  taxRate: z.number().min(0).default(0),
  imageUrl: z.string().optional(),
  variations: z
    .array(
      z.object({
        variationName: z.string(),
        attributesJson: z.string(),
        sku: z.string(),
        barcode: z.string().optional(),
        costPrice: z.number(),
        sellingPrice: z.number(),
        stockQty: z.number().min(0),
      }),
    )
    .default([]),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth("products:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

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
      include: { category: true, baseUnit: true, supplier: true, variations: true },
      orderBy: { createdAt: "desc" },
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

  try {
    const payload = createProductSchema.parse(await request.json());

    const product = await prisma.product.create({
      data: {
        ...payload,
        barcode: payload.barcode?.trim() || payload.sku,
        branchId: auth.user.branchId!,
        weightedAverageCost: payload.purchasePrice,
        variations: {
          create: payload.variations,
        },
      },
      include: { variations: true },
    });

    return ok(product, 201);
  } catch (error) {
    return fail("Failed to create product", 400, `${error}`);
  }
}
