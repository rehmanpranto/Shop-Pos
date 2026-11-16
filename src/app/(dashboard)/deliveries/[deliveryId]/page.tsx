import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { formatDate, formatMoney, formatQty, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PrintDocument } from "@/components/ui/document";
import { PrintButton } from "@/components/ui/print-button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { getTr } from "@/lib/i18n-server";

/** Delivery challan: what is on the truck, where it goes, and a place to sign for it. */
export default async function DeliveryChallanPage({ params }: { params: Promise<{ deliveryId: string }> }) {
  const tr = await getTr();
  const { deliveryId } = await params;
  const { branchId } = await getSessionContext();
  if (!branchId) notFound();

  const [setting, delivery] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.delivery.findFirst({
      where: { id: deliveryId, branchId },
      include: {
        customer: { select: { name: true, phone: true } },
        sale: { select: { invoiceNo: true, dueAmount: true, items: { include: { product: { select: { name: true, sku: true } }, unit: { select: { code: true } } } } } },
      },
    }),
  ]);
  if (!delivery) notFound();
  const due = toNumber(delivery.sale.dueAmount);
  const charge = toNumber(delivery.deliveryCharge);

  return (
    <PrintDocument
      businessName={setting?.businessName ?? DEFAULT_BUSINESS_NAME}
      businessLines={[setting?.address ?? "", setting?.phone ? tr("Phone: {0}", setting.phone) : ""]}
      title={tr("Delivery challan")}
      number={delivery.deliveryNo}
      meta={[
        [tr("Invoice"), delivery.sale.invoiceNo],
        [tr("Delivery date"), delivery.deliveryDate ? formatDate(delivery.deliveryDate) : tr("Not set")],
      ]}
      actions={
        <>
          <Link href="/deliveries" className={buttonClass("ghost", "md", "mr-auto")}>
            <ArrowLeft className="h-4 w-4" />{tr("Deliveries")}</Link>
          <StatusBadge status={delivery.status} />
          <PrintButton label={tr("Print challan")} />
        </>
      }
      footer={
        <div className="grid grid-cols-2 gap-10 pt-10 text-center text-xs text-zinc-600">
          <p className="border-t border-zinc-400 pt-2">{tr("Delivered by")}</p>
          <p className="border-t border-zinc-400 pt-2">{tr("Received in good condition by")}</p>
        </div>
      }
    >
      <div className="grid gap-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Deliver to")}</p>
          <p className="text-base font-bold text-zinc-900">{delivery.customer?.name ?? tr("Customer")}</p>
          <p className="text-sm text-zinc-600">{delivery.address}</p>
          {delivery.phone || delivery.customer?.phone ? <p className="text-sm text-zinc-600">{tr("Phone:")}{" "}{delivery.phone ?? delivery.customer?.phone}</p> : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Transport")}</p>
          <p className="text-sm text-zinc-900">{tr("Driver:")}{" "}{delivery.driver ?? "-"}</p>
          <p className="text-sm text-zinc-900">{tr("Vehicle:")}{" "}{delivery.vehicle ?? "-"}</p>
          {delivery.notes ? <p className="mt-1 text-sm text-zinc-600">{delivery.notes}</p> : null}
        </div>
      </div>

      <ResponsiveTable>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{tr("Item")}</th>
              <th className="num">{tr("Quantity")}</th>
            </tr>
          </thead>
          <tbody>
            {delivery.sale.items.map((item, index) => (
              <tr key={item.id}>
                <td className="text-zinc-500">{index + 1}</td>
                <td>
                  <span className="font-semibold text-zinc-900">{item.product.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">{item.product.sku}</span>
                </td>
                <td className="num font-semibold">
                  {formatQty(item.qty)} {item.unit.code}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>

      {due > 0 || charge > 0 ? (
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          {charge > 0 ? (
            <div className="flex justify-between">
              <dt className="text-zinc-600">{tr("Delivery charge")}</dt>
              <dd className="tabular font-semibold">{formatMoney(charge)}</dd>
            </div>
          ) : null}
          {due > 0 ? (
            <div className="flex justify-between">
              <dt className="text-zinc-600">{tr("Still unpaid on the invoice")}</dt>
              <dd className="tabular font-semibold">{formatMoney(due)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </PrintDocument>
  );
}
