import { addDays } from "date-fns";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";

/**
 * Cash that should be in the drawer for a day: what the cash accounts held when the day
 * started, plus cash received, minus cash paid out.
 */
export async function getCashPosition(branchId: string, dayStart: Date) {
  const dayEnd = addDays(dayStart, 1);
  const cashAccounts = await prisma.paymentAccount.findMany({ where: { branchId, method: "CASH" }, select: { id: true, currentBalance: true } });
  const accountIds = cashAccounts.map((account) => account.id);

  const [duringDay, afterDay] = await Promise.all([
    prisma.paymentLedger.groupBy({
      by: ["direction", "transactionType"],
      where: { branchId, accountId: { in: accountIds }, createdAt: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
    }),
    prisma.paymentLedger.groupBy({
      by: ["direction"],
      where: { branchId, accountId: { in: accountIds }, createdAt: { gte: dayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const net = (rows: Array<{ direction: string; _sum: { amount: unknown } }>) =>
    rows.reduce((sum, row) => (row.direction === "DEBIT" ? sum.add(D(String(row._sum.amount ?? 0))) : sum.sub(D(String(row._sum.amount ?? 0)))), D(0));

  const balanceNow = cashAccounts.reduce((sum, account) => sum.add(account.currentBalance), D(0));
  const expected = balanceNow.sub(net(afterDay));
  const opening = expected.sub(net(duringDay));

  const cashIn = duringDay.filter((row) => row.direction === "DEBIT").reduce((sum, row) => sum.add(D(String(row._sum.amount ?? 0))), D(0));
  const cashOut = duringDay.filter((row) => row.direction === "CREDIT").reduce((sum, row) => sum.add(D(String(row._sum.amount ?? 0))), D(0));
  const lines = duringDay.map((row) => ({ type: row.transactionType, direction: row.direction, amount: D(String(row._sum.amount ?? 0)).toNumber() }));

  return { opening, expected, cashIn, cashOut, lines };
}
