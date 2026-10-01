import {
  InventoryReason,
  MovementType,
  Prisma,
  UserRole,
} from "@prisma/client";

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
  });
  const previousStock = product.stockQty;

  const newStock =
    input.movementType === MovementType.STOCK_IN ||
    input.movementType === MovementType.STOCK_RETURN
      ? previousStock.add(input.qty)
      : previousStock.sub(input.qty);

  if (newStock.lessThan(0)) {
    throw new Error(`Insufficient stock for ${product.name}`);
  }

  await tx.product.update({
    where: { id: product.id },
    data: { stockQty: newStock },
  });

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
}

export function canProcessRefund(role: UserRole) {
  return role === "ADMIN" || role === "MANAGER" || role === "CASHIER";
}
