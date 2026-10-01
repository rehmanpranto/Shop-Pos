import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function SuppliersPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch ? await prisma.supplier.findMany({ where: { branchId: branch.id }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Suppliers</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Supplier ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Credit Limit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="px-3 py-2">{s.supplierCode}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.company ?? "-"}</td>
                <td className="px-3 py-2">{s.phone ?? "-"}</td>
                <td className="px-3 py-2">৳{Number(s.creditLimit).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
