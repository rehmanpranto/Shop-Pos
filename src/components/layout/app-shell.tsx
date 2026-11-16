"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AppProvider, type CurrentUser } from "./app-context";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar, type BranchOption } from "./topbar";

export function AppShell({
  user,
  businessName,
  branches,
  activeBranchId,
  children,
}: {
  user: CurrentUser;
  businessName: string;
  branches: BranchOption[];
  activeBranchId: string | null;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);

  const resetSidebarTimer = useCallback(() => {
    setSidebarHidden(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (window.matchMedia("(min-width: 768px)").matches) {
      hideTimer.current = setTimeout(() => setSidebarHidden(true), 5000);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      hideTimer.current = setTimeout(() => setSidebarHidden(true), 5000);
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetSidebarTimer]);

  return (
    <AppProvider user={user}>
      <ToastProvider>
        <div className="flex min-h-screen bg-background print:block print:bg-white">
          <div className="print:hidden">
            <Sidebar
              businessName={businessName}
              branchName={branches.length > 1 ? (activeBranch?.name ?? null) : null}
              open={menuOpen}
              hidden={sidebarHidden}
              collapsed={sidebarCollapsed}
              onActivity={resetSidebarTimer}
              onToggleCollapsed={() => {
                setSidebarCollapsed((value) => !value);
                resetSidebarTimer();
              }}
              onClose={closeMenu}
            />
          </div>
          {sidebarHidden ? <div aria-label="Reveal sidebar" onMouseEnter={resetSidebarTimer} className="fixed inset-y-0 left-0 z-30 hidden w-3 md:block" /> : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar branches={user.role === "ADMIN" ? branches : []} activeBranchId={activeBranchId} onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
            <main className="mx-auto w-full max-w-[1500px] min-w-0 flex-1 p-3 print:max-w-none print:p-0 sm:p-4 md:p-6">{children}</main>
          </div>
        </div>
        <CommandPalette key={searchOpen ? "open" : "closed"} open={searchOpen} onClose={closeSearch} />
      </ToastProvider>
    </AppProvider>
  );
}
