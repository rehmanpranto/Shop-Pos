import { ReactNode } from "react";
import { LogoWordmark } from "@/components/brand/logo-mark";

/** A printable A4-style business document: letterhead, title block, body, footer. */
export function PrintDocument({
  businessName,
  businessLines,
  title,
  number,
  meta,
  actions,
  children,
  footer,
}: {
  businessName: string;
  businessLines: string[];
  title: string;
  number: string;
  meta: Array<[string, string]>;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      {actions ? <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">{actions}</div> : null}
      <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#e31b23] pb-5">
          <div>
            <LogoWordmark className="mb-2 w-48 sm:w-56" alt={businessName} />
            {businessLines.filter(Boolean).map((line) => (
              <p key={line} className="text-sm text-zinc-600">
                {line}
              </p>
            ))}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
            <p className="text-xl font-black text-zinc-900">{number}</p>
            {meta.map(([label, value]) => (
              <p key={label} className="text-sm text-zinc-600">
                {label}: <span className="font-semibold text-zinc-900">{value}</span>
              </p>
            ))}
          </div>
        </header>
        {children}
        {footer ? <footer className="mt-8 border-t border-zinc-200 pt-4 text-sm text-zinc-600">{footer}</footer> : null}
      </article>
    </div>
  );
}
