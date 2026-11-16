import { Warehouse } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatQty, humanize } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";

export default async function InventoryPage() {
  const { branchId } = await getSessionContext();
  const logs = branchId
    ? await prisma.inventoryTransaction.findMany({
        where: { branchId },
        include: { product: { select: { name: true } }, unit: { select: { code: true } }, createdBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      })
    : [];

  return (
    <div>
      <PageHeader title="Inventory ledger" description="Every stock movement, newest first. To change stock, use Adjust on the Products page or record a purchase." />

      {logs.length === 0 ? (
        <TableCard>
          <EmptyState icon={Warehouse} title="No stock movements yet" description="Sales, purchases, refunds and adjustments will be listed here." />
        </TableCard>
      ) : (
        <TableSearch
          placeholder="Search product, reference or user"
          filters={[
            { label: "In", value: "STOCK_IN" },
            { label: "Out", value: "STOCK_OUT" },
            { label: "Returned", value: "STOCK_RETURN" },
          ]}
        >
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Reason</th>
                  <th>Reference</th>
                  <th className="num">Change</th>
                  <th className="num">Stock after</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const out = log.movementType === "STOCK_OUT";
                  return (
                    <tr key={log.id} data-tags={log.movementType}>
                      <td className="whitespace-nowrap text-zinc-600">{formatDateTime(log.createdAt)}</td>
                      <td className="font-semibold text-zinc-900">{log.product.name}</td>
                      <td>
                        <StatusBadge status={log.movementType} />
                      </td>
                      <td className="text-zinc-600">
                        {humanize(log.reason)}
                        {log.note ? <span className="block text-xs text-zinc-500">{log.note}</span> : null}
                      </td>
                      <td className="text-zinc-600">{log.referenceNo}</td>
                      <td className={`num font-semibold ${out ? "text-red-700" : "text-emerald-700"}`}>
                        {out ? "-" : "+"}
                        {formatQty(log.qty)} {log.unit.code}
                      </td>
                      <td className="num">{formatQty(log.newStock)}</td>
                      <td className="text-zinc-600">{log.createdBy.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
