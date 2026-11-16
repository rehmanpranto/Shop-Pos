import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatMoney, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BranchForm } from "./branch-form";

export default async function BranchesPage() {
  const { branchId } = await getSessionContext();
  const branches = await prisma.branch.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true, products: true, sales: true } }, products: { select: { stockQty: true, weightedAverageCost: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Each branch keeps its own stock, customers and money. Switch the branch you are working in from your account menu, and move stock between branches from the Products page."
        actions={<BranchForm />}
      />

      <TableCard>
        <table className="data-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Address</th>
              <th className="num">Staff</th>
              <th className="num">Products</th>
              <th className="num">Stock value</th>
              <th className="num">Sales</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id}>
                <td>
                  <p className="font-semibold text-zinc-900">{branch.name}</p>
                  <p className="text-xs text-zinc-500">{branch.code}</p>
                </td>
                <td className="text-zinc-600">{[branch.address, branch.phone].filter(Boolean).join(" · ") || "-"}</td>
                <td className="num">{branch._count.users}</td>
                <td className="num">{branch._count.products}</td>
                <td className="num">{formatMoney(branch.products.reduce((sum, p) => sum + toNumber(p.stockQty) * toNumber(p.weightedAverageCost), 0))}</td>
                <td className="num">{branch._count.sales}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {branch.id === branchId ? <Badge tone="blue">Working here</Badge> : null}
                    {branch.isDefault ? <Badge>Main</Badge> : null}
                    {!branch.isActive ? <Badge tone="red">Closed</Badge> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
