import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatMoney, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BranchForm } from "./branch-form";
import { getTr } from "@/lib/i18n-server";

export default async function BranchesPage() {
  const tr = await getTr();
  const { branchId } = await getSessionContext();
  const branches = await prisma.branch.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true, products: true, sales: true } }, products: { select: { stockQty: true, weightedAverageCost: true } } },
  });

  return (
    <div>
      <PageHeader
        title={tr("Branches")}
        description={tr("Each branch keeps its own stock, customers and money. Switch the branch you are working in from your account menu, and move stock between branches from the Products page.")}
        actions={<BranchForm />}
      />

      <TableCard>
        <table className="data-table">
          <thead>
            <tr>
              <th>{tr("Branch")}</th>
              <th>{tr("Address")}</th>
              <th className="num">{tr("Staff")}</th>
              <th className="num">{tr("Products")}</th>
              <th className="num">{tr("Stock value")}</th>
              <th className="num">{tr("Sales")}</th>
              <th>{tr("Status")}</th>
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
                    {branch.id === branchId ? <Badge tone="blue">{tr("Working here")}</Badge> : null}
                    {branch.isDefault ? <Badge>{tr("Main")}</Badge> : null}
                    {!branch.isActive ? <Badge tone="red">{tr("Closed")}</Badge> : null}
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
