"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#154c79", "#efb11d", "#2f855a", "#2b6cb0", "#c05621", "#805ad5", "#319795"];

type DashboardPayload = {
  sales: { _sum: { totalAmount: number | string | null; grossProfit: number | string | null }; _count: { id: number } };
  refunds: { _sum: { refundAmount: number | string | null } };
  expenses: { _sum: { amount: number | string | null } };
  inventory: { totalProducts: number; lowStock: number; outOfStock: number };
  paymentBreakdown: Array<{ method: string; _sum: { amount: number | string | null } }>;
  topProducts: Array<{ product?: { name: string } | null; _sum: { qty: number | string | null } }>;
};

type DashboardResponse = { data?: DashboardPayload };

export default function DashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res: DashboardResponse) => setPayload(res.data ?? null));
  }, []);

  const paymentChart = (payload?.paymentBreakdown ?? []).map((p) => ({
    name: p.method,
    value: Number(p._sum.amount ?? 0),
  }));
  const topProductChart = (payload?.topProducts ?? []).map((t) => ({
    name: t.product?.name ?? "Unknown",
    qty: Number(t._sum.qty ?? 0),
  }));

  if (!payload) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">Loading dashboard...</div>;
  }

  const { sales: resolvedSales, refunds: resolvedRefunds, expenses: resolvedExpenses } = payload;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardTitle>Today&apos;s Sales</CardTitle>
          <CardValue>৳{Number(resolvedSales._sum.totalAmount ?? 0).toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardTitle>Transactions</CardTitle>
          <CardValue>{resolvedSales._count.id}</CardValue>
        </Card>
        <Card>
          <CardTitle>Total Refunds</CardTitle>
          <CardValue>৳{Number(resolvedRefunds._sum.refundAmount ?? 0).toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardTitle>Expenses</CardTitle>
          <CardValue>৳{Number(resolvedExpenses._sum.amount ?? 0).toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardTitle>Estimated Gross Profit</CardTitle>
          <CardValue>৳{Number(resolvedSales._sum.grossProfit ?? 0).toLocaleString()}</CardValue>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Total Products</CardTitle>
          <CardValue>{payload.inventory.totalProducts}</CardValue>
        </Card>
        <Card>
          <CardTitle>Low Stock Products</CardTitle>
          <CardValue>{payload.inventory.lowStock}</CardValue>
        </Card>
        <Card>
          <CardTitle>Out of Stock</CardTitle>
          <CardValue>{payload.inventory.outOfStock}</CardValue>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="h-[360px]">
          <CardTitle>Top Selling Products</CardTitle>
          <div className="mt-4 h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#154c79" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-[360px]">
          <CardTitle>Sales by Payment Method</CardTitle>
          <div className="mt-4 h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentChart} dataKey="value" nameKey="name" outerRadius={110}>
                  {paymentChart.map((entry, i) => (
                    <Cell key={`${entry.name}-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}
