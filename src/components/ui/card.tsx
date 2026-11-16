import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ResponsiveTable } from "./responsive-table";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-700">{children}</h3>;
}

export function CardValue({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-2xl font-bold text-zinc-900">{children}</p>;
}

/** Card that holds a full-width table: no padding, scrolls sideways on small screens. */
export function TableCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm", className)}>
      <ResponsiveTable>{children}</ResponsiveTable>
    </section>
  );
}
