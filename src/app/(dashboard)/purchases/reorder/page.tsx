import Link from "next/link";
import { ArrowLeft, PackageCheck, ShoppingCart } from "lucide-react";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatQty, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { loadPurchaseFormData } from "../data";
import { PurchaseForm } from "../purchase-form";
import { getTr } from "@/lib/i18n-server";

export default async function ReorderPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  if (!branchId) return null;
  const { suppliers, accounts, products, formProducts } = await loadPurchaseFormData(branchId);
  const canCreate = user ? can(user.role, "purchases:create") : false;

  // Anything at or below its alert level, with a suggestion that brings it to twice that level.
  const low = products
    .map((p) => {
      const stock = toNumber(p.stockQty);
      const min = toNumber(p.minStock);
      return { p, stock, min, suggested: Math.max(Math.ceil(min * 2 - stock), 1) };
    })
    .filter(({ stock, min }) => stock <= min);

  const groups = new Map<string, typeof low>();
  for (const row of low) {
    const key = row.p.supplierId ?? "";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : 0));

  return (
    <div>
      <PageHeader
        title={tr("Reorder list")}
        description={tr("Products at or below their low-stock level, grouped by usual supplier. The suggested quantity brings each one to twice its alert level.")}
        actions={
          <Link href="/purchases" className={buttonClass("ghost")}>
            <ArrowLeft className="h-4 w-4" />{tr("Purchases")}</Link>
        }
      />

      {low.length === 0 ? (
        <TableCard>
          <EmptyState icon={PackageCheck} title={tr("Nothing needs reordering")} description={tr("Every product is above its low-stock level. Set a level on each product with “Warn me below” to see it here when it runs low.")} />
        </TableCard>
      ) : (
        <div className="space-y-5">
          {ordered.map(([supplierId, rows]) => {
            const supplier = suppliers.find((s) => s.id === supplierId);
            return (
              <section key={supplierId || "none"}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-zinc-900">
                    {supplier?.name ?? tr("No usual supplier set")} <span className="text-sm font-normal text-zinc-500">· {rows.length}{" "}{tr("product")}{rows.length === 1 ? "" : "s"}</span>
                  </h3>
                  {canCreate && suppliers.length > 0 ? (
                    <PurchaseForm
                      suppliers={suppliers}
                      accounts={accounts}
                      products={formProducts}
                      secondary
                      defaults={{ supplierId: supplier?.id, status: "ORDERED", lines: rows.map((row) => ({ productId: row.p.id, qty: row.suggested })) }}
                      trigger={
                        <>
                          <ShoppingCart className="h-4 w-4" />{tr("Create purchase order")}</>
                      }
                    />
                  ) : null}
                </div>
                <TableCard>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{tr("Product")}</th>
                        <th className="num">{tr("In stock")}</th>
                        <th className="num">{tr("Alert level")}</th>
                        <th className="num">{tr("Suggested order")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ p, stock, min, suggested }) => (
                        <tr key={p.id}>
                          <td>
                            <p className="font-semibold text-zinc-900">{p.name}</p>
                            <p className="text-xs text-zinc-500">{p.sku}</p>
                          </td>
                          <td className="num">
                            {stock <= 0 ? <Badge tone="red">{tr("Out of stock")}</Badge> : <span className="font-semibold text-amber-700">{`${formatQty(stock)} ${p.baseUnit.code}`}</span>}
                          </td>
                          <td className="num text-zinc-600">
                            {formatQty(min)} {p.baseUnit.code}
                          </td>
                          <td className="num font-semibold">
                            {formatQty(suggested)} {p.baseUnit.code}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
