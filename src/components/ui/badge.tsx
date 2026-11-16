import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/format";

const tones = {
  neutral: "bg-zinc-100 text-zinc-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  COMPLETED: "green",
  RECEIVED: "green",
  APPROVED: "green",
  DELIVERED: "green",
  ACCEPTED: "green",
  CONVERTED: "green",
  STOCK_IN: "green",
  DEBIT: "green",
  PARTIALLY_RECEIVED: "amber",
  PENDING: "amber",
  PREPARING: "amber",
  OUT_FOR_DELIVERY: "blue",
  IN_TRANSIT: "amber",
  STOCK_OUT: "amber",
  CREDIT: "amber",
  ORDERED: "blue",
  SENT: "blue",
  CREATED: "blue",
  STOCK_RETURN: "blue",
  CANCELLED: "red",
  VOIDED: "red",
  FAILED: "red",
  REJECTED: "red",
  EXPIRED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{humanize(status)}</Badge>;
}
