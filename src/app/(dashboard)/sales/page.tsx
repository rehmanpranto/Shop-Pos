import Link from "next/link";
import { format, startOfDay } from "date-fns";
import { Banknote, HandCoins, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSearch } from "@/components/ui/table-search";
import { SaleActions } from "./sale-actions";

const LIMIT = 300;

export default async function SalesPage() {
  const { user, branchId } = await getSessionContext();
  const today = startOfDay(new Date());
  const [sales, accounts, todayTotals, dueTotals] = branchId
    ? await Promise.all([
        prisma.sale.findMany({
          where: { branchId },
          include: {
            customer: { select: { name: true, address: true, phone: true } },
            createdBy: { select: { name: true } },
            deliveries: { where: { status: { not: "CANCELLED" } }, select: { id: true, status: true } },
            items: { include: { product: { select: { name: true } }, unit: { select: { code: true } } } },
            refunds: { where: { status: { not: "CANCELLED" } }, include: { items: true } },
          },
          orderBy: { saleDate: "desc" },
          take: LIMIT,
        }),
        prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, method: true } }),
        prisma.sale.aggregate({ where: { branchId, status: "COMPLETED", saleDate: { gte: today } }, _sum: { totalAmount: true }, _count: { id: true } }),
        prisma.sale.aggregate({ where: { branchId, status: "COMPLETED", dueAmount: { gt: 0 } }, _sum: { dueAmount: true }, _count: { id: true } }),
      ])
    : [[], [], null, null];

  const canRefund = user ? can(user.role, "refunds:create") : false;
  const canCancel = user ? can(user.role, "sales:delete") : false;
  const canSell = user ? can(user.role, "sales:create") : false;
  const canDeliver = user ? can(user.role, "deliveries:create") : false;
  const todayText = format(today, "yyyy-MM-dd");
  const newSale = canSell ? (
    <Link href="/pos" className={buttonClass()}>
      New sale
    </Link>
  ) : null;

  return (
    <div>
      <PageHeader title="Sales" description="Every invoice, with refunds and cancellations." actions={newSale} />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Sold today" value={formatMoney(todayTotals?._sum.totalAmount)} hint={`${todayTotals?._count.id ?? 0} sales`} icon={Banknote} />
        <StatCard label="Unpaid invoices" value={formatMoney(dueTotals?._sum.dueAmount)} hint={`${dueTotals?._count.id ?? 0} invoice${dueTotals?._count.id === 1 ? "" : "s"}`} icon={HandCoins} tone="amber" />
      </div>

      {sales.length === 0 ? (
        <TableCard>
          <EmptyState icon={Receipt} title="No sales yet" description="Sales you ring up in the POS appear here with their invoices." action={newSale} />
        </TableCard>
      ) : (
        <TableSearch
          placeholder="Search invoice, customer or cashier"
          filters={[
            { label: "Unpaid", value: "due" },
            { label: "Refunded", value: "refunded" },
            { label: "Cancelled", value: "cancelled" },
          ]}
        >
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th className="num">Total</th>
                  <th className="num">Paid</th>
                  <th className="num">Due</th>
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const refunded = new Map<string, number>();
                  for (const refund of s.refunds) {
                    for (const item of refund.items) {
                      if (item.saleItemId) refunded.set(item.saleItemId, (refunded.get(item.saleItemId) ?? 0) + toNumber(item.qty));
                    }
                  }
                  const refundable =
                    s.status === "COMPLETED"
                      ? s.items
                          .map((item) => ({
                            saleItemId: item.id,
                            name: item.product.name,
                            unit: item.unit.code,
                            remaining: toNumber(item.qty) - (refunded.get(item.id) ?? 0),
                            unitPrice: toNumber(item.unitPrice),
                          }))
                          .filter((item) => item.remaining > 0)
                      : [];
                  const due = toNumber(s.dueAmount);
                  const cancelled = s.status === "CANCELLED" || s.status === "VOIDED";
                  const tags = [due > 0 && !cancelled ? "due" : "", s.refunds.length > 0 ? "refunded" : "", cancelled ? "cancelled" : ""].join(" ");

                  return (
                    <tr key={s.id} data-tags={tags} className={cancelled ? "text-zinc-400" : undefined}>
                      <td className="whitespace-nowrap">
                        <p className="font-semibold text-zinc-900">{s.invoiceNo}</p>
                        <p className="text-xs text-zinc-500">{formatDateTime(s.saleDate)}</p>
                      </td>
                      <td>
                        {s.customerId ? (
                          <Link href={`/customers/${s.customerId}`} className="hover:text-brand hover:underline">
                            {s.customer?.name}
                          </Link>
                        ) : (
                          "Walk-in"
                        )}
                      </td>
                      <td className="text-zinc-600">{s.createdBy.name}</td>
                      <td className="num font-semibold">{formatMoney(s.totalAmount)}</td>
                      <td className="num">{formatMoney(s.paidAmount)}</td>
                      <td className="num">{due > 0 && !cancelled ? <span className="font-bold text-amber-700">{formatMoney(due)}</span> : "-"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={s.status} />
                          {s.refunds.length > 0 ? <Badge tone="blue">Refunded</Badge> : null}
                          {s.deliveries[0] ? (
                            <Link href={`/deliveries/${s.deliveries[0].id}`} title="Open the delivery challan">
                              <Badge tone={s.deliveries[0].status === "DELIVERED" ? "green" : "amber"}>{s.deliveries[0].status === "DELIVERED" ? "Delivered" : "Delivery"}</Badge>
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <SaleActions
                          saleId={s.id}
                          invoiceNo={s.invoiceNo}
                          items={refundable}
                          accounts={accounts}
                          hasCustomer={Boolean(s.customerId)}
                          canRefund={canRefund}
                          canCancel={canCancel && s.status === "COMPLETED" && s.refunds.length === 0}
                          delivery={
                            canDeliver && s.status === "COMPLETED" && s.deliveries.length === 0
                              ? { address: s.customer?.address ?? "", phone: s.customer?.phone ?? "", today: todayText }
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
          {sales.length === LIMIT ? <p className="mt-3 text-center text-xs text-zinc-500">Showing the latest {LIMIT} sales.</p> : null}
        </TableSearch>
      )}
    </div>
  );
}
