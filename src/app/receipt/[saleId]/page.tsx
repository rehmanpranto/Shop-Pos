import { notFound, redirect } from "next/navigation";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { formatDateTime, formatQty, humanize, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { PrintButton } from "@/components/ui/print-button";
import { LogoWordmark } from "@/components/brand/logo-mark";
import { getTr } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const money = (value: unknown) => toNumber(value as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** An 80mm thermal receipt. Opens the print dialog by itself. */
export default async function ReceiptPage({ params }: { params: Promise<{ saleId: string }> }) {
  const tr = await getTr();
  const { saleId } = await params;
  const { user, branchId } = await getSessionContext();
  if (!user) redirect("/login");
  if (!branchId) notFound();

  const [setting, sale] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.sale.findFirst({
      where: { id: saleId, branchId },
      include: {
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true } }, unit: { select: { code: true } } } },
        payments: { where: { refundId: null }, select: { method: true, amount: true } },
      },
    }),
  ]);
  if (!sale) notFound();

  const row = "flex justify-between gap-2";

  return (
    <div className="min-h-screen bg-zinc-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: 80mm auto; margin: 0; } @media print { html, body { width: 80mm; background: #fff; } }`}</style>

      <div className="mx-auto mb-4 flex w-[80mm] justify-center print:hidden">
        <PrintButton label={tr("Print receipt")} auto />
      </div>

      <article className="mx-auto w-[80mm] bg-white px-[4mm] py-[5mm] font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <header className="text-center">
          <LogoWordmark className="mx-auto mb-1 w-[56mm]" alt={setting?.businessName ?? DEFAULT_BUSINESS_NAME} />
          {setting?.address ? <p>{setting.address}</p> : null}
          {setting?.phone ? <p>{tr("Phone:")}{" "}{setting.phone}</p> : null}
          {setting?.vatNumber ? <p>{tr("BIN:")}{" "}{setting.vatNumber}</p> : null}
        </header>

        <div className="my-2 border-t border-dashed border-black" />
        <div className={row}>
          <span>{tr("Invoice")}</span>
          <span className="font-bold">{sale.invoiceNo}</span>
        </div>
        <div className={row}>
          <span>{tr("Date")}</span>
          <span>{formatDateTime(sale.saleDate)}</span>
        </div>
        <div className={row}>
          <span>{tr("Cashier")}</span>
          <span>{sale.createdBy.name}</span>
        </div>
        <div className={row}>
          <span>{tr("Customer")}</span>
          <span>{sale.customer?.name ?? tr("Walk-in")}</span>
        </div>
        {sale.status !== "COMPLETED" ? <p className="mt-1 text-center font-bold">*** {tr(humanize(sale.status)).toUpperCase()} ***</p> : null}

        <div className="my-2 border-t border-dashed border-black" />
        {sale.items.map((item) => (
          <div key={item.id} className="mb-1">
            <p className="font-bold">{item.product.name}</p>
            <div className={row}>
              <span>
                {formatQty(item.qty)} {item.unit.code} x {money(item.unitPrice)}
              </span>
              <span>{money(item.lineTotal)}</span>
            </div>
          </div>
        ))}

        <div className="my-2 border-t border-dashed border-black" />
        <div className={row}>
          <span>{tr("Subtotal")}</span>
          <span>{money(sale.subTotal)}</span>
        </div>
        {toNumber(sale.discountAmount) > 0 ? (
          <div className={row}>
            <span>{tr("Discount")}</span>
            <span>-{money(sale.discountAmount)}</span>
          </div>
        ) : null}
        <div className={`${row} text-[14px] font-bold`}>
          <span>{tr("TOTAL")}</span>
          <span>{tr("Tk")}{" "}{money(sale.totalAmount)}</span>
        </div>
        {sale.payments.map((payment, index) => (
          <div key={index} className={row}>
            <span>{tr("Paid (")}{tr(humanize(payment.method))})</span>
            <span>{money(payment.amount)}</span>
          </div>
        ))}
        {toNumber(sale.dueAmount) > 0 ? (
          <div className={`${row} font-bold`}>
            <span>{tr("DUE")}</span>
            <span>{money(sale.dueAmount)}</span>
          </div>
        ) : null}

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center">{setting?.invoiceFooter || tr("Thank you for your business.")}</p>
      </article>
    </div>
  );
}
