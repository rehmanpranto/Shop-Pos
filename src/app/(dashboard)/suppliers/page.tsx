import { Building2 } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { buttonClass } from "@/components/ui/button";
import { PaySupplier } from "./pay-supplier";
import { getSessionContext } from "@/lib/session";
import { formatMoney, toNumber } from "@/lib/format";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { SupplierForm } from "./supplier-form";

export default async function SuppliersPage() {
  const { user, branchId } = await getSessionContext();
  const canAdd = user ? can(user.role, "suppliers:create") : false;
  const canPay = user ? can(user.role, "payments:create") : false;
  const accounts = branchId
    ? await prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const items = branchId
    ? await prisma.supplier.findMany({
        where: { branchId },
        include: { purchases: { where: { status: { not: "CANCELLED" } }, select: { totalAmount: true, dueAmount: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader title="Suppliers" description="Who you buy stock from, and what you owe them." actions={canAdd ? <SupplierForm /> : null} />

      {items.length === 0 ? (
        <TableCard>
          <EmptyState icon={Building2} title="No suppliers yet" description="Add a supplier, then record purchases from them to bring stock in." action={canAdd ? <SupplierForm /> : null} />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search name, company or phone">
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Phone</th>
                  <th>Terms</th>
                  <th className="num">Purchases</th>
                  <th className="num">Total bought</th>
                  <th className="num">You owe</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => {
                  const bought = s.purchases.reduce((sum, p) => sum + toNumber(p.totalAmount), 0);
                  const owed = s.purchases.reduce((sum, p) => sum + toNumber(p.dueAmount), 0);
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/suppliers/${s.id}`} className="font-semibold text-zinc-900 hover:text-brand hover:underline">
                          {s.name}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {s.supplierCode}
                          {s.company ? ` · ${s.company}` : ""}
                        </p>
                      </td>
                      <td className="text-zinc-600">{s.phone ?? "-"}</td>
                      <td className="text-zinc-600">{s.paymentTerms ?? "-"}</td>
                      <td className="num text-zinc-600">{s.purchases.length}</td>
                      <td className="num">{formatMoney(bought)}</td>
                      <td className="num">{owed > 0 ? <span className="font-bold text-amber-700">{formatMoney(owed)}</span> : <span className="text-zinc-400">-</span>}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {owed > 0 && canPay ? <PaySupplier supplierId={s.id} name={s.name} owed={owed} accounts={accounts} /> : null}
                          <Link href={`/suppliers/${s.id}`} className={buttonClass("secondary", "sm")}>
                            Statement
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
