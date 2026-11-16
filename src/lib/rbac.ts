import { UserRole } from "@prisma/client";

export const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  MANAGER: [
    "dashboard:read",
    "sales:*",
    "purchases:*",
    "inventory:*",
    "customers:*",
    "suppliers:*",
    "reports:*",
    "refunds:*",
    "expenses:*",
    "quotations:*",
    "deliveries:*",
    "products:*",
    "payments:*",
    "closing:*",
  ],
  CASHIER: [
    "dashboard:read",
    "sales:create",
    "sales:read",
    "invoices:read",
    "refunds:create",
    "customers:read",
    "customers:create",
    "quotations:read",
    "quotations:create",
    "deliveries:read",
    "deliveries:create",
    "deliveries:update",
    "closing:read",
    "closing:create",
    "pos:use",
  ],
  INVENTORY: [
    "inventory:read",
    "inventory:update",
    "purchases:read",
    "purchases:update",
    "products:read",
  ],
  ACCOUNTANT: [
    "dashboard:read",
    "sales:read",
    "purchases:read",
    "payments:read",
    "expenses:read",
    "reports:read",
    "customers:read",
    "suppliers:read",
    "closing:read",
  ],
};

export function can(role: UserRole, action: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  if (permissions.includes("*")) return true;
  if (permissions.includes(action)) return true;

  const [resource] = action.split(":");
  return permissions.includes(`${resource}:*`);
}
