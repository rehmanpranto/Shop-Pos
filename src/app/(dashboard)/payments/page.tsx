import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function PaymentsPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const [accounts, ledger] = branch
    ? await Promise.all([
        prisma.paymentAccount.findMany({ where: { branchId: branch.id }, orderBy: { name: "asc" } }),
        prisma.paymentLedger.findMany({ where: { branchId: branch.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      ])
    : [[], []];

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">Payment Accounts</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-lg border border-zinc-200 p-3">
              <p className="font-semibold">{a.name}</p>
              <p className="text-sm text-zinc-500">{a.method}</p>
              <p className="mt-1 text-lg font-bold">৳{Number(a.currentBalance).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold">Payment Ledger</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="px-3 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{l.transactionType}</td>
                  <td className="px-3 py-2">{l.direction}</td>
                  <td className="px-3 py-2">{l.method}</td>
                  <td className="px-3 py-2">৳{Number(l.amount).toFixed(2)}</td>
                  <td className="px-3 py-2">{l.referenceNo ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
