import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import type { PurchaseProduct } from "./purchase-form";

/** Suppliers, products and accounts the purchase form needs. */
export async function loadPurchaseFormData(branchId: string) {
  const [suppliers, products, accounts] = await Promise.all([
    prisma.supplier.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: "asc" },
      include: { baseUnit: { select: { id: true, code: true } }, unitConversions: { include: { fromUnit: { select: { code: true } } } } },
    }),
    prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, method: true } }),
  ]);

  const formProducts: PurchaseProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    purchasePrice: toNumber(p.purchasePrice),
    units: [{ id: p.baseUnit.id, code: p.baseUnit.code, factor: 1 }, ...p.unitConversions.map((c) => ({ id: c.fromUnitId, code: c.fromUnit.code, factor: toNumber(c.factor) }))],
  }));

  return { suppliers, accounts, products, formProducts };
}
