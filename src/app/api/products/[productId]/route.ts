import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { conversionRows, conversionsSchema, resolveCategoryId, resolveSupplierId } from "../shared";

const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  barcode: z.string().trim().max(80).optional(),
  categoryName: z.string().trim().max(80).optional(),
  supplierId: z.string().optional(),
  purchasePrice: z.number().positive(),
  retailPrice: z.number().positive(),
  wholesalePrice: z.number().positive(),
  minSellingPrice: z.number().positive(),
  minStock: z.number().min(0),
  description: z.string().max(5000).optional(),
  brand: z.string().trim().max(80).optional(),
  manufacturerId: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  imageUrl: z.string().url().optional().or(z.literal("")),
  maxStock: z.number().min(0),
  isActive: z.boolean(),
  conversions: conversionsSchema,
});

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const auth = await requireApiAuth("products:update");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;
  const { productId } = await params;

  try {
    const { categoryName, supplierId, manufacturerId, conversions, ...input } = updateProductSchema.parse(await request.json());
    const existing = await prisma.product.findFirst({ where: { id: productId, branchId } });
    if (!existing) return fail("Product not found", 404);
    if (manufacturerId) {
      const manufacturer = await prisma.manufacturer.findFirst({ where: { id: manufacturerId, branchId }, select: { id: true } });
      if (!manufacturer) return fail("Manufacturer not found", 400);
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.productUnitConversion.deleteMany({ where: { productId: existing.id } });
      return tx.product.update({
        where: { id: existing.id },
        data: {
          ...input,
          barcode: input.barcode || existing.sku,
          categoryId: await resolveCategoryId(tx, branchId, categoryName),
          supplierId: await resolveSupplierId(tx, branchId, supplierId),
          manufacturerId: manufacturerId || null,
          unitConversions: { create: conversionRows(existing.baseUnitId, conversions) },
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        branchId,
        action: "PRODUCT_UPDATED",
        entity: "Product",
        entityId: product.id,
        oldValues: JSON.stringify({ name: existing.name, retailPrice: existing.retailPrice.toString(), isActive: existing.isActive }),
        newValues: JSON.stringify({ name: product.name, retailPrice: product.retailPrice.toString(), isActive: product.isActive }),
      },
    });

    return ok({ id: product.id });
  } catch (error) {
    return fail("Failed to update product", 400, `${error}`);
  }
}
