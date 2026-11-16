import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { QuotationForm, type QuotationProduct } from "./quotation-form";

export default async function QuotationsPage() {
  const { user, branchId } = await getSessionContext();
  if (!branchId) return null;

  const [items, customers, products] = await Promise.all([
    prisma.quotation.findMany({
      where: { branchId },
      include: { customer: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.customer.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, priceLevel: true } }),
    prisma.product.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: "asc" },
      include: { baseUnit: { select: { id: true, code: true } }, unitConversions: { include: { fromUnit: { select: { code: true } } } } },
    }),
  ]);
  const formProducts: QuotationProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    retailPrice: toNumber(p.retailPrice),
    wholesalePrice: toNumber(p.wholesalePrice),
    units: [{ id: p.baseUnit.id, code: p.baseUnit.code, factor: 1 }, ...p.unitConversions.map((c) => ({ id: c.fromUnitId, code: c.fromUnit.code, factor: toNumber(c.factor) }))],
  }));
  const form = user && can(user.role, "quotations:create") && formProducts.length > 0 ? <QuotationForm customers={customers} products={formProducts} /> : null;
  const today = new Date();

  return (
    <div>
      <PageHeader title="Quotations" description="Price offers for customers. Turn an accepted one into a sale with one click." actions={form} />

      {items.length === 0 ? (
        <TableCard>
          <EmptyState
            icon={ClipboardList}
            title="No quotations yet"
            description={formProducts.length === 0 ? "Add products first, then you can quote prices for them." : "Create a quotation when a customer asks for prices before buying."}
            action={form}
          />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search quotation or customer" filters={[{ label: "Open", value: "open" }, { label: "Accepted", value: "ACCEPTED" }, { label: "Rejected", value: "REJECTED" }]}>
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Valid until</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => {
                  const expired = q.status === "SENT" && q.validUntil !== null && q.validUntil < today;
                  const open = (q.status === "SENT" || q.status === "DRAFT") && !expired;
                  return (
                    <tr key={q.id} data-tags={`${open ? "open" : ""} ${q.status}`}>
                      <td className="whitespace-nowrap">
                        <Link href={`/quotations/${q.id}`} className="font-semibold text-zinc-900 hover:text-brand hover:underline">
                          {q.quotationNo}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {formatDate(q.createdAt)} · {q.createdBy.name}
                        </p>
                      </td>
                      <td>{q.customer?.name ?? "-"}</td>
                      <td className="text-zinc-600">{q.validUntil ? formatDate(q.validUntil) : "-"}</td>
                      <td className="num text-zinc-600">{q._count.items}</td>
                      <td className="num font-semibold">{formatMoney(q.totalAmount)}</td>
                      <td>
                        <StatusBadge status={expired ? "EXPIRED" : q.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {open ? (
                            <Link href={`/pos?quotation=${q.id}`} className={buttonClass("primary", "sm")}>
                              Make sale
                            </Link>
                          ) : null}
                          <Link href={`/quotations/${q.id}`} className={buttonClass("secondary", "sm")}>
                            View
                          </Link>
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
