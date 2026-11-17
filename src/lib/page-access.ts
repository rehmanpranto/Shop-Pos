export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "INVENTORY" | "ACCOUNTANT";

const ALL: Role[] = ["ADMIN", "MANAGER", "CASHIER", "INVENTORY", "ACCOUNTANT"];

/** Which roles may open each section. Sub-pages (e.g. /customers/abc) follow their section. */
export const PAGE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
  "/pos": ["ADMIN", "MANAGER", "CASHIER"],
  "/sales": ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
  "/refunds": ["ADMIN", "MANAGER", "CASHIER"],
  "/customers": ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
  "/quotations": ["ADMIN", "MANAGER", "CASHIER"],
  "/deliveries": ["ADMIN", "MANAGER", "CASHIER"],
  "/products": ["ADMIN", "MANAGER", "INVENTORY"],
  "/inventory": ["ADMIN", "MANAGER", "INVENTORY"],
  "/purchases": ["ADMIN", "MANAGER", "INVENTORY", "ACCOUNTANT"],
  "/suppliers": ["ADMIN", "MANAGER", "INVENTORY", "ACCOUNTANT"],
  "/manufacturers": ["ADMIN", "MANAGER", "INVENTORY", "ACCOUNTANT"],
  "/payments": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "/expenses": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "/closing": ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
  "/reports": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "/users": ["ADMIN"],
  "/branches": ["ADMIN"],
  "/audit-logs": ["ADMIN"],
  "/settings": ALL,
  "/receipt": ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"],
  "/print": ALL,
};

export function rolesForPath(pathname: string): Role[] | undefined {
  const section = Object.keys(PAGE_ROLES).find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return section ? PAGE_ROLES[section] : undefined;
}

export function canOpen(role: Role, path: string): boolean {
  return rolesForPath(path)?.includes(role) ?? true;
}

/** First page a role lands on after signing in. */
export function homeFor(role: Role): string {
  if (PAGE_ROLES["/dashboard"].includes(role)) return "/dashboard";
  return role === "INVENTORY" ? "/products" : "/settings";
}
