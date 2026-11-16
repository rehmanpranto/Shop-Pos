import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, ShoppingCart } from "lucide-react";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { formatDate, formatMoney, formatQty, humanize, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { whatsappLink } from "@/lib/whatsapp";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PrintDocument } from "@/components/ui/document";
import { PrintButton } from "@/components/ui/print-button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { RejectQuotation } from "../quotation-status";
import { getTr } from "@/lib/i18n-server";

export default async function QuotationPage({ params }: { params: Promise<{ quotationId: string }> }) {
  const tr = await getTr();
  const { quotationId } = await params;
  const { branchId } = await getSessionContext();
  if (!branchId) notFound();

  const [setting, quotation] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.quotation.findFirst({
      where: { id: quotationId, branchId },
      include: { customer: true, createdBy: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } }, unit: { select: { code: true } } } } },
    }),
  ]);
  if (!quotation) notFound();

  const businessName = setting?.businessName ?? DEFAULT_BUSINESS_NAME;
  const expired = quotation.status === "SENT" && quotation.validUntil !== null && quotation.validUntil < new Date();
  const open = (quotation.status === "SENT" || quotation.status === "DRAFT") && !expired;
  const share = whatsappLink(
    quotation.customer?.phone,
    `Quotation ${quotation.quotationNo} from ${businessName}\n` +
      quotation.items.map((item) => `${item.product.name}: ${formatQty(item.qty)} ${item.unit.code} x ${formatMoney(item.unitPrice)} = ${formatMoney(item.lineTotal)}`).join("\n") +
      `\nTotal: ${formatMoney(quotation.totalAmount)}` +
      (quotation.validUntil ? `\nValid until ${formatDate(quotation.validUntil)}` : ""),
  );

  return (
    <PrintDocument
      businessName={businessName}
      businessLines={[setting?.address ?? "", setting?.phone ? tr("Phone: {0}", setting.phone) : ""]}
      title={tr("Quotation")}
      number={quotation.quotationNo}
      meta={[
        [tr("Date"), formatDate(quotation.createdAt)],
        ...(quotation.validUntil ? ([[tr("Valid until"), formatDate(quotation.validUntil)]] as Array<[string, string]>) : []),
      ]}
      actions={
        <>
          <Link href="/quotations" className={buttonClass("ghost", "md", "mr-auto")}>
            <ArrowLeft className="h-4 w-4" />{tr("Quotations")}</Link>
          <StatusBadge status={expired ? "EXPIRED" : quotation.status} />
          {open ? <RejectQuotation quotationId={quotation.id} /> : null}
          {share ? (
            <a href={share} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <MessageCircle className="h-4 w-4" />{tr("Send on WhatsApp")}</a>
          ) : null}
          <PrintButton />
          {open ? (
            <Link href={`/pos?quotation=${quotation.id}`} className={buttonClass()}>
              <ShoppingCart className="h-4 w-4" />{tr("Make sale")}</Link>
          ) : null}
        </>
      }
      footer={
        <>
          {quotation.notes ? <p className="mb-2">{quotation.notes}</p> : null}
          <p>{tr("Prices are valid for the period shown above and depend on stock being available. Prepared by")}{" "}{quotation.createdBy.name}.</p>
        </>
      }
    >
      <div className="py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Quotation for")}</p>
        <p className="text-base font-bold text-zinc-900">{quotation.customer?.name ?? tr("Customer")}</p>
        {[quotation.customer?.company, quotation.customer?.phone, quotation.customer?.address].filter(Boolean).map((line) => (
          <p key={line} className="text-sm text-zinc-600">
            {line}
          </p>
        ))}
      </div>

      <ResponsiveTable>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{tr("Item")}</th>
              <th className="num">{tr("Quantity")}</th>
              <th className="num">{tr("Price")}</th>
              <th className="num">{tr("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, index) => (
              <tr key={item.id}>
                <td className="text-zinc-500">{index + 1}</td>
                <td>
                  <span className="font-semibold text-zinc-900">{item.product.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">{item.product.sku}</span>
                </td>
                <td className="num">
                  {formatQty(item.qty)} {item.unit.code}
                </td>
                <td className="num">{formatMoney(item.unitPrice)}</td>
                <td className="num font-semibold">{formatMoney(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>

      <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-600">{tr("Subtotal")}</dt>
          <dd className="tabular">{formatMoney(quotation.subTotal)}</dd>
        </div>
        {toNumber(quotation.discountAmount) > 0 ? (
          <div className="flex justify-between">
            <dt className="text-zinc-600">{tr("Discount")}</dt>
            <dd className="tabular">-{formatMoney(quotation.discountAmount)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-zinc-300 pt-2">
          <dt className="font-bold text-zinc-900">{tr("Total")}</dt>
          <dd className="tabular text-xl font-black text-zinc-900">{formatMoney(quotation.totalAmount)}</dd>
        </div>
      </dl>
      <p className="sr-only">{tr("Status:")}{" "}{tr(humanize(quotation.status))}</p>
    </PrintDocument>
  );
}
