"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactMoney, formatMoney, formatQty } from "@/lib/format";

const COLORS = ["#154c79", "#efb11d", "#2f855a", "#c05621", "#805ad5", "#319795", "#64748b"];

const tooltipStyle = { borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)" };

export function SalesTrendChart({ data }: { data: Array<{ label: string; sales: number; profit: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eeeeec" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(v: number) => formatCompactMoney(v)} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f4f4f5" }} formatter={(value, name) => [formatMoney(Number(value)), name === "sales" ? "Sales" : "Gross profit"]} />
        <Bar dataKey="sales" fill="#154c79" radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        <Line type="monotone" dataKey="profit" stroke="#efb11d" strokeWidth={2.5} dot={{ r: 2.5, fill: "#efb11d" }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function PaymentDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={data.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatMoney(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PaymentLegend({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {data.map((entry, i) => (
        <li key={entry.name} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-zinc-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{entry.name}</span>
          </span>
          <span className="tabular font-semibold text-zinc-900">{formatMoney(entry.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function TopProductsChart({ data }: { data: Array<{ name: string; qty: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eeeeec" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
        <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#3f3f46" }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatQty(Number(value)), "Sold"]} cursor={{ fill: "#f4f4f5" }} />
        <Bar dataKey="qty" fill="#154c79" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
