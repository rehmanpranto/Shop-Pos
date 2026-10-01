import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function PurchasesPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const purchases = branch
    ? await prisma.purchase.findMany({
        where: { branchId: branch.id },
        include: { supplier: true },
        orderBy: { purchaseDate: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Purchase Management</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">PO No</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-3 py-2 font-semibold">{p.purchaseNo}</td>
                <td className="px-3 py-2">{p.supplier.name}</td>
                <td className="px-3 py-2">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                <td className="px-3 py-2">৳{Number(p.totalAmount).toFixed(2)}</td>
                <td className="px-3 py-2">৳{Number(p.paidAmount).toFixed(2)}</td>
                <td className="px-3 py-2">৳{Number(p.dueAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
