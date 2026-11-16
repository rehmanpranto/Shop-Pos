import { HandCoins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatMoney, humanize, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";

export default async function PaymentsPage() {
  const { branchId } = await getSessionContext();
  const [accounts, ledger] = branchId
    ? await Promise.all([
        prisma.paymentAccount.findMany({ where: { branchId }, orderBy: { name: "asc" } }),
        prisma.paymentLedger.findMany({
          where: { branchId },
          include: { account: { select: { name: true } }, createdBy: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
      ])
    : [[], []];
  const totalBalance = accounts.reduce((sum, a) => sum + toNumber(a.currentBalance), 0);

  return (
    <div>
      <PageHeader title="Payments" description={`Money in each account. Combined balance: ${formatMoney(totalBalance)}.`} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="truncate text-sm font-semibold text-zinc-900">{a.name}</p>
            <p className="text-xs text-zinc-500">{humanize(a.method)}</p>
            <p className={`tabular mt-2 text-lg font-bold ${toNumber(a.currentBalance) < 0 ? "text-red-700" : "text-zinc-900"}`}>{formatMoney(a.currentBalance)}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-base font-bold text-zinc-900">Money in and out</h3>
      {ledger.length === 0 ? (
        <TableCard>
          <EmptyState icon={HandCoins} title="No money movements yet" description="Sales, refunds, purchases and expenses are recorded here automatically." />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search account, type or reference" filters={[{ label: "Money in", value: "DEBIT" }, { label: "Money out", value: "CREDIT" }]}>
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>For</th>
                  <th>Account</th>
                  <th>Reference</th>
                  <th>By</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => {
                  const moneyIn = l.direction === "DEBIT";
                  return (
                    <tr key={l.id} data-tags={l.direction}>
                      <td className="whitespace-nowrap text-zinc-600">{formatDateTime(l.createdAt)}</td>
                      <td>
                        <Badge tone={moneyIn ? "green" : "amber"}>{humanize(l.transactionType)}</Badge>
                        {l.notes ? <span className="ml-2 text-xs text-zinc-500">{l.notes}</span> : null}
                      </td>
                      <td>{l.account.name}</td>
                      <td className="text-zinc-600">{l.referenceNo ?? "-"}</td>
                      <td className="text-zinc-600">{l.createdBy.name}</td>
                      <td className={`num font-semibold ${moneyIn ? "text-emerald-700" : "text-red-700"}`}>
                        {moneyIn ? "+" : "-"}
                        {formatMoney(l.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
