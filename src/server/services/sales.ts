import {
  EntryDirection,
  InventoryReason,
  MovementType,
  PaymentMethod,
  SalesStatus,
} from "@prisma/client";
import { nextCode } from "@/lib/ids";
import { isAllowedProductUnit } from "@/lib/product-units";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/numbers";
import { createLedgerEntry } from "@/server/services/ledger";
import { recordInventoryMovement } from "@/server/services/inventory";

export type CreateSaleInput = {
  branchId: string;
  userId: string;
  customerId?: string;
  notes?: string;
  discountAmount: number;
  taxAmount: number;
  items: Array<{
    productId: string;
    unitId: string;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
  }>;
  payments: Array<{
    accountId: string;
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
    notes?: string;
  }>;
};

export async function createSale(input: CreateSaleInput) {
  return prisma.$transaction(async (tx) => {
    const invoiceNo = await nextCode("sale", "INV", input.branchId);
    let subTotal = D(0);
    let cogsAmount = D(0);

    if (input.customerId) {
      await tx.customer.findFirstOrThrow({
        where: { id: input.customerId, branchId: input.branchId },
      });
    }

    const paymentAccountIds = [...new Set(input.payments.map((payment) => payment.accountId))];
    if (paymentAccountIds.length > 0) {
      const paymentAccounts = await tx.paymentAccount.findMany({
        where: { branchId: input.branchId, id: { in: paymentAccountIds } },
        select: { id: true },
      });

      if (paymentAccounts.length !== paymentAccountIds.length) {
        throw new Error("Invalid payment account for sale");
      }
    }

    const products = await tx.product.findMany({
      where: {
        id: { in: input.items.map((i) => i.productId) },
        branchId: input.branchId,
      },
      include: {
        unitConversions: {
          select: {
            fromUnitId: true,
            toUnitId: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of input.items) {
      const lineTotal = D(item.qty)
        .mul(item.unitPrice)
        .sub(item.discountAmount)
        .add(item.taxAmount);

      subTotal = subTotal.add(lineTotal);

      const product = productMap.get(item.productId);
      if (!product) throw new Error("Invalid product in sale item");
      if (!isAllowedProductUnit(product, item.unitId)) {
        throw new Error(`Invalid unit for product ${product.name}`);
      }
      cogsAmount = cogsAmount.add(D(item.qty).mul(product.weightedAverageCost || product.purchasePrice));
    }

    const totalAmount = subTotal.sub(input.discountAmount).add(input.taxAmount);
    const paidAmount = input.payments.reduce((acc, p) => acc.add(p.amount), D(0));
    if (paidAmount.greaterThan(totalAmount)) {
      throw new Error("Payment amount exceeds sale total");
    }
    const dueAmount = totalAmount.sub(paidAmount);

    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        branchId: input.branchId,
        customerId: input.customerId,
        status: SalesStatus.COMPLETED,
        notes: input.notes,
        subTotal,
        discountAmount: D(input.discountAmount),
        taxAmount: D(input.taxAmount),
        totalAmount,
        paidAmount,
        dueAmount,
        cogsAmount,
        grossProfit: totalAmount.sub(cogsAmount),
        createdById: input.userId,
      },
    });

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      if (!isAllowedProductUnit(product, item.unitId)) {
        throw new Error(`Invalid unit for product ${product.name}`);
      }
      const lineTotal = D(item.qty)
        .mul(item.unitPrice)
        .sub(item.discountAmount)
        .add(item.taxAmount);

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          unitPrice: D(item.unitPrice),
          unitCost: product.weightedAverageCost || product.purchasePrice,
          discountAmount: D(item.discountAmount),
          taxAmount: D(item.taxAmount),
          lineTotal,
        },
      });

      await recordInventoryMovement(tx, {
        branchId: input.branchId,
        productId: item.productId,
        unitId: item.unitId,
        qty: D(item.qty),
        movementType: MovementType.STOCK_OUT,
        reason: InventoryReason.SALE,
        referenceNo: invoiceNo,
        referenceType: "SALE",
        userId: input.userId,
      });
    }

    for (const payment of input.payments) {
      await tx.payment.create({
        data: {
          branchId: input.branchId,
          saleId: sale.id,
          customerId: input.customerId,
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
        transactionType: "SALE",
        direction: EntryDirection.DEBIT,
        saleId: sale.id,
        customerId: input.customerId,
        referenceNo: payment.referenceNo,
      });
    }

    if (input.customerId && dueAmount.greaterThan(0)) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstanding: { increment: dueAmount } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        branchId: input.branchId,
        action: "SALE_CREATED",
        entity: "Sale",
        entityId: sale.id,
        newValues: JSON.stringify({ invoiceNo, totalAmount: totalAmount.toString(), paidAmount: paidAmount.toString() }),
      },
    });

    return sale;
  });
}
