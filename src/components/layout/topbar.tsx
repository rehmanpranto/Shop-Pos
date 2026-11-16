"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, GitBranch, KeyRound, Languages, LogOut, Menu, ScanLine, Search } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { humanize } from "@/lib/format";
import { canOpen } from "@/lib/page-access";
import { buttonClass } from "@/components/ui/button";
import { useApp } from "./app-context";
import { findNavItem } from "./nav";

export type BranchOption = { id: string; name: string };

export function Topbar({
  branches,
  activeBranchId,
  onOpenMenu,
  onOpenSearch,
}: {
  branches: BranchOption[];
  activeBranchId: string | null;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, language, setLanguage, t } = useApp();
  const current = findNavItem(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canSell = canOpen(user.role, "/pos");

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function switchBranch(branchId: string) {
    setMenuOpen(false);
    const result = await sendJson("/api/branches/switch", { branchId });
    if (result.ok) router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const itemClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-3 py-2.5 backdrop-blur print:hidden md:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-zinc-900">{current ? t(current.key) : "Rahman Hardware"}</h1>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">{current?.description ?? ""}</p>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-500 hover:bg-zinc-50 lg:w-auto lg:px-3"
          aria-label="Search pages and actions"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">{t("top.goTo")}</span>
          <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[11px] font-semibold text-zinc-500 lg:inline">⌘K</kbd>
        </button>

        {canSell && pathname !== "/pos" ? (
          <Link href="/pos" aria-label={t("top.newSale")} className={buttonClass("accent", "md", "w-10 px-0 sm:w-auto sm:px-4")}>
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">{t("top.newSale")}</span>
          </Link>
        ) : null}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white hover:bg-brand-dark"
          >
            {initials || "U"}
          </button>
          {menuOpen ? (
            <div role="menu" className="pop-in absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
              <div className="border-b border-zinc-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
                <p className="mt-1 text-xs font-semibold text-brand">{humanize(user.role)}</p>
              </div>

              {branches.length > 1 ? (
                <div className="border-b border-zinc-100 py-1">
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <GitBranch className="h-3 w-3" />
                    Working in
                  </p>
                  {branches.map((branch) => (
                    <button key={branch.id} type="button" role="menuitem" onClick={() => switchBranch(branch.id)} className={itemClass}>
                      <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                      {branch.id === activeBranchId ? <Check className="h-4 w-4 text-brand" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              <button type="button" role="menuitem" onClick={() => setLanguage(language === "bn" ? "en" : "bn")} className={`${itemClass} mt-1`}>
                <Languages className="h-4 w-4" />
                {t("top.language")}
              </button>
              <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className={itemClass}>
                <KeyRound className="h-4 w-4" />
                {t("top.changePassword")}
              </Link>
              <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })} className={`${itemClass} text-red-700 hover:bg-red-50`}>
                <LogOut className="h-4 w-4" />
                {t("top.signOut")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
