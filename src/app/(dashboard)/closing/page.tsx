import { format, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatDate, formatMoney, humanize, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, TableCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCashPosition } from "@/server/services/closing";
import { ClosingForm } from "./closing-form";

export default async function ClosingPage() {
  const { user, branchId } = await getSessionContext();
  if (!branchId) return <Card>No branch is set up yet.</Card>;

  const today = startOfDay(new Date());
  const [position, history] = await Promise.all([
    getCashPosition(branchId, today),
    prisma.dailyClosing.findMany({ where: { branchId }, include: { preparedBy: { select: { name: true } } }, orderBy: { closeDate: "desc" }, take: 60 }),
  ]);
  const todayClosing = history.find((closing) => closing.closeDate.getTime() === today.getTime());
  const canClose = user ? can(user.role, "closing:create") : false;
  const expected = position.expected.toNumber();

  return (
    <div>
      <PageHeader title="Day closing" description={`Count the cash drawer and compare it with what the system expects. ${format(today, "EEEE, d MMMM yyyy")}.`} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-bold text-zinc-900">Cash today</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">In the drawer at the start of the day</dt>
              <dd className="tabular font-semibold">{formatMoney(position.opening.toNumber())}</dd>
            </div>
            {position.lines.map((line) => (
              <div key={`${line.type}-${line.direction}`} className="flex justify-between">
                <dt className="text-zinc-600">
                  {line.direction === "DEBIT" ? "Cash in" : "Cash out"}: {humanize(line.type).toLowerCase()}
                </dt>
                <dd className={`tabular font-semibold ${line.direction === "DEBIT" ? "text-emerald-700" : "text-red-700"}`}>
                  {line.direction === "DEBIT" ? "+" : "-"}
                  {formatMoney(line.amount)}
                </dd>
              </div>
            ))}
            {position.lines.length === 0 ? <p className="text-zinc-500">No cash has moved today.</p> : null}
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-3">
              <dt className="text-base font-bold text-zinc-900">Should be in the drawer</dt>
              <dd className="tabular text-2xl font-black text-zinc-900">{formatMoney(expected)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-500">Only cash accounts are counted. bKash, Nagad, card and bank payments are not part of the drawer.</p>
        </Card>

        <Card>
          <h3 className="text-base font-bold text-zinc-900">{todayClosing ? "Today is closed" : "Close the day"}</h3>
          {todayClosing ? (
            <p className="mb-4 mt-1 text-sm text-zinc-600">
              {todayClosing.preparedBy.name} counted {formatMoney(todayClosing.actualCash)} against {formatMoney(todayClosing.expectedCash)} expected. Sales made after that are not
              included; count again to update it.
            </p>
          ) : (
            <p className="mb-4 mt-1 text-sm text-zinc-600">Count the notes and coins, then enter the total.</p>
          )}
          {canClose ? <ClosingForm expected={expected} alreadyClosed={Boolean(todayClosing)} /> : <p className="text-sm text-zinc-500">Your role can view closings but not record them.</p>}
        </Card>
      </div>

      <h3 className="mb-3 mt-6 text-base font-bold text-zinc-900">Past closings</h3>
      <TableCard>
        {history.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">No day has been closed yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Closed by</th>
                <th className="num">Expected</th>
                <th className="num">Counted</th>
                <th className="num">Difference</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {history.map((closing) => {
                const difference = toNumber(closing.differenceCash);
                return (
                  <tr key={closing.id}>
                    <td className="whitespace-nowrap font-semibold text-zinc-900">{formatDate(closing.closeDate)}</td>
                    <td className="text-zinc-600">{closing.preparedBy.name}</td>
                    <td className="num">{formatMoney(closing.expectedCash)}</td>
                    <td className="num">{formatMoney(closing.actualCash)}</td>
                    <td className="num">
                      {difference === 0 ? <Badge tone="green">Matched</Badge> : <Badge tone={difference > 0 ? "blue" : "red"}>{`${difference > 0 ? "Over" : "Short"} ${formatMoney(Math.abs(difference))}`}</Badge>}
                    </td>
                    <td className="text-zinc-600">{closing.differenceReason ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}
