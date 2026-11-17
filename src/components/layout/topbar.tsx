"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, GitBranch, KeyRound, Languages, Loader2, LogOut, Menu, ScanLine, Search } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { humanize } from "@/lib/format";
import { canOpen } from "@/lib/page-access";
import { buttonClass } from "@/components/ui/button";
import { useApp } from "./app-context";
import { findNavItem } from "./nav";
import { LanguageSwitch, useTr } from "@/components/layout/language";

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
  const tr = useTr();
  const pathname = usePathname();
  const router = useRouter();
  const { user, language, setLanguage, t } = useApp();
  const current = findNavItem(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSwitchingBranch, startBranchTransition] = useTransition();
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
    startBranchTransition(async () => {
      const result = await sendJson("/api/branches/switch", { branchId });
      if (result.ok) router.refresh();
    });
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const itemClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100";

  return (
    <header className="sticky top-0 z-20 border-b border-white/80 bg-white/78 px-3 py-2.5 shadow-[0_6px_20px_rgba(39,70,100,0.04)] backdrop-blur-md print:hidden md:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button type="button" onClick={onOpenMenu} aria-label={tr("Open menu")} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-zinc-900">{current ? t(current.key) : "Rahman Hardware"}</h1>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">{current ? tr(current.description) : ""}</p>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/85 text-sm text-zinc-500 shadow-sm hover:bg-white lg:w-auto lg:px-3"
          aria-label={tr("Search pages and actions")}
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">{t("top.goTo")}</span>
          <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[11px] font-semibold text-zinc-500 lg:inline">⌘K</kbd>
        </button>

        <div className="hidden sm:block">
          <LanguageSwitch />
        </div>

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
            aria-label={tr("Account menu")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-brand text-sm font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark"
          >
            {initials || "U"}
          </button>
          {menuOpen ? (
            <div role="menu" className="pop-in absolute right-0 mt-2 w-64 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl">
              <div className="border-b border-zinc-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
                <p className="mt-1 text-xs font-semibold text-brand">{tr(humanize(user.role))}</p>
              </div>

              {branches.length > 1 ? (
                <div className="border-b border-zinc-100 py-1">
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <GitBranch className="h-3 w-3" />{tr("Working in")}</p>
                  {branches.map((branch) => (
                    <button key={branch.id} type="button" role="menuitem" disabled={isSwitchingBranch} onClick={() => switchBranch(branch.id)} className={itemClass}>
                      <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                      {isSwitchingBranch && branch.id !== activeBranchId ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : branch.id === activeBranchId ? <Check className="h-4 w-4 text-brand" /> : null}
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
              <button type="button" role="menuitem" onClick={async () => {
                  // Clear the session without following the server's redirect, which is built from
                  // NEXTAUTH_URL and lands on a 404 when that points at a different domain.
                  await signOut({ redirect: false }).catch(() => undefined);
                  window.location.assign("/login");
                }} className={`${itemClass} text-red-700 hover:bg-red-50`}>
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
