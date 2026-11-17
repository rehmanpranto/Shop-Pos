"use client";

import { ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AppProvider, type CurrentUser } from "./app-context";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar, type BranchOption } from "./topbar";

const COLLAPSED_KEY = "sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener(COLLAPSED_KEY, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COLLAPSED_KEY, onChange);
    window.removeEventListener("storage", onChange);
  };
}

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
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const activeBranch = branches.find((branch) => branch.id === activeBranchId);

  // The sidebar stays put. Collapsing it to icons is the user's choice and is remembered on this device.
  const sidebarCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const toggleCollapsed = useCallback(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, readCollapsed() ? "0" : "1");
    } catch {
      // Storage blocked (private window): the toggle simply is not remembered.
    }
    window.dispatchEvent(new Event(COLLAPSED_KEY));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <AppProvider user={user}>
      <ToastProvider>
        <div className="flex min-h-screen bg-transparent print:block print:bg-white">
          <div className="print:hidden">
            <Sidebar
              businessName={businessName}
              branchName={branches.length > 1 ? (activeBranch?.name ?? null) : null}
              open={menuOpen}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={toggleCollapsed}
              onClose={closeMenu}
            />
          </div>
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
