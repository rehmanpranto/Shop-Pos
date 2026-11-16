import Link from "next/link";
import { format, startOfDay, startOfMonth, subDays } from "date-fns";
import { AlertTriangle, ArrowRight, Banknote, Check, HandCoins, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatMoney, formatQty, humanize, toNumber } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PaymentDonut, PaymentLegend, SalesTrendChart, TopProductsChart } from "./charts";

const TREND_DAYS = 14;

export default async function DashboardPage() {
  const { user, branchId } = await getSessionContext();
  if (!branchId) {
    return <Card>No branch is set up yet. Run the setup step from the README first.</Card>;
  }

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const trendStart = subDays(today, TREND_DAYS - 1);
  const completed = { branchId, status: "COMPLETED" as const };

  const [todaySales, yesterdaySales, monthSales, trendSales, todayExpenses, todayRefunds, products, receivables, recentSales, payments, topItems, customerCount] =
    await Promise.all([
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: today } }, _sum: { totalAmount: true, grossProfit: true }, _count: { id: true } }),
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: yesterday, lt: today } }, _sum: { totalAmount: true } }),
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: startOfMonth(now) } }, _sum: { totalAmount: true, grossProfit: true }, _count: { id: true } }),
      prisma.sale.findMany({ where: { ...completed, saleDate: { gte: trendStart } }, select: { saleDate: true, totalAmount: true, grossProfit: true } }),
      prisma.expense.aggregate({ where: { branchId, date: { gte: today } }, _sum: { amount: true } }),
      prisma.refund.aggregate({ where: { branchId, refundDate: { gte: today }, status: "COMPLETED" }, _sum: { refundAmount: true } }),
      prisma.product.findMany({
        where: { branchId, isActive: true },
        select: { id: true, name: true, sku: true, stockQty: true, minStock: true, weightedAverageCost: true, baseUnit: { select: { code: true } } },
      }),
      prisma.customer.aggregate({ where: { branchId, outstanding: { gt: 0 } }, _sum: { outstanding: true }, _count: { id: true } }),
      prisma.sale.findMany({ where: { branchId }, include: { customer: { select: { name: true } } }, orderBy: { saleDate: "desc" }, take: 6 }),
      prisma.payment.groupBy({ by: ["method"], where: { branchId, refundId: null, sale: { status: "COMPLETED" }, createdAt: { gte: today } }, _sum: { amount: true } }),
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { ...completed, saleDate: { gte: trendStart } } },
        _sum: { qty: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 6,
      }),
      prisma.customer.count({ where: { branchId } }),
    ]);

  const buckets = new Map<string, { label: string; sales: number; profit: number }>();
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const day = subDays(today, TREND_DAYS - 1 - i);
    buckets.set(format(day, "yyyy-MM-dd"), { label: format(day, "d MMM"), sales: 0, profit: 0 });
  }
  for (const sale of trendSales) {
    const bucket = buckets.get(format(sale.saleDate, "yyyy-MM-dd"));
    if (bucket) {
      bucket.sales += toNumber(sale.totalAmount);
      bucket.profit += toNumber(sale.grossProfit);
    }
  }
  const trend = [...buckets.values()];

  const todayTotal = toNumber(todaySales._sum.totalAmount);
  const yesterdayTotal = toNumber(yesterdaySales._sum.totalAmount);
  const change = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : null;
  const todayProfit = toNumber(todaySales._sum.grossProfit);

  const outOfStock = products.filter((p) => toNumber(p.stockQty) <= 0);
  const lowStock = products.filter((p) => toNumber(p.stockQty) > 0 && toNumber(p.stockQty) <= toNumber(p.minStock));
  const attention = [...outOfStock, ...lowStock].slice(0, 6);
  const stockValue = products.reduce((sum, p) => sum + toNumber(p.stockQty) * toNumber(p.weightedAverageCost), 0);

  const productNames = new Map(products.map((p) => [p.id, p.name]));
  const topProducts = topItems.map((item) => ({
    name: (productNames.get(item.productId) ?? "Unknown").slice(0, 18),
    qty: toNumber(item._sum.qty),
  }));
  const paymentData = payments.map((p) => ({ name: humanize(p.method), value: toNumber(p._sum.amount) })).filter((p) => p.value > 0);

  const steps = [
    { done: products.length > 0, title: "Add your products", text: "Names, prices and opening stock.", href: "/products" },
    { done: customerCount > 0, title: "Add a customer", text: "Needed for credit sales and dues.", href: "/customers" },
    { done: recentSales.length > 0, title: "Make your first sale", text: "Open the POS and ring it up.", href: "/pos" },
  ];
  const showSetup = steps.some((step) => !step.done);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {greeting}, {user?.name?.split(" ")[0] ?? "there"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">{format(now, "EEEE, d MMMM yyyy")}</p>
        </div>
        <Link href="/reports" className={buttonClass("secondary")}>
          Full reports
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {showSetup ? (
        <Card className="border-brand/20 bg-brand-soft/60">
          <p className="text-base font-bold text-zinc-900">Get your shop ready</p>
          <p className="mt-0.5 text-sm text-zinc-600">Three steps and you can start selling.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map((step, i) => (
              <Link key={step.title} href={step.href} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-brand">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step.done ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {step.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold", step.done ? "text-zinc-400 line-through" : "text-zinc-900")}>{step.title}</span>
                  <span className="block text-xs text-zinc-500">{step.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value={formatMoney(todayTotal)}
          hint={change === null ? `${todaySales._count.id} sales` : `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs yesterday · ${todaySales._count.id} sales`}
          icon={Banknote}
        />
        <StatCard
          label="Gross profit today"
          value={formatMoney(todayProfit)}
          hint={todayTotal > 0 ? `${((todayProfit / todayTotal) * 100).toFixed(0)}% margin` : "No sales yet"}
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="This month"
          value={formatMoney(monthSales._sum.totalAmount)}
          hint={`${monthSales._count.id} sales · ${formatMoney(monthSales._sum.grossProfit)} profit`}
          icon={Receipt}
        />
        <StatCard
          label="Customers owe you"
          value={formatMoney(receivables._sum.outstanding)}
          hint={`${receivables._count.id} customer${receivables._count.id === 1 ? "" : "s"} with dues`}
          icon={HandCoins}
          tone="amber"
        />
        <StatCard label="Expenses today" value={formatMoney(todayExpenses._sum.amount)} icon={Wallet} tone="neutral" />
        <StatCard label="Refunds today" value={formatMoney(todayRefunds._sum.refundAmount)} icon={Receipt} tone="neutral" />
        <StatCard label="Stock value" value={formatMoney(stockValue)} hint={`${products.length} products at cost`} icon={Package} tone="neutral" />
        <StatCard
          label="Needs restocking"
          value={`${outOfStock.length + lowStock.length}`}
          hint={`${outOfStock.length} out of stock · ${lowStock.length} low`}
          icon={AlertTriangle}
          tone={outOfStock.length + lowStock.length > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Sales, last {TREND_DAYS} days</CardTitle>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-accent" />
                Gross profit
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <SalesTrendChart data={trend} />
          </div>
        </Card>

        <Card>
          <CardTitle>Payments received today</CardTitle>
          {paymentData.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">No payments yet today.</p>
          ) : (
            <>
              <div className="mt-2 h-40">
                <PaymentDonut data={paymentData} />
              </div>
              <div className="mt-3">
                <PaymentLegend data={paymentData} />
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="flex items-center justify-between">
            <CardTitle>Recent sales</CardTitle>
            <Link href="/sales" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">No sales yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {sale.invoiceNo} <span className="font-normal text-zinc-500">· {sale.customer?.name ?? "Walk-in"}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{formatDateTime(sale.saleDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-bold text-zinc-900">{formatMoney(sale.totalAmount)}</p>
                    {sale.status !== "COMPLETED" ? <StatusBadge status={sale.status} /> : toNumber(sale.dueAmount) > 0 ? <Badge tone="amber">Due {formatMoney(sale.dueAmount)}</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Restock soon</CardTitle>
            <Link href="/products" className="text-xs font-semibold text-brand hover:underline">
              Products
            </Link>
          </div>
          {attention.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">{products.length === 0 ? "No products yet." : "All products are above their minimum stock."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {attention.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {p.sku} · minimum {formatQty(p.minStock)} {p.baseUnit.code}
                    </p>
                  </div>
                  {toNumber(p.stockQty) <= 0 ? <Badge tone="red">Out of stock</Badge> : <Badge tone="amber">{formatQty(p.stockQty)} left</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Best sellers, last {TREND_DAYS} days</CardTitle>
          {topProducts.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">Nothing sold yet.</p>
          ) : (
            <div className="mt-3 h-56">
              <TopProductsChart data={topProducts} />
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
