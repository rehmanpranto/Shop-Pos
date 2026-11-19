"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

  // When collapsed, hovering the bar opens it straight away over the page; leaving folds it back to glass.
  const [peek, setPeek] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const onEnter = () => {
    cancelClose();
    if (collapsed) setPeek(true);
  };
  const onLeave = () => {
    cancelClose();
    // A short grace period so brushing past the edge doesn't make it flicker shut.
    closeTimer.current = window.setTimeout(() => setPeek(false), 120);
  };
  const toggle = () => {
    cancelClose();
    setPeek(false);
    onToggleCollapsed();
  };

  // "mini" is the slim glass rail; anything else shows the full, original sidebar.
  const mini = collapsed && !peek;

  return (
    <>
      {open ? <button type="button" aria-label={tr("Close menu")} onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden" /> : null}

      {/* Holds the sidebar's space in the layout. It only follows the pinned state, so peeking never shifts the page. */}
      <div aria-hidden className={cn("hidden shrink-0 transition-[width] duration-200 ease-out md:block", collapsed ? "w-16" : "w-64")} />

      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onLeave();
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden border-r text-slate-300 backdrop-blur-xl transition-[width,transform,background-color,border-color,box-shadow] duration-200 ease-out md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          mini
            ? "border-white/10 bg-sidebar md:w-16 md:border-white/50 md:bg-white/20 md:text-slate-600 md:shadow-[inset_-1px_0_0_rgba(255,255,255,0.6),8px_0_30px_rgba(30,60,100,0.10)] md:backdrop-blur-2xl md:backdrop-saturate-150"
            : "border-white/10 bg-sidebar shadow-[12px_0_40px_rgba(15,34,54,0.12)]",
          peek && "md:shadow-[18px_0_50px_rgba(15,34,54,0.28)]",
        )}
      >
        <div className={cn("flex items-start gap-3 border-b px-4 py-4", mini ? "border-white/10 md:flex-col md:items-center md:border-white/40 md:px-2" : "border-white/10")}>
          <LogoMark className="h-9 w-9 shrink-0" />
          <div className={cn("min-w-0 flex-1", mini && "md:hidden")}>
            <p className="line-clamp-2 text-sm font-bold leading-tight text-white">{businessName}</p>
            {branchName ? <p className="truncate text-xs text-slate-400">{branchName}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Close menu")} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}
            className={cn(
              "hidden rounded-lg p-1.5 md:block",
              mini ? "text-slate-500 hover:bg-white/50 hover:text-slate-900" : "text-slate-400 hover:bg-white/10 hover:text-white",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-2" aria-label={tr("Main")}>
          {groups.map((group) => (
            <div key={group.label}>
              <p className={cn("whitespace-nowrap px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500", mini && "md:hidden")}>{t(group.key)}</p>
              <div className="space-y-0.5">
                {group.items.map(({ key, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => {
                        onClose();
                        setPeek(false);
                      }}
                      title={mini ? t(key) : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                        mini && "md:justify-center md:px-2",
                        mini
                          ? active
                            ? "bg-white/12 text-white md:bg-white/60 md:text-brand md:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_rgba(30,60,100,0.12)]"
                            : "hover:bg-white/7 hover:text-white md:hover:bg-white/40 md:hover:text-slate-900"
                          : active
                            ? "bg-white/12 text-white shadow-inner shadow-white/5"
                            : "hover:bg-white/7 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? (mini ? "text-brand-accent md:text-brand" : "text-brand-accent") : mini ? "text-slate-400 md:text-slate-600" : "text-slate-400",
                        )}
                      />
                      <span className={cn(mini && "md:hidden")}>{t(key)}</span>
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
