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

  await Promise.all(
    DEFAULT_ACCOUNTS.map(([name, method]) =>
      prisma.paymentAccount.upsert({
        where: { branchId_name: { branchId: auth.user.branchId!, name } },
        create: { branchId: auth.user.branchId!, name, method },
        update: {},
      }),
    ),
  );

  const items = await prisma.paymentAccount.findMany({
    where: { branchId: auth.user.branchId!, isActive: true },
    orderBy: { name: "asc" },
  });

  return ok(items);
}
