import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ResponsiveTable } from "./responsive-table";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-3xl border border-white/90 bg-white/88 p-5 shadow-[0_8px_24px_rgba(39,70,100,0.05)] backdrop-blur-md", className)}>
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
    <section className={cn("overflow-hidden rounded-3xl border border-white/90 bg-white/88 shadow-[0_8px_24px_rgba(39,70,100,0.05)] backdrop-blur-md", className)}>
      <ResponsiveTable>{children}</ResponsiveTable>
    </section>
  );
}
