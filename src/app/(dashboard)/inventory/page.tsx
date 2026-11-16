import { Warehouse } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDateTime, formatQty, humanize } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { getTr } from "@/lib/i18n-server";

export default async function InventoryPage() {
  const tr = await getTr();
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
      <PageHeader title={tr("Inventory ledger")} description={tr("Every stock movement, newest first. To change stock, use Adjust on the Products page or record a purchase.")} />

      {logs.length === 0 ? (
        <TableCard>
          <EmptyState icon={Warehouse} title={tr("No stock movements yet")} description={tr("Sales, purchases, refunds and adjustments will be listed here.")} />
        </TableCard>
      ) : (
        <TableSearch
          placeholder={tr("Search product, reference or user")}
          filters={[
            { label: "In", value: "STOCK_IN" },
            { label: tr("Out"), value: "STOCK_OUT" },
            { label: tr("Returned"), value: "STOCK_RETURN" },
          ]}
        >
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Date")}</th>
                  <th>{tr("Product")}</th>
                  <th>{tr("Movement")}</th>
                  <th>{tr("Reason")}</th>
                  <th>{tr("Reference")}</th>
                  <th className="num">{tr("Change")}</th>
                  <th className="num">{tr("Stock after")}</th>
                  <th>{tr("By")}</th>
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
                        {tr(humanize(log.reason))}
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
