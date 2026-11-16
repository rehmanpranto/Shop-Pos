import { InventoryReason, MovementType, Prisma, UserRole } from "@prisma/client";
import { requireUnitFactor } from "@/lib/product-units";

/**
 * Moves stock in or out and writes the ledger row.
 * `qty` is in `unitId`; it is converted to the product's base unit before stock changes,
 * so selling 1 BOX of a product kept in pieces removes 12 pieces, not 1.
 */
export async function recordInventoryMovement(
  tx: Prisma.TransactionClient,
  input: {
    branchId: string;
    productId: string;
    unitId: string;
    qty: Prisma.Decimal;
    movementType: MovementType;
    reason: InventoryReason;
    referenceNo: string;
    referenceType: string;
    userId: string;
    note?: string;
  },
) {
  const product = await tx.product.findFirstOrThrow({
    where: { id: input.productId, branchId: input.branchId },
    include: { unitConversions: true },
  });
  const baseQty = input.qty.mul(requireUnitFactor(product, input.unitId));
  const incoming = input.movementType === MovementType.STOCK_IN || input.movementType === MovementType.STOCK_RETURN;

  // Change stock in the database itself so two sales at the same moment cannot both read the old value.
  const updated = await tx.product.update({
    where: { id: product.id },
    data: { stockQty: incoming ? { increment: baseQty } : { decrement: baseQty } },
    select: { stockQty: true },
  });
  const newStock = updated.stockQty;
  if (newStock.lessThan(0)) {
    throw new Error(`Insufficient stock for ${product.name}`);
  }
  const previousStock = incoming ? newStock.sub(baseQty) : newStock.add(baseQty);

  await tx.inventoryTransaction.create({
    data: {
      branchId: input.branchId,
      productId: input.productId,
      unitId: input.unitId,
      qty: input.qty,
      movementType: input.movementType,
      reason: input.reason,
      referenceNo: input.referenceNo,
      referenceType: input.referenceType,
      previousStock,
      newStock,
      createdById: input.userId,
      note: input.note,
    },
  });

  return { baseQty, previousStock, newStock };
}

export function canProcessRefund(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "CASHIER";
}
