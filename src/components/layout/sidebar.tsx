"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo-mark";
import { useApp } from "./app-context";
import { navForRole } from "./nav";
import { useTr } from "@/components/layout/language";

export function Sidebar({
  businessName,
  branchName,
  open,
  collapsed,
  onToggleCollapsed,
  onClose,
}: {
  businessName: string;
  branchName: string | null;
  open: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const pathname = usePathname();
  const { user, t } = useApp();
  const groups = navForRole(user.role);

  return (
    <>
      {open ? <button type="button" aria-label={tr("Close menu")} onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" /> : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-white/10 bg-sidebar text-slate-300 shadow-[12px_0_40px_rgba(15,34,54,0.12)] backdrop-blur-xl transition-[width,transform] duration-300 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:w-16",
        )}
      >
        <div className="flex items-start gap-3 border-b border-white/10 px-4 py-4">
          <LogoMark className="h-9 w-9" />
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{businessName}</p>
            {branchName ? <p className="truncate text-xs text-slate-400">{branchName}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close menu")} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
          <button type="button" onClick={onToggleCollapsed} aria-label={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")} className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:block">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label={tr("Main")}>
          {groups.map((group) => (
            <div key={group.label}>
              <p className={cn("px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500", collapsed && "md:hidden")}>{t(group.key)}</p>
              <div className="space-y-0.5">
                {group.items.map(({ key, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={collapsed ? t(key) : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        collapsed && "md:justify-center md:px-2",
                        active ? "bg-white/12 text-white shadow-inner shadow-white/5" : "hover:bg-white/7 hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-accent" : "text-slate-400")} />
                      <span className={cn(collapsed && "md:hidden")}>{t(key)}</span>
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
