import {
  Activity,
  Building2,
  ClipboardList,
  GitBranch,
  HandCoins,
  History,
  LayoutDashboard,
  LockKeyhole,
  Package,
  Receipt,
  RotateCcw,
  ScanLine,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { PAGE_ROLES, type Role } from "@/lib/page-access";
import type { TranslationKey } from "@/lib/i18n";

export type { Role };

export type NavItem = {
  title: string;
  /** Translation key for the title. */
  key: TranslationKey;
  href: string;
  icon: LucideIcon;
  description: string;
};

export type NavGroup = { label: string; key: TranslationKey; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    key: "group.overview",
    items: [{ title: "Dashboard", key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Today at a glance" }],
  },
  {
    label: "Sell",
    key: "group.sell",
    items: [
      { title: "POS", key: "nav.pos", href: "/pos", icon: ScanLine, description: "Ring up a sale" },
      { title: "Sales", key: "nav.sales", href: "/sales", icon: Receipt, description: "Invoices and history" },
      { title: "Refunds", key: "nav.refunds", href: "/refunds", icon: RotateCcw, description: "Returns and refunds" },
      { title: "Customers", key: "nav.customers", href: "/customers", icon: Users, description: "Customers and dues" },
      { title: "Quotations", key: "nav.quotations", href: "/quotations", icon: ClipboardList, description: "Price quotes" },
      { title: "Deliveries", key: "nav.deliveries", href: "/deliveries", icon: Truck, description: "Delivery tracking" },
    ],
  },
  {
    label: "Stock",
    key: "group.stock",
    items: [
      { title: "Products", key: "nav.products", href: "/products", icon: Package, description: "Catalogue and prices" },
      { title: "Inventory", key: "nav.inventory", href: "/inventory", icon: Warehouse, description: "Stock movements" },
      { title: "Purchases", key: "nav.purchases", href: "/purchases", icon: ShoppingCart, description: "Receive stock" },
      { title: "Suppliers", key: "nav.suppliers", href: "/suppliers", icon: Building2, description: "Supplier list" },
    ],
  },
  {
    label: "Money",
    key: "group.money",
    items: [
      { title: "Payments", key: "nav.payments", href: "/payments", icon: HandCoins, description: "Accounts and ledger" },
      { title: "Expenses", key: "nav.expenses", href: "/expenses", icon: Wallet, description: "Running costs" },
      { title: "Day closing", key: "nav.closing", href: "/closing", icon: LockKeyhole, description: "Count the cash drawer" },
      { title: "Reports", key: "nav.reports", href: "/reports", icon: Activity, description: "Sales and profit" },
    ],
  },
  {
    label: "Admin",
    key: "group.admin",
    items: [
      { title: "Users", key: "nav.users", href: "/users", icon: UserCog, description: "Staff and roles" },
      { title: "Branches", key: "nav.branches", href: "/branches", icon: GitBranch, description: "Shops and stock transfer" },
      { title: "Settings", key: "nav.settings", href: "/settings", icon: Settings, description: "Business details" },
      { title: "Audit log", key: "nav.audit", href: "/audit-logs", icon: History, description: "Who did what" },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => PAGE_ROLES[item.href]?.includes(role)) })).filter(
    (group) => group.items.length > 0,
  );
}

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((group) => group.items).find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
