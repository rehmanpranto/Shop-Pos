import { EntryDirection, InventoryReason, MovementType, PaymentMethod, Prisma, PurchaseStatus } from "@prisma/client";
import { nextCode } from "@/lib/ids";
import { requireUnitFactor } from "@/lib/product-units";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/numbers";
import { createLedgerEntry } from "@/server/services/ledger";
import { recordInventoryMovement } from "@/server/services/inventory";

export type CreatePurchaseInput = {
  branchId: string;
  userId: string;
  supplierId: string;
  supplierInvoiceNo?: string;
  notes?: string;
  purchaseDate?: string;
  dueDate?: string;
  status: PurchaseStatus;
  items: Array<{
    productId: string;
    unitId: string;
    qty: number;
    unitCost: number;
    discountAmount: number;
    taxAmount: number;
  }>;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  otherCost: number;
  payments: Array<{
    accountId: string;
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
    notes?: string;
  }>;
};

/** Adds received goods to stock and folds their cost into the product's weighted average cost. */
async function receiveIntoStock(
  tx: Prisma.TransactionClient,
  input: { branchId: string; userId: string; purchaseNo: string; productId: string; unitId: string; qty: Prisma.Decimal; unitCost: Prisma.Decimal },
) {
  const product = await tx.product.findFirstOrThrow({
    where: { id: input.productId, branchId: input.branchId },
    include: { unitConversions: true },
  });
  const factor = requireUnitFactor(product, input.unitId);
  const oldCost = D(product.weightedAverageCost).greaterThan(0) ? D(product.weightedAverageCost) : D(product.purchasePrice);

  const { baseQty, previousStock } = await recordInventoryMovement(tx, {
    branchId: input.branchId,
    productId: input.productId,
    unitId: input.unitId,
    qty: input.qty,
    movementType: MovementType.STOCK_IN,
    reason: InventoryReason.PURCHASE,
    referenceNo: input.purchaseNo,
    referenceType: "PURCHASE",
    userId: input.userId,
  });

  const costPerBase = D(input.unitCost).div(factor);
  const oldQty = previousStock.greaterThan(0) ? previousStock : D(0);
  const denominator = oldQty.add(baseQty);
  const weightedAverageCost = denominator.greaterThan(0) ? oldQty.mul(oldCost).add(baseQty.mul(costPerBase)).div(denominator) : costPerBase;

  await tx.product.update({
    where: { id: product.id },
    data: { weightedAverageCost, purchasePrice: costPerBase },
  });
}

export async function createPurchase(input: CreatePurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseNo = await nextCode(tx, "purchase", "PO", input.branchId);
    const receiveNow = input.status === PurchaseStatus.RECEIVED;

    await tx.supplier.findFirstOrThrow({ where: { id: input.supplierId, branchId: input.branchId } });

    const paymentAccountIds = [...new Set(input.payments.map((payment) => payment.accountId))];
    if (paymentAccountIds.length > 0) {
      const paymentAccounts = await tx.paymentAccount.findMany({
        where: { branchId: input.branchId, id: { in: paymentAccountIds } },
        select: { id: true },
      });
      if (paymentAccounts.length !== paymentAccountIds.length) {
        throw new Error("Invalid payment account for purchase");
      }
    }

    const lineTotalOf = (item: CreatePurchaseInput["items"][number]) => D(item.qty).mul(item.unitCost).sub(item.discountAmount).add(item.taxAmount);
    const subTotal = input.items.reduce((sum, item) => sum.add(lineTotalOf(item)), D(0));
    const totalAmount = subTotal.sub(input.discountAmount).add(input.taxAmount).add(input.shippingCost).add(input.otherCost);
    const paidAmount = input.payments.reduce((acc, p) => acc.add(p.amount), D(0));
    if (paidAmount.greaterThan(totalAmount)) {
      throw new Error("Payment amount exceeds purchase total");
    }

    const purchase = await tx.purchase.create({
      data: {
        purchaseNo,
        supplierInvoiceNo: input.supplierInvoiceNo,
        branchId: input.branchId,
        supplierId: input.supplierId,
        status: input.status,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        subTotal,
        discountAmount: D(input.discountAmount),
        taxAmount: D(input.taxAmount),
        shippingCost: D(input.shippingCost),
        otherCost: D(input.otherCost),
        totalAmount,
        paidAmount,
        dueAmount: totalAmount.sub(paidAmount),
        createdById: input.userId,
        notes: input.notes,
      },
    });

    for (const item of input.items) {
      const product = await tx.product.findFirstOrThrow({
        where: { id: item.productId, branchId: input.branchId },
        include: { unitConversions: true },
      });
      requireUnitFactor(product, item.unitId);

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          receivedQty: receiveNow ? D(item.qty) : D(0),
          unitCost: D(item.unitCost),
          discountAmount: D(item.discountAmount),
          taxAmount: D(item.taxAmount),
          lineTotal: lineTotalOf(item),
        },
      });

      if (receiveNow) {
        await receiveIntoStock(tx, {
          branchId: input.branchId,
          userId: input.userId,
          purchaseNo,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          unitCost: D(item.unitCost),
        });
      }
    }

    for (const payment of input.payments) {
      await tx.payment.create({
        data: {
          branchId: input.branchId,
          purchaseId: purchase.id,
          supplierId: input.supplierId,
          accountId: payment.accountId,
          method: payment.method,
          amount: D(payment.amount),
          referenceNo: payment.referenceNo,
          notes: payment.notes,
        },
      });

      await createLedgerEntry(tx, {
        branchId: input.branchId,
        createdById: input.userId,
        accountId: payment.accountId,
        method: payment.method,
        amount: D(payment.amount),
        transactionType: "PURCHASE",
        direction: EntryDirection.CREDIT,
        purchaseId: purchase.id,
        supplierId: input.supplierId,
        referenceNo: payment.referenceNo ?? purchaseNo,
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        branchId: input.branchId,
        action: "PURCHASE_CREATED",
        entity: "Purchase",
        entityId: purchase.id,
        newValues: JSON.stringify({ purchaseNo, totalAmount: totalAmount.toString(), status: input.status }),
      },
    });

    return purchase;
  });
}

/** Receives some or all of the outstanding quantity on an ordered purchase. */
export async function receivePurchase(input: { branchId: string; userId: string; purchaseId: string; items: Array<{ itemId: string; qty: number }> }) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirstOrThrow({
      where: { id: input.purchaseId, branchId: input.branchId },
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    if (purchase.status === PurchaseStatus.CANCELLED) throw new Error("This purchase was cancelled");
    if (purchase.status === PurchaseStatus.RECEIVED) throw new Error("This purchase is already fully received");

    const itemsById = new Map(purchase.items.map((item) => [item.id, item]));
    const received = new Map(purchase.items.map((item) => [item.id, D(item.receivedQty)]));

    for (const line of input.items) {
      const item = itemsById.get(line.itemId);
      if (!item) throw new Error("Invalid purchase item");
      const qty = D(line.qty);
      const already = received.get(item.id)!;
      if (already.add(qty).greaterThan(item.qty)) {
        throw new Error(`Only ${D(item.qty).sub(already).toString()} of ${item.product.name} is still to be received`);
      }

      await receiveIntoStock(tx, {
        branchId: input.branchId,
        userId: input.userId,
        purchaseNo: purchase.purchaseNo,
        productId: item.productId,
        unitId: item.unitId,
        qty,
        unitCost: D(item.unitCost),
      });
      await tx.purchaseItem.update({ where: { id: item.id }, data: { receivedQty: { increment: qty } } });
      received.set(item.id, already.add(qty));
    }

    const complete = purchase.items.every((item) => received.get(item.id)!.greaterThanOrEqualTo(item.qty));
    const updated = await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: complete ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIALLY_RECEIVED },
      select: { id: true, purchaseNo: true, status: true },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        branchId: input.branchId,
        action: "PURCHASE_RECEIVED",
        entity: "Purchase",
        entityId: purchase.id,
        newValues: JSON.stringify({ purchaseNo: purchase.purchaseNo, status: updated.status, lines: input.items.length }),
      },
    });

    return updated;
  });
}
