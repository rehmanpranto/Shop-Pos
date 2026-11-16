import { EntryDirection, InventoryReason, MovementType, PaymentMethod, SalesStatus, UserRole } from "@prisma/client";
import { nextCode } from "@/lib/ids";
import { requireUnitFactor } from "@/lib/product-units";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/numbers";
import { createLedgerEntry } from "@/server/services/ledger";
import { recordInventoryMovement } from "@/server/services/inventory";

export type CreateSaleInput = {
  branchId: string;
  userId: string;
  /** Role of the person selling. Only admins and managers may sell below the minimum price. */
  userRole?: UserRole;
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
  const canOverridePrice = input.userRole === "ADMIN" || input.userRole === "MANAGER";

  return prisma.$transaction(async (tx) => {
    if (input.customerId) {
      await tx.customer.findFirstOrThrow({ where: { id: input.customerId, branchId: input.branchId } });
    }

    const paymentAccountIds = [...new Set(input.payments.map((payment) => payment.accountId))];
    const paymentAccounts = await tx.paymentAccount.findMany({
      where: { branchId: input.branchId, id: { in: paymentAccountIds } },
      select: { id: true },
    });
    if (paymentAccounts.length !== paymentAccountIds.length) {
      throw new Error("Invalid payment account for sale");
    }

    const products = await tx.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, branchId: input.branchId },
      include: { unitConversions: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Price every line once, in the unit it is sold in.
    const lines = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Invalid product in sale item");
      if (!product.isActive) throw new Error(`${product.name} is not available for sale`);

      const factor = requireUnitFactor(product, item.unitId);
      const minimumPrice = D(product.minSellingPrice).mul(factor);
      if (!canOverridePrice && D(item.unitPrice).lessThan(minimumPrice)) {
        throw new Error(`${product.name} cannot be sold below ${minimumPrice.toFixed(2)}`);
      }

      const costPerBase = D(product.weightedAverageCost).greaterThan(0) ? D(product.weightedAverageCost) : D(product.purchasePrice);
      const unitCost = costPerBase.mul(factor);
      const lineTotal = D(item.qty).mul(item.unitPrice).sub(item.discountAmount).add(item.taxAmount);
      if (lineTotal.lessThan(0)) throw new Error(`Discount on ${product.name} is more than the line total`);
      return { item, product, unitCost, lineTotal, cogs: D(item.qty).mul(unitCost) };
    });

    const subTotal = lines.reduce((sum, line) => sum.add(line.lineTotal), D(0));
    const cogsAmount = lines.reduce((sum, line) => sum.add(line.cogs), D(0));
    const totalAmount = subTotal.sub(input.discountAmount).add(input.taxAmount);
    if (totalAmount.lessThan(0)) throw new Error("Discount is more than the sale total");

    const paidAmount = input.payments.reduce((acc, p) => acc.add(p.amount), D(0));
    if (paidAmount.greaterThan(totalAmount)) {
      throw new Error("Payment amount exceeds sale total");
    }
    const dueAmount = totalAmount.sub(paidAmount);
    if (dueAmount.greaterThan(0) && !input.customerId) {
      throw new Error("Choose a customer to sell on credit");
    }

    const invoiceNo = await nextCode(tx, "sale", "INV", input.branchId);
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

    for (const { item, unitCost, lineTotal } of lines) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: D(item.qty),
          unitPrice: D(item.unitPrice),
          unitCost,
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
        referenceNo: payment.referenceNo ?? invoiceNo,
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
