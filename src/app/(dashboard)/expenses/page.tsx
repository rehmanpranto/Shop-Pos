import { format, startOfMonth } from "date-fns";
import { CalendarDays, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSearch } from "@/components/ui/table-search";
import { ExpenseForm } from "./expense-form";

export default async function ExpensesPage() {
  const { branchId } = await getSessionContext();
  const now = new Date();
  const [items, categories, accounts, month] = branchId
    ? await Promise.all([
        prisma.expense.findMany({ where: { branchId }, include: { category: true, account: true }, orderBy: { date: "desc" }, take: 300 }),
        prisma.expenseCategory.findMany({ where: { branchId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.expense.groupBy({ by: ["categoryId"], where: { branchId, date: { gte: startOfMonth(now) } }, _sum: { amount: true } }),
      ])
    : [[], [], [], []];

  const monthTotal = month.reduce((sum, row) => sum + toNumber(row._sum.amount), 0);
  const biggest = [...month].sort((a, b) => toNumber(b._sum.amount) - toNumber(a._sum.amount))[0];
  const biggestName = categories.find((c) => c.id === biggest?.categoryId)?.name;
  const form = <ExpenseForm categories={categories} accounts={accounts} today={format(now, "yyyy-MM-dd")} />;

  return (
    <div>
      <PageHeader title="Expenses" description="Rent, salaries, bills and other running costs." actions={form} />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={`Spent in ${format(now, "MMMM")}`} value={formatMoney(monthTotal)} icon={Wallet} />
        <StatCard label="Biggest cost this month" value={biggestName ?? "-"} hint={biggest ? formatMoney(biggest._sum.amount) : undefined} icon={CalendarDays} tone="neutral" />
      </div>

      {items.length === 0 ? (
        <TableCard>
          <EmptyState icon={Wallet} title="No expenses recorded" description="Record costs here so your reports show real profit, not just sales." action={form} />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search category, payee or note">
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Paid to</th>
                  <th>Note</th>
                  <th>Paid from</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">
                      <p className="text-zinc-900">{formatDate(e.date)}</p>
                      <p className="text-xs text-zinc-500">{e.expenseNo}</p>
                    </td>
                    <td>
                      <Badge>{e.category.name}</Badge>
                    </td>
                    <td className="text-zinc-600">{e.vendor ?? "-"}</td>
                    <td className="text-zinc-600">{e.description ?? "-"}</td>
                    <td className="text-zinc-600">{e.account.name}</td>
                    <td className="num font-semibold">{formatMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
