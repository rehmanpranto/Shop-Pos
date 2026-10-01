import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function DeliveriesPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch
    ? await prisma.delivery.findMany({
        where: { branchId: branch.id },
        include: { sale: true, customer: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Delivery Tracking</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Delivery ID</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="px-3 py-2">{d.deliveryNo}</td>
                <td className="px-3 py-2">{d.sale.invoiceNo}</td>
                <td className="px-3 py-2">{d.customer?.name ?? "-"}</td>
                <td className="px-3 py-2">{d.driver ?? "-"}</td>
                <td className="px-3 py-2">{d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
