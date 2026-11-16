import { format } from "date-fns";

type Numeric = number | string | { toString(): string } | null | undefined;

export function toNumber(value: Numeric): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: Numeric): string {
  const n = toNumber(value);
  const text = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}৳${text}`;
}

export function formatCompactMoney(value: Numeric): string {
  const n = toNumber(value);
  if (Math.abs(n) < 100000) return `৳${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `৳${n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`;
}

export function formatQty(value: Numeric): string {
  return toNumber(value).toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function formatDate(value: Date | string): string {
  return format(new Date(value), "d MMM yyyy");
}

export function formatDateTime(value: Date | string): string {
  return format(new Date(value), "d MMM yyyy, h:mm a");
}

const LABELS: Record<string, string> = {
  MOBILE_FINANCIAL_SERVICE: "Mobile banking",
  BANK_TRANSFER: "Bank transfer",
  CREDIT_DUE: "On credit",
  PARTIALLY_RECEIVED: "Partly received",
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
  STOCK_RETURN: "Returned",
  REFUND_RETURN: "Refund return",
  INTERNAL_USAGE: "Internal use",
  MANUAL_ADD: "Manual add",
  OUT_FOR_DELIVERY: "Out for delivery",
  SENT: "Open",
  CUSTOMER_PAYMENT: "Customer payment",
  SUPPLIER_PAYMENT: "Supplier payment",
};

/** Turns an enum value like "BANK_TRANSFER" into "Bank transfer". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "-";
  if (LABELS[value]) return LABELS[value];
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
