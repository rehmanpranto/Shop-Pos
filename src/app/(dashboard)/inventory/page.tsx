import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function InventoryPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const logs = branch
    ? await prisma.inventoryTransaction.findMany({
        where: { branchId: branch.id },
        include: { product: true, unit: true, createdBy: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Inventory Ledger</h2>
      <p className="mt-1 text-sm text-zinc-600">Every stock movement is preserved for audit and traceability.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Previous</th>
              <th className="px-3 py-2">New</th>
              <th className="px-3 py-2">User</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b">
                <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{log.product.name}</td>
                <td className="px-3 py-2">{Number(log.qty)}</td>
                <td className="px-3 py-2">{log.unit.code}</td>
                <td className="px-3 py-2">{log.movementType}</td>
                <td className="px-3 py-2">{log.reason}</td>
                <td className="px-3 py-2">{log.referenceNo}</td>
                <td className="px-3 py-2">{Number(log.previousStock)}</td>
                <td className="px-3 py-2">{Number(log.newStock)}</td>
                <td className="px-3 py-2">{log.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
