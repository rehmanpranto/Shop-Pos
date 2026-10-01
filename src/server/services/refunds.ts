import { EntryDirection, InventoryReason, MovementType, PaymentMethod } from "@prisma/client";
import { nextCode } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/numbers";
import { createLedgerEntry } from "@/server/services/ledger";
import { recordInventoryMovement } from "@/server/services/inventory";

export async function createRefund(input: {
  branchId: string;
  userId: string;
  saleId: string;
  reason?: string;
  paymentMethod: PaymentMethod;
  accountId?: string;
  items: Array<{ saleItemId: string; qty: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirstOrThrow({
      where: { id: input.saleId, branchId: input.branchId },
      include: { items: true, refunds: { include: { items: true } } },
    });

    if (sale.status !== "COMPLETED") throw new Error("Only completed sales can be refunded");

    if (input.accountId) {
      await tx.paymentAccount.findFirstOrThrow({
        where: { id: input.accountId, branchId: input.branchId },
      });
    }

    const refundNo = await nextCode("refund", "RF", input.branchId);
    let refundAmount = D(0);

    const saleItemsById = new Map(sale.items.map((i) => [i.id, i]));
    const refundedBySaleItemId = new Map<string, ReturnType<typeof D>>();
    for (const previousRefund of sale.refunds) {
      for (const previousItem of previousRefund.items) {
        if (!previousItem.saleItemId) continue;
        refundedBySaleItemId.set(
          previousItem.saleItemId,
          (refundedBySaleItemId.get(previousItem.saleItemId) ?? D(0)).add(previousItem.qty),
        );
      }
    }
    const requestedBySaleItemId = new Map<string, ReturnType<typeof D>>();

    for (const item of input.items) {
      const source = saleItemsById.get(item.saleItemId);
      if (!source) throw new Error("Invalid sale item for refund");
      const requestedQty = (requestedBySaleItemId.get(item.saleItemId) ?? D(0)).add(item.qty);
      const alreadyRefunded = refundedBySaleItemId.get(item.saleItemId) ?? D(0);
      if (alreadyRefunded.add(requestedQty).greaterThan(source.qty)) {
        throw new Error("Refund quantity exceeds remaining sold quantity");
      }
      requestedBySaleItemId.set(item.saleItemId, requestedQty);
      refundAmount = refundAmount.add(D(item.qty).mul(source.unitPrice));
    }

    const refund = await tx.refund.create({
      data: {
        refundNo,
        branchId: input.branchId,
        saleId: sale.id,
        customerId: sale.customerId,
        refundAmount,
        reason: input.reason,
        paymentMethod: input.paymentMethod,
        status: "COMPLETED",
        createdById: input.userId,
      },
    });

    for (const item of input.items) {
      const source = saleItemsById.get(item.saleItemId)!;
      const lineTotal = D(item.qty).mul(source.unitPrice);

      await tx.refundItem.create({
        data: {
          refundId: refund.id,
          productId: source.productId,
          unitId: source.unitId,
          saleItemId: source.id,
          qty: D(item.qty),
          unitPrice: source.unitPrice,
          lineTotal,
        },
      });

      await recordInventoryMovement(tx, {
        branchId: input.branchId,
        productId: source.productId,
        unitId: source.unitId,
        qty: D(item.qty),
        movementType: MovementType.STOCK_RETURN,
        reason: InventoryReason.REFUND_RETURN,
        referenceNo: refundNo,
        referenceType: "REFUND",
        userId: input.userId,
      });
    }

    if (input.accountId) {
      await tx.payment.create({
        data: {
          branchId: input.branchId,
          refundId: refund.id,
          saleId: sale.id,
          customerId: sale.customerId,
          accountId: input.accountId,
          method: input.paymentMethod,
          amount: refundAmount,
          notes: "Refund payout",
        },
      });

      await createLedgerEntry(tx, {
        branchId: input.branchId,
        createdById: input.userId,
        accountId: input.accountId,
        method: input.paymentMethod,
        amount: refundAmount,
        transactionType: "REFUND",
        direction: EntryDirection.CREDIT,
        refundId: refund.id,
        saleId: sale.id,
        customerId: sale.customerId ?? undefined,
      });
    }

    if (sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { outstanding: { decrement: refundAmount } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        branchId: input.branchId,
        action: "REFUND_CREATED",
        entity: "Refund",
        entityId: refund.id,
        newValues: JSON.stringify({ saleId: sale.id, amount: refundAmount.toString(), items: input.items }),
      },
    });

    return refund;
  });
}
