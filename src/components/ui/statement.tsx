import { ReactNode } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { ResponsiveTable } from "./responsive-table";

export type StatementRow = { date: Date; description: string; reference?: string; charge: number; payment: number };

/** A printable account statement with a running balance. */
export function Statement({
  businessName,
  businessLine,
  title,
  party,
  partyLines,
  rows,
  balanceLabel,
  actions,
}: {
  businessName: string;
  businessLine?: string;
  title: string;
  party: string;
  partyLines: string[];
  rows: StatementRow[];
  balanceLabel: string;
  actions?: ReactNode;
}) {
  const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const withBalance = sorted.reduce<Array<StatementRow & { balance: number }>>((list, row) => {
    const previous = list.length ? list[list.length - 1].balance : 0;
    return [...list, { ...row, balance: previous + row.charge - row.payment }];
  }, []);
  const balance = withBalance.length ? withBalance[withBalance.length - 1].balance : 0;
  const charges = sorted.reduce((sum, row) => sum + row.charge, 0);
  const paid = sorted.reduce((sum, row) => sum + row.payment, 0);

  return (
    <div className="mx-auto max-w-4xl">
      {actions ? <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">{actions}</div> : null}

      <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-lg font-black text-zinc-900">{businessName}</p>
            {businessLine ? <p className="text-sm text-zinc-600">{businessLine}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
            <p className="text-sm text-zinc-600">As of {formatDate(new Date())}</p>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4 py-5">
          <div>
            <p className="text-base font-bold text-zinc-900">{party}</p>
            {partyLines.filter(Boolean).map((line) => (
              <p key={line} className="text-sm text-zinc-600">
                {line}
              </p>
            ))}
          </div>
          <div className="w-full rounded-xl bg-zinc-50 px-4 py-3 print:bg-transparent print:p-0 sm:w-auto sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{balanceLabel}</p>
            <p className="tabular text-2xl font-black text-zinc-900">{formatMoney(balance)}</p>
          </div>
        </div>

        {withBalance.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">No transactions yet.</p>
        ) : (
          <ResponsiveTable>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Details</th>
                  <th className="num">Charge</th>
                  <th className="num">Payment</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((row, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap text-zinc-600">{formatDate(row.date)}</td>
                    <td>
                      {row.description}
                      {row.reference ? <span className="ml-2 text-xs text-zinc-500">{row.reference}</span> : null}
                    </td>
                    <td className="num">{row.charge ? formatMoney(row.charge) : ""}</td>
                    <td className="num text-emerald-700">{row.payment ? formatMoney(row.payment) : ""}</td>
                    <td className="num font-semibold">{formatMoney(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300 font-bold">
                  <td colSpan={2} className="px-3.5 py-3">
                    Total
                  </td>
                  <td className="num px-3.5 py-3">{formatMoney(charges)}</td>
                  <td className="num px-3.5 py-3">{formatMoney(paid)}</td>
                  <td className="num px-3.5 py-3">{formatMoney(balance)}</td>
                </tr>
              </tfoot>
            </table>
          </ResponsiveTable>
        )}
      </article>
    </div>
  );
}
