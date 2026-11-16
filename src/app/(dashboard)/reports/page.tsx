import Link from "next/link";
import { addDays, differenceInCalendarDays, endOfDay, format, isValid, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import { Banknote, Receipt, RotateCcw, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatMoney, formatQty, humanize, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, TableCard } from "@/components/ui/card";
import { inputClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SalesTrendChart } from "../dashboard/charts";
import { ExportButton } from "./export-button";
import { getTr } from "@/lib/i18n-server";

const DAY = "yyyy-MM-dd";
const MAX_DAYS = 366;

function parseDay(value: string | string[] | undefined): Date | null {
  if (typeof value !== "string") return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const tr = await getTr();
  const params = await searchParams;
  const { branchId } = await getSessionContext();
  const today = startOfDay(new Date());

  let to = parseDay(params.to) ?? today;
  let from = parseDay(params.from) ?? subDays(to, 29);
  if (from > to) [from, to] = [to, from];
  if (differenceInCalendarDays(to, from) >= MAX_DAYS) from = subDays(to, MAX_DAYS - 1);
  const range = { gte: startOfDay(from), lte: endOfDay(to) };
  const fromText = format(from, DAY);
  const toText = format(to, DAY);

  const presets = [
    { label: tr("Today"), from: today, to: today },
    { label: tr("Last 7 days"), from: subDays(today, 6), to: today },
    { label: tr("Last 30 days"), from: subDays(today, 29), to: today },
    { label: tr("This month"), from: startOfMonth(today), to: today },
  ].map((preset) => ({ label: preset.label, from: format(preset.from, DAY), to: format(preset.to, DAY) }));

  const completed = { branchId: branchId ?? "", status: "COMPLETED" as const, saleDate: range };
  const [sales, refunds, expenses, items, payments, categories] = await Promise.all([
    prisma.sale.findMany({
      where: completed,
      select: { saleDate: true, totalAmount: true, grossProfit: true, dueAmount: true, createdBy: { select: { name: true } } },
    }),
    prisma.refund.aggregate({ where: { branchId: branchId ?? "", status: "COMPLETED", refundDate: range }, _sum: { refundAmount: true }, _count: { id: true } }),
    prisma.expense.groupBy({ by: ["categoryId"], where: { branchId: branchId ?? "", date: range }, _sum: { amount: true } }),
    prisma.saleItem.groupBy({ by: ["productId"], where: { sale: completed }, _sum: { qty: true, lineTotal: true }, orderBy: { _sum: { lineTotal: "desc" } }, take: 10 }),
    prisma.payment.groupBy({ by: ["method"], where: { branchId: branchId ?? "", refundId: null, sale: { status: "COMPLETED" }, createdAt: range }, _sum: { amount: true } }),
    prisma.expenseCategory.findMany({ where: { branchId: branchId ?? "" }, select: { id: true, name: true } }),
  ]);
  const productNames = new Map(
    (await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]),
  );

  const revenue = sales.reduce((sum, s) => sum + toNumber(s.totalAmount), 0);
  const grossProfit = sales.reduce((sum, s) => sum + toNumber(s.grossProfit), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + toNumber(e._sum.amount), 0);
  const refundTotal = toNumber(refunds._sum.refundAmount);
  const unpaid = sales.reduce((sum, s) => sum + toNumber(s.dueAmount), 0);
  const net = grossProfit - expenseTotal;

  const days = differenceInCalendarDays(to, from) + 1;
  const daily = new Map<string, { date: string; label: string; sales: number; profit: number; count: number }>();
  for (let i = 0; i < days; i += 1) {
    const day = addDays(from, i);
    daily.set(format(day, DAY), { date: format(day, DAY), label: format(day, "d MMM"), sales: 0, profit: 0, count: 0 });
  }
  const cashiers = new Map<string, { sales: number; count: number }>();
  for (const sale of sales) {
    const bucket = daily.get(format(sale.saleDate, DAY));
    if (bucket) {
      bucket.sales += toNumber(sale.totalAmount);
      bucket.profit += toNumber(sale.grossProfit);
      bucket.count += 1;
    }
    const cashier = cashiers.get(sale.createdBy.name) ?? { sales: 0, count: 0 };
    cashier.sales += toNumber(sale.totalAmount);
    cashier.count += 1;
    cashiers.set(sale.createdBy.name, cashier);
  }
  const dailyRows = [...daily.values()];
  const exportRows = dailyRows.map((d) => ({ Date: d.date, Sales: d.count, Revenue: d.sales.toFixed(2), "Gross profit": d.profit.toFixed(2) }));

  const breakdown = (title: string, rows: Array<{ name: string; value: number; extra?: string }>, empty: string) => (
    <Card>
      <CardTitle>{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => {
            const max = Math.max(...rows.map((r) => r.value), 1);
            return (
              <li key={row.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-zinc-700">
                    {row.name}
                    {row.extra ? <span className="ml-1.5 text-xs text-zinc-500">{row.extra}</span> : null}
                  </span>
                  <span className="tabular font-semibold text-zinc-900">{formatMoney(row.value)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );

  return (
    <div>
      <PageHeader
        title={tr("Reports")}
        description={tr("{0} to {1}", format(from, "d MMM yyyy"), format(to, "d MMM yyyy"))}
        actions={<ExportButton rows={exportRows} fileName={`sales-${fromText}-to-${toText}.csv`} label={tr("Export daily sales (CSV)")} />}
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = preset.from === fromText && preset.to === toText;
            return (
              <Link
                key={preset.label}
                href={`/reports?from=${preset.from}&to=${preset.to}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-10 items-center rounded-lg border px-3 text-sm font-semibold transition",
                  active ? "border-brand bg-brand text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
        <form action="/reports" className="flex flex-wrap items-end gap-2 sm:ml-auto">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">{tr("From")}</span>
            <input type="date" name="from" defaultValue={fromText} max={format(today, DAY)} className={cn(inputClass, "w-40")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-600">{tr("To")}</span>
            <input type="date" name="to" defaultValue={toText} max={format(today, DAY)} className={cn(inputClass, "w-40")} />
          </label>
          <Button type="submit" variant="secondary">{tr("Apply")}</Button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label={tr("Revenue")} value={formatMoney(revenue)} hint={tr("{0} sales · avg {1}", sales.length, formatMoney(sales.length ? revenue / sales.length : 0))} icon={Banknote} />
        <StatCard label={tr("Gross profit")} value={formatMoney(grossProfit)} hint={revenue > 0 ? tr("{0}% margin", ((grossProfit / revenue) * 100).toFixed(0)) : undefined} icon={TrendingUp} tone="green" />
        <StatCard label={tr("Expenses")} value={formatMoney(expenseTotal)} icon={Wallet} tone="neutral" />
        <StatCard label={tr("Profit after expenses")} value={formatMoney(net)} hint={tr("Gross profit minus expenses")} icon={Receipt} tone={net < 0 ? "red" : "green"} />
        <StatCard label={tr("Refunds")} value={formatMoney(refundTotal)} hint={tr("{0} refund{1} · {2} still unpaid", refunds._count.id, refunds._count.id === 1 ? "" : "s", formatMoney(unpaid))} icon={RotateCcw} tone="amber" />
      </section>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{tr("Sales by day")}</CardTitle>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />{tr("Sales")}</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-accent" />{tr("Gross profit")}</span>
          </div>
        </div>
        {sales.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">{tr("No sales in this period.")}</p>
        ) : (
          <div className="mt-4 h-64">
            <SalesTrendChart data={dailyRows} />
          </div>
        )}
      </Card>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {breakdown(
          tr("Payments received by method"),
          payments.map((p) => ({ name: tr(humanize(p.method)), value: toNumber(p._sum.amount) })).sort((a, b) => b.value - a.value),
          tr("No payments in this period."),
        )}
        {breakdown(
          tr("Sales by cashier"),
          [...cashiers.entries()].map(([name, c]) => ({ name, value: c.sales, extra: tr("{0} sales", c.count) })).sort((a, b) => b.value - a.value),
          tr("No sales in this period."),
        )}
        {breakdown(
          tr("Expenses by category"),
          expenses
            .map((e) => ({ name: categories.find((c) => c.id === e.categoryId)?.name ?? tr("Other"), value: toNumber(e._sum.amount) }))
            .sort((a, b) => b.value - a.value),
          tr("No expenses in this period."),
        )}
      </section>

      <h3 className="mb-3 mt-6 text-base font-bold text-zinc-900">{tr("Top products by revenue")}</h3>
      <TableCard>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">{tr("Nothing sold in this period.")}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("Product")}</th>
                <th className="num">{tr("Quantity sold")}</th>
                <th className="num">{tr("Revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.productId}>
                  <td className="text-zinc-500">{i + 1}</td>
                  <td className="font-semibold text-zinc-900">{productNames.get(item.productId) ?? tr("Unknown")}</td>
                  <td className="num">{formatQty(item._sum.qty)}</td>
                  <td className="num font-semibold">{formatMoney(item._sum.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}
