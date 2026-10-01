import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function ExpensesPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const items = branch
    ? await prisma.expense.findMany({
        where: { branchId: branch.id },
        include: { category: true },
        orderBy: { date: "desc" },
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-bold">Expenses</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Expense ID</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="px-3 py-2">{e.expenseNo}</td>
                <td className="px-3 py-2">{e.category.name}</td>
                <td className="px-3 py-2">{e.description ?? "-"}</td>
                <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-3 py-2">৳{Number(e.amount).toFixed(2)}</td>
                <td className="px-3 py-2">{e.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
