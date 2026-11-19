import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  brand: "bg-brand-soft text-brand",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  neutral: "bg-zinc-100 text-zinc-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div
      className={cn("glass-tile min-w-0 rounded-3xl p-3.5 sm:p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        {Icon ? (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tones[tone], "glass-chip")}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="tabular mt-1 break-words text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
