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
  ],
  CASHIER: [
    "dashboard:read",
    "sales:create",
    "sales:read",
    "invoices:read",
    "refunds:create",
    "customers:read",
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
  ],
};

export function can(role: UserRole, action: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  if (permissions.includes("*")) return true;
  if (permissions.includes(action)) return true;

  const [resource] = action.split(":");
  return permissions.includes(`${resource}:*`);
}
