import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/response";

/**
 * Downloads every business record as one JSON file. Admin only.
 * Password hashes, sign-in sessions and mail passwords are left out on purpose.
 */
export async function GET() {
  const auth = await requireApiAuth("backup:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const [
    branches, users, settings, units, categories, products, unitConversions, customers, suppliers, paymentAccounts,
    sales, saleItems, purchases, purchaseItems, refunds, refundItems, payments, ledger, inventory, expenseCategories,
    expenses, quotations, quotationItems, deliveries, closings, counters,
  ] = await Promise.all([
    prisma.branch.findMany(),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, branchId: true, createdAt: true } }),
    prisma.businessSetting.findMany({ omit: { smtpPassword: true } }),
    prisma.unit.findMany(),
    prisma.category.findMany(),
    prisma.product.findMany(),
    prisma.productUnitConversion.findMany(),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
    prisma.paymentAccount.findMany(),
    prisma.sale.findMany(),
    prisma.saleItem.findMany(),
    prisma.purchase.findMany(),
    prisma.purchaseItem.findMany(),
    prisma.refund.findMany(),
    prisma.refundItem.findMany(),
    prisma.payment.findMany(),
    prisma.paymentLedger.findMany(),
    prisma.inventoryTransaction.findMany(),
    prisma.expenseCategory.findMany(),
    prisma.expense.findMany(),
    prisma.quotation.findMany(),
    prisma.quotationItem.findMany(),
    prisma.delivery.findMany(),
    prisma.dailyClosing.findMany(),
    prisma.documentCounter.findMany(),
  ]);

  const exportedAt = new Date();
  await prisma.auditLog.create({
    data: { userId: auth.user.id, branchId: auth.user.branchId, action: "BACKUP_DOWNLOADED", entity: "Backup", entityId: exportedAt.toISOString() },
  });

  const body = JSON.stringify(
    {
      exportedAt,
      branches, users, settings, units, categories, products, unitConversions, customers, suppliers, paymentAccounts,
      sales, saleItems, purchases, purchaseItems, refunds, refundItems, payments, ledger, inventory, expenseCategories,
      expenses, quotations, quotationItems, deliveries, closings, counters,
    },
    null,
    1,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="shop-backup-${exportedAt.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
