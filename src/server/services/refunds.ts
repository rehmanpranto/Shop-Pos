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

    const refundNo = await nextCode(tx, "refund", "RF", input.branchId);
    let refundAmount = D(0);

    const saleItemsById = new Map(sale.items.map((i) => [i.id, i]));

    // What the customer actually paid per unit: the line's own discount and tax, plus this
    // line's share of any discount or tax applied to the whole sale.
    const saleFactor = D(sale.subTotal).greaterThan(0) ? D(sale.totalAmount).div(sale.subTotal) : D(1);
    const paidPerUnit = (source: (typeof sale.items)[number]) =>
      D(source.qty).greaterThan(0) ? D(source.lineTotal).div(source.qty).mul(saleFactor) : D(0);
    const refundLineTotal = (source: (typeof sale.items)[number], qty: number) => paidPerUnit(source).mul(qty).toDecimalPlaces(2);
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
      refundAmount = refundAmount.add(refundLineTotal(source, item.qty));
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
      const lineTotal = refundLineTotal(source, item.qty);

      await tx.refundItem.create({
        data: {
          refundId: refund.id,
          productId: source.productId,
          unitId: source.unitId,
          saleItemId: source.id,
          qty: D(item.qty),
          unitPrice: paidPerUnit(source),
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

    if (!input.accountId) {
      // No cash was paid back, so the refund comes off what the customer owes on this sale.
      if (!sale.customerId) throw new Error("Choose an account to pay the refund from");
      if (refundAmount.greaterThan(sale.dueAmount)) {
        throw new Error("Refund is more than the unpaid amount on this sale. Pay the refund from an account instead");
      }
      await tx.sale.update({ where: { id: sale.id }, data: { dueAmount: { decrement: refundAmount } } });
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
