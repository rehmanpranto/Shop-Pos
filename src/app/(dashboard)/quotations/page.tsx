import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function QuotationsPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch
    ? await prisma.quotation.findMany({
        where: { branchId: branch.id },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Quotations</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Quotation</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Valid Until</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id} className="border-b">
                <td className="px-3 py-2">{q.quotationNo}</td>
                <td className="px-3 py-2">{q.customer?.name ?? "-"}</td>
                <td className="px-3 py-2">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2">৳{Number(q.totalAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{q.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
