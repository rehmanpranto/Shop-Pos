"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  FileText,
  Activity,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Sales", "/sales", Receipt],
  ["POS", "/pos", ScanLine],
  ["Invoices", "/sales", FileText],
  ["Customers", "/customers", Users],
  ["Purchases", "/purchases", ShoppingCart],
  ["Suppliers", "/suppliers", Building2],
  ["Inventory", "/inventory", Warehouse],
  ["Products", "/products", Package],
  ["Quotations", "/quotations", ClipboardList],
  ["Deliveries", "/deliveries", Truck],
  ["Expenses", "/expenses", Boxes],
  ["Payments", "/payments", HandCoins],
  ["Reports", "/reports", Activity],
  ["Users", "/users", Users],
  ["Settings", "/settings", Settings],
  ["Audit Logs", "/audit-logs", FileText],
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 w-full shrink-0 border-b border-zinc-200 bg-gradient-to-b from-[#f8f7f2] via-[#faf9f7] to-white md:relative md:h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="p-2 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:p-4">
        <div className="mb-2 rounded-xl bg-zinc-900 p-3 text-zinc-100 md:mb-5 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Hardware ERP + POS</p>
          <p className="mt-1 text-lg font-bold">Operations Console</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible">
          {menu.map(([title, href, Icon]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={`${href}-${title}`}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition md:gap-3",
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {title}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
