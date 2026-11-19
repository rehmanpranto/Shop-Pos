import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { fail, ok } from "@/lib/response";

const DEFAULT_ACCOUNTS = [
  ["Cash", "CASH"],
  ["Bank - Account 1", "BANK_TRANSFER"],
  ["Card", "CARD"],
  ["bKash", "MOBILE_FINANCIAL_SERVICE"],
  ["Nagad", "MOBILE_FINANCIAL_SERVICE"],
  ["Check", "CHECK"],
] as const;

export async function GET() {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const branchId = auth.user.branchId!;
  const all = await prisma.paymentAccount.findMany({ where: { branchId }, orderBy: { name: "asc" } });

  // Create the default accounts only when some are missing (normally just once per branch),
  // instead of six upserts on every POS load.
  const existing = new Set(all.map((a) => a.name));
  const missing = DEFAULT_ACCOUNTS.filter(([name]) => !existing.has(name));
  if (missing.length > 0) {
    await prisma.paymentAccount.createMany({
      data: missing.map(([name, method]) => ({ branchId, name, method })),
      skipDuplicates: true,
    });
    const items = await prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" } });
    return ok(items);
  }

  const items = all.filter((a) => a.isActive);
  return ok(items);
}
