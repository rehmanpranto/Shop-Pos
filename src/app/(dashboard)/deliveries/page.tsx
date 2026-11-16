import Link from "next/link";
import { Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { DeliveryActions } from "./delivery-actions";
import { getTr } from "@/lib/i18n-server";

export default async function DeliveriesPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  const items = branchId
    ? await prisma.delivery.findMany({
        where: { branchId },
        include: { sale: { select: { invoiceNo: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      })
    : [];
  const canUpdate = user ? can(user.role, "deliveries:update") : false;
  const goToSales = (
    <Link href="/sales" className={buttonClass("secondary")}>{tr("Schedule from Sales")}</Link>
  );

  return (
    <div>
      <PageHeader title={tr("Deliveries")} description={tr("Orders going out to customers. To schedule one, open Sales and choose Deliver on the invoice.")} actions={goToSales} />

      {items.length === 0 ? (
        <TableCard>
          <EmptyState icon={Truck} title={tr("No deliveries yet")} description={tr("When a customer wants goods delivered, schedule it from the invoice on the Sales page.")} action={goToSales} />
        </TableCard>
      ) : (
        <TableSearch
          placeholder={tr("Search delivery, invoice, customer or driver")}
          filters={[
            { label: tr("To do"), value: "open" },
            { label: tr("Delivered"), value: "DELIVERED" },
            { label: tr("Cancelled"), value: "CANCELLED" },
          ]}
        >
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Delivery")}</th>
                  <th>{tr("Customer")}</th>
                  <th>{tr("Address")}</th>
                  <th>{tr("Driver")}</th>
                  <th>{tr("Date")}</th>
                  <th>{tr("Status")}</th>
                  <th className="num">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => {
                  const open = d.status !== "DELIVERED" && d.status !== "CANCELLED";
                  return (
                    <tr key={d.id} data-tags={`${open ? "open" : ""} ${d.status}`}>
                      <td className="whitespace-nowrap">
                        <Link href={`/deliveries/${d.id}`} className="font-semibold text-zinc-900 hover:text-brand hover:underline">
                          {d.deliveryNo}
                        </Link>
                        <p className="text-xs text-zinc-500">{d.sale.invoiceNo}</p>
                      </td>
                      <td>{d.customer?.name ?? tr("Walk-in")}</td>
                      <td className="max-w-56 text-zinc-600">
                        {d.address ?? "-"}
                        {d.phone ? <span className="block text-xs text-zinc-500">{d.phone}</span> : null}
                      </td>
                      <td className="text-zinc-600">
                        {d.driver ?? "-"}
                        {d.vehicle ? <span className="block text-xs text-zinc-500">{d.vehicle}</span> : null}
                      </td>
                      <td className="whitespace-nowrap text-zinc-600">{d.deliveryDate ? formatDate(d.deliveryDate) : "-"}</td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {canUpdate ? <DeliveryActions deliveryId={d.id} status={d.status} /> : null}
                          <Link href={`/deliveries/${d.id}`} className={buttonClass("secondary", "sm")}>{tr("Challan")}</Link>
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
