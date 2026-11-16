import Link from "next/link";
import { startOfMonth } from "date-fns";
import { HandCoins, ListChecks, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSearch } from "@/components/ui/table-search";
import { loadPurchaseFormData } from "./data";
import { PurchaseForm } from "./purchase-form";
import { ReceiveForm } from "./receive-form";
import { getTr } from "@/lib/i18n-server";

export default async function PurchasesPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  if (!branchId) return null;

  const [purchases, formData] = await Promise.all([
    prisma.purchase.findMany({
      where: { branchId },
      include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true } }, unit: { select: { code: true } } } } },
      orderBy: { purchaseDate: "desc" },
      take: 300,
    }),
    loadPurchaseFormData(branchId),
  ]);
  const { suppliers, accounts, formProducts } = formData;
  const canCreate = user ? can(user.role, "purchases:create") : false;
  const canReceive = user ? can(user.role, "purchases:update") : false;

  const monthStart = startOfMonth(new Date());
  const active = purchases.filter((p) => p.status !== "CANCELLED");
  const monthTotal = active.filter((p) => p.purchaseDate >= monthStart).reduce((sum, p) => sum + toNumber(p.totalAmount), 0);
  const owed = active.reduce((sum, p) => sum + toNumber(p.dueAmount), 0);
  const waiting = active.filter((p) => p.status === "ORDERED" || p.status === "PARTIALLY_RECEIVED").length;

  const ready = suppliers.length > 0 && formProducts.length > 0;
  const form = ready && canCreate ? <PurchaseForm suppliers={suppliers} accounts={accounts} products={formProducts} /> : null;

  return (
    <div>
      <PageHeader
        title={tr("Purchases")}
        description={tr("Stock you buy from suppliers.")}
        actions={
          <>
            <Link href="/purchases/reorder" className={buttonClass("secondary")}>
              <ListChecks className="h-4 w-4" />{tr("Reorder list")}</Link>
            {form}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr("Bought this month")} value={formatMoney(monthTotal)} icon={ShoppingCart} />
        <StatCard label={tr("You owe suppliers")} value={formatMoney(owed)} icon={HandCoins} tone="amber" />
        <StatCard label={tr("Waiting to arrive")} value={`${waiting}`} hint={tr("Ordered but not fully received")} icon={ListChecks} tone="neutral" />
      </div>

      {purchases.length === 0 ? (
        <TableCard>
          <EmptyState
            icon={ShoppingCart}
            title={tr("No purchases yet")}
            description={ready ? tr("Record a purchase to bring stock in and track what you owe.") : tr("You need at least one supplier and one product before recording a purchase.")}
            action={
              form ??
              (ready ? null : (
                <Link href={suppliers.length === 0 ? "/suppliers" : "/products"} className={buttonClass()}>
                  {suppliers.length === 0 ? tr("Add a supplier") : tr("Add a product")}
                </Link>
              ))
            }
          />
        </TableCard>
      ) : (
        <TableSearch placeholder={tr("Search PO number or supplier")} filters={[{ label: tr("Unpaid"), value: "due" }, { label: tr("Waiting to arrive"), value: "pending" }]}>
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Purchase")}</th>
                  <th>{tr("Supplier")}</th>
                  <th className="num">{tr("Items")}</th>
                  <th className="num">{tr("Total")}</th>
                  <th className="num">{tr("Paid")}</th>
                  <th className="num">{tr("Due")}</th>
                  <th>{tr("Status")}</th>
                  <th className="num">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const due = toNumber(p.dueAmount);
                  const pending = p.status === "ORDERED" || p.status === "PARTIALLY_RECEIVED" || p.status === "DRAFT";
                  const receivable = p.items
                    .map((item) => ({
                      itemId: item.id,
                      name: item.product.name,
                      unit: item.unit.code,
                      ordered: toNumber(item.qty),
                      remaining: toNumber(item.qty) - toNumber(item.receivedQty),
                    }))
                    .filter((item) => item.remaining > 0);
                  return (
                    <tr key={p.id} data-tags={`${due > 0 ? "due" : ""} ${pending ? "pending" : ""}`}>
                      <td className="whitespace-nowrap">
                        <p className="font-semibold text-zinc-900">{p.purchaseNo}</p>
                        <p className="text-xs text-zinc-500">{formatDate(p.purchaseDate)}</p>
                      </td>
                      <td>
                        <Link href={`/suppliers/${p.supplierId}`} className="hover:text-brand hover:underline">
                          {p.supplier.name}
                        </Link>
                      </td>
                      <td className="num text-zinc-600">{p.items.length}</td>
                      <td className="num font-semibold">{formatMoney(p.totalAmount)}</td>
                      <td className="num">{formatMoney(p.paidAmount)}</td>
                      <td className="num">{due > 0 ? <span className="font-bold text-amber-700">{formatMoney(due)}</span> : "-"}</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td>
                        <div className="flex justify-end">
                          {pending && canReceive && receivable.length > 0 ? <ReceiveForm purchaseId={p.id} purchaseNo={p.purchaseNo} items={receivable} /> : null}
                        </div>
                      </td>
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
