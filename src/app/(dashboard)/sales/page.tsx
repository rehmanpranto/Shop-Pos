import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaleActions } from "./sale-actions";

export default async function SalesPage() {
  const session = await getServerSession(authOptions);
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const sales = branch
    ? await prisma.sale.findMany({
        where: { branchId: branch.id },
        include: { customer: true, payments: true, refunds: true },
        orderBy: { saleDate: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Sales & Invoices</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Status</th>
              {session?.user.role === "ADMIN" ? <th className="px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="px-3 py-2 font-semibold">{s.invoiceNo}</td>
                <td className="px-3 py-2">{new Date(s.saleDate).toLocaleString()}</td>
                <td className="px-3 py-2">{s.customer?.name ?? "Walk-in"}</td>
                <td className="px-3 py-2">৳{Number(s.totalAmount).toFixed(2)}</td>
                <td className="px-3 py-2">৳{Number(s.paidAmount).toFixed(2)}</td>
                <td className="px-3 py-2">৳{Number(s.dueAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{s.status}</td>
                {session?.user.role === "ADMIN" ? <td className="px-3 py-2"><SaleActions saleId={s.id} /></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
