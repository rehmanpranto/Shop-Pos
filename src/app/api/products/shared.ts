import type { Prisma } from "@prisma/client";
import { z } from "zod";

/** "1 of this unit = factor × the product's base unit", e.g. { unitId: BOX, factor: 12 }. */
export const conversionsSchema = z
  .array(z.object({ unitId: z.string().min(1), factor: z.number().positive() }))
  .max(6)
  .default([]);

type Conversion = { unitId: string; factor: number };

export function conversionRows(baseUnitId: string, conversions: Conversion[]) {
  const seen = new Set<string>();
  return conversions
    .filter((c) => c.unitId !== baseUnitId && !seen.has(c.unitId) && seen.add(c.unitId))
    .map((c) => ({ fromUnitId: c.unitId, toUnitId: baseUnitId, factor: c.factor }));
}

/** Finds a category by name in the branch, creating it if needed. Empty name means no category. */
export async function resolveCategoryId(db: Prisma.TransactionClient, branchId: string, name: string | undefined): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const category = await db.category.upsert({
    where: { branchId_name: { branchId, name: trimmed } },
    create: { branchId, name: trimmed },
    update: {},
  });
  return category.id;
}

/** Makes sure a supplier id belongs to the branch. Empty means no supplier. */
export async function resolveSupplierId(db: Prisma.TransactionClient, branchId: string, supplierId: string | undefined): Promise<string | null> {
  if (!supplierId) return null;
  const supplier = await db.supplier.findFirst({ where: { id: supplierId, branchId }, select: { id: true } });
  if (!supplier) throw new Error("Supplier not found");
  return supplier.id;
}
