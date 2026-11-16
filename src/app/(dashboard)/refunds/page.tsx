import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";

export default async function RefundsPage() {
  const { branchId } = await getSessionContext();
  const items = branchId
    ? await prisma.refund.findMany({
        where: { branchId },
        include: { sale: { select: { invoiceNo: true } }, customer: { select: { name: true } }, createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      })
    : [];
  const goToSales = (
    <Link href="/sales" className={buttonClass("secondary")}>
      Refund a sale
    </Link>
  );

  return (
    <div>
      <PageHeader title="Refunds" description="Returned items. To make a refund, open Sales and choose Refund on the invoice." actions={goToSales} />

      {items.length === 0 ? (
        <TableCard>
          <EmptyState icon={RotateCcw} title="No refunds yet" description="When a customer returns something, refund it from the invoice on the Sales page." action={goToSales} />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search refund, invoice or customer">
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Refund</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Paid back by</th>
                  <th>By</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <p className="font-semibold text-zinc-900">{r.refundNo}</p>
                      <p className="text-xs text-zinc-500">{formatDateTime(r.refundDate)}</p>
                    </td>
                    <td>{r.sale.invoiceNo}</td>
                    <td>{r.customer?.name ?? "Walk-in"}</td>
                    <td className="text-zinc-600">{r.reason ?? "-"}</td>
                    <td className="text-zinc-600">{humanize(r.paymentMethod)}</td>
                    <td className="text-zinc-600">{r.createdBy.name}</td>
                    <td className="num font-semibold">{formatMoney(r.refundAmount)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
