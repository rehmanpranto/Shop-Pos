import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { CustomerCreateForm } from "./customer-create-form";

export default async function CustomersPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch ? await prisma.customer.findMany({ where: { branchId: branch.id }, orderBy: { createdAt: "desc" } }) : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Customers</h2>
      <CustomerCreateForm />
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Customer ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Price Level</th>
              <th className="px-3 py-2">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-3 py-2">{c.customerCode}</td>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.phone ?? "-"}</td>
                <td className="px-3 py-2">{c.customerType ?? "-"}</td>
                <td className="px-3 py-2">{c.priceLevel}</td>
                <td className="px-3 py-2">৳{Number(c.outstanding).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
