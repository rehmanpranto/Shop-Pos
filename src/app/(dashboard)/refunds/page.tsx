import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function RefundsPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch
    ? await prisma.refund.findMany({
        where: { branchId: branch.id },
        include: { sale: true, customer: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Refunds & Returns</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Refund ID</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-3 py-2 font-semibold">{r.refundNo}</td>
                <td className="px-3 py-2">{r.sale.invoiceNo}</td>
                <td className="px-3 py-2">{r.customer?.name ?? "Walk-in"}</td>
                <td className="px-3 py-2">৳{Number(r.refundAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{r.paymentMethod}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
