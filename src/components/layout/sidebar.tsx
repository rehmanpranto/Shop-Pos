"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { navForRole } from "./nav";

export function Sidebar({ businessName, branchName, open, onClose }: { businessName: string; branchName: string | null; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, t } = useApp();
  const groups = navForRole(user.role);

  return (
    <>
      {open ? <button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-30 bg-zinc-900/50 md:hidden" /> : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-sidebar text-slate-300 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start gap-3 px-4 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-zinc-900">
            <Store className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{businessName}</p>
            {branchName ? <p className="truncate text-xs text-slate-400">{branchName}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Main">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t(group.key)}</p>
              <div className="space-y-0.5">
                {group.items.map(({ key, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-accent" : "text-slate-400")} />
                      {t(key)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
