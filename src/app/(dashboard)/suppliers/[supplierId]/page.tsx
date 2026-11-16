import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { humanize, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { buttonClass } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { Statement, type StatementRow } from "@/components/ui/statement";
import { PaySupplier } from "../pay-supplier";

export default async function SupplierStatementPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  const { user, branchId } = await getSessionContext();
  if (!branchId) notFound();

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, branchId } });
  if (!supplier) notFound();

  const [setting, purchases, payments, accounts] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.purchase.findMany({
      where: { branchId, supplierId, status: { not: "CANCELLED" } },
      select: { purchaseNo: true, supplierInvoiceNo: true, purchaseDate: true, totalAmount: true, dueAmount: true },
    }),
    prisma.payment.findMany({
      where: { branchId, supplierId, purchase: { status: { not: "CANCELLED" } } },
      select: { createdAt: true, amount: true, method: true, purchase: { select: { purchaseNo: true } } },
    }),
    prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: StatementRow[] = [
    ...purchases.map((purchase) => ({
      date: purchase.purchaseDate,
      description: "Purchase",
      reference: [purchase.purchaseNo, purchase.supplierInvoiceNo].filter(Boolean).join(" · "),
      charge: toNumber(purchase.totalAmount),
      payment: 0,
    })),
    ...payments.map((payment) => ({
      date: payment.createdAt,
      description: "Payment made",
      reference: [payment.purchase?.purchaseNo, humanize(payment.method)].filter(Boolean).join(" · "),
      charge: 0,
      payment: toNumber(payment.amount),
    })),
  ];
  const owed = purchases.reduce((sum, purchase) => sum + toNumber(purchase.dueAmount), 0);
  const canPay = user ? can(user.role, "payments:create") : false;

  return (
    <Statement
      businessName={setting?.businessName ?? DEFAULT_BUSINESS_NAME}
      businessLine={[setting?.address, setting?.phone].filter(Boolean).join(" · ")}
      title="Supplier statement"
      party={supplier.name}
      partyLines={[supplier.company ?? "", supplier.phone ?? "", supplier.address ?? "", `Supplier code ${supplier.supplierCode}`]}
      rows={rows}
      balanceLabel="You owe"
      actions={
        <>
          <Link href="/suppliers" className={buttonClass("ghost", "md", "mr-auto")}>
            <ArrowLeft className="h-4 w-4" />
            Suppliers
          </Link>
          {owed > 0 && canPay ? <PaySupplier supplierId={supplier.id} name={supplier.name} owed={owed} accounts={accounts} size="md" /> : null}
          <PrintButton label="Print statement" />
        </>
      }
    />
  );
}
