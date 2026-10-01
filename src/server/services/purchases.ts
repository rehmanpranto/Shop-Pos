import {
  EntryDirection,
  InventoryReason,
  MovementType,
  PaymentMethod,
  PurchaseStatus,
} from "@prisma/client";
import { nextCode } from "@/lib/ids";
import { isAllowedProductUnit } from "@/lib/product-units";
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

export async function createPurchase(input: CreatePurchaseInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseNo = await nextCode("purchase", "PO", input.branchId);
    let subTotal = D(0);

    await tx.supplier.findFirstOrThrow({
      where: { id: input.supplierId, branchId: input.branchId },
    });

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

    for (const item of input.items) {
      subTotal = subTotal.add(D(item.qty).mul(item.unitCost).sub(item.discountAmount).add(item.taxAmount));
    }

    const totalAmount = subTotal
      .sub(input.discountAmount)
      .add(input.taxAmount)
      .add(input.shippingCost)
      .add(input.otherCost);
    const paidAmount = input.payments.reduce((acc, p) => acc.add(p.amount), D(0));
    if (paidAmount.greaterThan(totalAmount)) {
      throw new Error("Payment amount exceeds purchase total");
    }
    const dueAmount = totalAmount.sub(paidAmount);

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
        dueAmount,
        createdById: input.userId,
        notes: input.notes,
      },
    });

    for (const item of input.items) {
      const lineTotal = D(item.qty).mul(item.unitCost).sub(item.discountAmount).add(item.taxAmount);
      const product = await tx.product.findFirstOrThrow({
        where: { id: item.productId, branchId: input.branchId },
        include: {
          unitConversions: {
            select: {
              fromUnitId: true,
              toUnitId: true,
            },
          },
        },
      });
      if (!isAllowedProductUnit(product, item.unitId)) {
        throw new Error(`Invalid unit for product ${product.name}`);
      }
      const oldQty = D(product.stockQty);
      const oldCost = D(product.weightedAverageCost || product.purchasePrice);

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          unitCost: D(item.unitCost),
          discountAmount: D(item.discountAmount),
          taxAmount: D(item.taxAmount),
          lineTotal,
        },
      });

      if (input.status === PurchaseStatus.RECEIVED || input.status === PurchaseStatus.PARTIALLY_RECEIVED) {
        await recordInventoryMovement(tx, {
          branchId: input.branchId,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          movementType: MovementType.STOCK_IN,
          reason: InventoryReason.PURCHASE,
          referenceNo: purchaseNo,
          referenceType: "PURCHASE",
          userId: input.userId,
        });

        // Weighted average update at receipt.
        const receivedQty = D(item.qty);
        const receivedCost = D(item.unitCost);

        const denominator = oldQty.add(receivedQty);
        const weightedAverageCost = denominator.greaterThan(0)
          ? oldQty.mul(oldCost).add(receivedQty.mul(receivedCost)).div(denominator)
          : receivedCost;

        await tx.product.update({
          where: { id: item.productId },
          data: { weightedAverageCost },
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
        referenceNo: payment.referenceNo,
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
