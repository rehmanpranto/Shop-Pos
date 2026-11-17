import Link from "next/link";
import { subDays } from "date-fns";
import { AlertTriangle, ArrowRight, Banknote, Check, HandCoins, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatMoney, formatQty, humanize, toNumber } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PaymentDonut, PaymentLegend, SalesTrendChart, TopProductsChart } from "./charts";
import { LocalClock } from "./local-clock";
import { getTr } from "@/lib/i18n-server";

const TREND_DAYS = 14;
const DHAKA_OFFSET = "+06:00";

function dhakaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(date);
}

function dhakaStartOfDay(date: Date) {
  return new Date(`${dhakaDateKey(date)}T00:00:00${DHAKA_OFFSET}`);
}

export default async function DashboardPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  if (!branchId) {
    return <Card>{tr("No branch is set up yet. Run the setup step from the README first.")}</Card>;
  }

  const now = new Date();
  const dhakaDate = new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  const dhakaHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }).format(now));
  const today = dhakaStartOfDay(now);
  const yesterday = subDays(today, 1);
  const trendStart = subDays(today, TREND_DAYS - 1);
  const monthStart = new Date(`${dhakaDateKey(now).slice(0, 7)}-01T00:00:00${DHAKA_OFFSET}`);
  const completed = { branchId, status: "COMPLETED" as const };

  const [todaySales, yesterdaySales, monthSales, trendSales, todayExpenses, todayRefunds, products, receivables, recentSales, payments, topItems, totalOrders, deliveryCounts, newCustomers] =
    await Promise.all([
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: today } }, _sum: { totalAmount: true, grossProfit: true }, _count: { id: true } }),
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: yesterday, lt: today } }, _sum: { totalAmount: true } }),
      prisma.sale.aggregate({ where: { ...completed, saleDate: { gte: monthStart } }, _sum: { totalAmount: true, grossProfit: true }, _count: { id: true } }),
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
      prisma.sale.count({ where: { branchId, status: { not: "VOIDED" } } }),
      prisma.delivery.groupBy({ by: ["status"], where: { branchId }, _count: { id: true } }),
      prisma.customer.count({ where: { branchId, createdAt: { gte: subDays(today, 30) } } }),
    ]);

  const buckets = new Map<string, { label: string; sales: number; profit: number }>();
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const day = subDays(today, TREND_DAYS - 1 - i);
    buckets.set(dhakaDateKey(day), { label: new Intl.DateTimeFormat("en-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }).format(day), sales: 0, profit: 0 });
  }
  for (const sale of trendSales) {
    const bucket = buckets.get(dhakaDateKey(sale.saleDate));
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
    name: (productNames.get(item.productId) ?? tr("Unknown")).slice(0, 18),
    qty: toNumber(item._sum.qty),
  }));
  const paymentData = payments.map((p) => ({ name: tr(humanize(p.method)), value: toNumber(p._sum.amount) })).filter((p) => p.value > 0);
  const deliveryTotals = new Map(deliveryCounts.map((item) => [item.status, item._count.id]));

  const hour = dhakaHour;
  const greeting = hour < 12 ? tr("Good morning") : hour < 17 ? tr("Good afternoon") : tr("Good evening");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {greeting}, {user?.name?.split(" ")[0] ?? "there"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {dhakaDate} · <LocalClock initialTime={now.getTime()} />
          </p>
        </div>
        <Link href="/reports" className={buttonClass("secondary")}>{tr("Full reports")}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label={tr("Sales today")}
          value={formatMoney(todayTotal)}
          hint={change === null ? tr("{0} sales", todaySales._count.id) : tr("{0}{1}% vs yesterday · {2} sales", change >= 0 ? "+" : "", change.toFixed(0), todaySales._count.id)}
          icon={Banknote}
        />
        <StatCard label={tr("Total orders")} value={`${totalOrders}`} hint={tr("All non-voided orders")} icon={Receipt} tone="neutral" />
        <StatCard label={tr("Pending orders")} value={`${deliveryTotals.get("PENDING") ?? 0}`} hint={tr("Awaiting fulfilment")} icon={Package} tone="amber" />
        <StatCard label={tr("Processing orders")} value={`${(deliveryTotals.get("PREPARING") ?? 0)}`} hint={tr("Being prepared")} icon={Package} tone="neutral" />
        <StatCard label={tr("Shipped orders")} value={`${deliveryTotals.get("OUT_FOR_DELIVERY") ?? 0}`} hint={tr("Out for delivery")} icon={TrendingUp} tone="green" />
        <StatCard label={tr("Delivered orders")} value={`${deliveryTotals.get("DELIVERED") ?? 0}`} hint={tr("Successfully delivered")} icon={Check} tone="green" />
        <StatCard label={tr("Cancelled orders")} value={`${deliveryTotals.get("CANCELLED") ?? 0}`} hint={tr("Cancelled shipments")} icon={Receipt} tone="red" />
        <StatCard label={tr("New customers")} value={`${newCustomers}`} hint={tr("Joined in the last 30 days")} icon={HandCoins} tone="neutral" />
        <StatCard
          label={tr("Gross profit today")}
          value={formatMoney(todayProfit)}
          hint={todayTotal > 0 ? tr("{0}% margin", ((todayProfit / todayTotal) * 100).toFixed(0)) : tr("No sales yet")}
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label={tr("This month")}
          value={formatMoney(monthSales._sum.totalAmount)}
          hint={tr("{0} sales · {1} profit", monthSales._count.id, formatMoney(monthSales._sum.grossProfit))}
          icon={Receipt}
        />
        <StatCard
          label={tr("Customers owe you")}
          value={formatMoney(receivables._sum.outstanding)}
          hint={tr("{0} customer{1} with dues", receivables._count.id, receivables._count.id === 1 ? "" : "s")}
          icon={HandCoins}
          tone="amber"
        />
        <StatCard label={tr("Expenses today")} value={formatMoney(todayExpenses._sum.amount)} icon={Wallet} tone="neutral" />
        <StatCard label={tr("Refunds today")} value={formatMoney(todayRefunds._sum.refundAmount)} icon={Receipt} tone="neutral" />
        <StatCard label={tr("Stock value")} value={formatMoney(stockValue)} hint={tr("{0} products at cost", products.length)} icon={Package} tone="neutral" />
        <StatCard
          label={tr("Needs restocking")}
          value={`${outOfStock.length + lowStock.length}`}
          hint={tr("{0} out of stock · {1} low", outOfStock.length, lowStock.length)}
          icon={AlertTriangle}
          tone={outOfStock.length + lowStock.length > 0 ? "red" : "green"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{tr("Sales, last")}{" "}{TREND_DAYS}{" "}{tr("days")}</CardTitle>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />{tr("Sales")}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-accent" />{tr("Gross profit")}</span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <SalesTrendChart data={trend} />
          </div>
        </Card>

        <Card>
          <CardTitle>{tr("Payments received today")}</CardTitle>
          {paymentData.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">{tr("No payments yet today.")}</p>
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
            <CardTitle>{tr("Recent sales")}</CardTitle>
            <Link href="/sales" className="text-xs font-semibold text-brand hover:underline">{tr("View all")}</Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">{tr("No sales yet.")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {sale.invoiceNo} <span className="font-normal text-zinc-500">· {sale.customer?.name ?? tr("Walk-in")}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{formatDateTime(sale.saleDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-bold text-zinc-900">{formatMoney(sale.totalAmount)}</p>
                    {sale.status !== "COMPLETED" ? <StatusBadge status={sale.status} /> : toNumber(sale.dueAmount) > 0 ? <Badge tone="amber">{tr("Due")}{" "}{formatMoney(sale.dueAmount)}</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>{tr("Restock soon")}</CardTitle>
            <Link href="/products" className="text-xs font-semibold text-brand hover:underline">{tr("Products")}</Link>
          </div>
          {attention.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">{products.length === 0 ? tr("No products yet.") : tr("All products are above their minimum stock.")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {attention.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">
                      {p.sku}{" "}{tr("· minimum")}{" "}{formatQty(p.minStock)} {p.baseUnit.code}
                    </p>
                  </div>
                  {toNumber(p.stockQty) <= 0 ? <Badge tone="red">{tr("Out of stock")}</Badge> : <Badge tone="amber">{formatQty(p.stockQty)}{" "}{tr("left")}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>{tr("Best sellers, last")}{" "}{TREND_DAYS}{" "}{tr("days")}</CardTitle>
          {topProducts.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">{tr("Nothing sold yet.")}</p>
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
