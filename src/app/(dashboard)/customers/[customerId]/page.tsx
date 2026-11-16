import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { formatMoney, humanize, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { whatsappLink } from "@/lib/whatsapp";
import { buttonClass } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/print-button";
import { Statement, type StatementRow } from "@/components/ui/statement";
import { ReceivePayment } from "../receive-payment";

export default async function CustomerStatementPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const { user, branchId } = await getSessionContext();
  if (!branchId) notFound();

  const customer = await prisma.customer.findFirst({ where: { id: customerId, branchId } });
  if (!customer) notFound();

  const [setting, sales, payments, refunds, accounts] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.sale.findMany({ where: { branchId, customerId, status: "COMPLETED" }, select: { id: true, invoiceNo: true, saleDate: true, totalAmount: true } }),
    prisma.payment.findMany({
      where: { branchId, customerId, purchaseId: null, OR: [{ saleId: null }, { sale: { status: "COMPLETED" } }] },
      select: { createdAt: true, amount: true, method: true, refundId: true, notes: true, sale: { select: { invoiceNo: true } } },
    }),
    prisma.refund.findMany({ where: { branchId, customerId, status: "COMPLETED", sale: { status: "COMPLETED" } }, select: { refundNo: true, refundDate: true, refundAmount: true } }),
    prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: StatementRow[] = [
    ...sales.map((sale) => ({ date: sale.saleDate, description: "Sale", reference: sale.invoiceNo, charge: toNumber(sale.totalAmount), payment: 0 })),
    ...payments.map((payment) =>
      payment.refundId
        ? { date: payment.createdAt, description: "Refund paid back to customer", reference: humanize(payment.method), charge: toNumber(payment.amount), payment: 0 }
        : {
            date: payment.createdAt,
            description: payment.sale ? "Payment received" : "Due payment received",
            reference: [payment.sale?.invoiceNo, humanize(payment.method)].filter(Boolean).join(" · "),
            charge: 0,
            payment: toNumber(payment.amount),
          },
    ),
    ...refunds.map((refund) => ({ date: refund.refundDate, description: "Items returned", reference: refund.refundNo, charge: 0, payment: toNumber(refund.refundAmount) })),
  ];

  const due = toNumber(customer.outstanding);
  const businessName = setting?.businessName ?? DEFAULT_BUSINESS_NAME;
  const reminder = whatsappLink(
    customer.phone,
    `Dear ${customer.name}, this is a reminder from ${businessName}. Your outstanding balance is ${formatMoney(due)}. Please arrange payment at your convenience. Thank you.`,
  );
  const canCollect = user ? can(user.role, "sales:create") : false;

  return (
    <Statement
      businessName={businessName}
      businessLine={[setting?.address, setting?.phone].filter(Boolean).join(" · ")}
      title="Customer statement"
      party={customer.name}
      partyLines={[customer.company ?? "", customer.phone ?? "", customer.address ?? "", `Customer code ${customer.customerCode}`]}
      rows={rows}
      balanceLabel="Balance due"
      actions={
        <>
          <Link href="/customers" className={buttonClass("ghost", "md", "mr-auto")}>
            <ArrowLeft className="h-4 w-4" />
            Customers
          </Link>
          {due > 0 && reminder ? (
            <a href={reminder} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp reminder
            </a>
          ) : null}
          {due > 0 && canCollect ? <ReceivePayment customerId={customer.id} name={customer.name} outstanding={due} accounts={accounts} size="md" /> : null}
          <PrintButton label="Print statement" />
        </>
      }
    />
  );
}
