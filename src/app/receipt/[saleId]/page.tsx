import { notFound, redirect } from "next/navigation";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { formatDateTime, formatQty, humanize, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { PrintButton } from "@/components/ui/print-button";

export const dynamic = "force-dynamic";

const money = (value: unknown) => toNumber(value as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** An 80mm thermal receipt. Opens the print dialog by itself. */
export default async function ReceiptPage({ params }: { params: Promise<{ saleId: string }> }) {
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
        <PrintButton label="Print receipt" auto />
      </div>

      <article className="mx-auto w-[80mm] bg-white px-[4mm] py-[5mm] font-mono text-[11px] leading-snug text-black shadow print:shadow-none">
        <header className="text-center">
          <p className="text-[14px] font-bold leading-tight">{setting?.businessName ?? DEFAULT_BUSINESS_NAME}</p>
          {setting?.address ? <p>{setting.address}</p> : null}
          {setting?.phone ? <p>Phone: {setting.phone}</p> : null}
          {setting?.vatNumber ? <p>BIN: {setting.vatNumber}</p> : null}
        </header>

        <div className="my-2 border-t border-dashed border-black" />
        <div className={row}>
          <span>Invoice</span>
          <span className="font-bold">{sale.invoiceNo}</span>
        </div>
        <div className={row}>
          <span>Date</span>
          <span>{formatDateTime(sale.saleDate)}</span>
        </div>
        <div className={row}>
          <span>Cashier</span>
          <span>{sale.createdBy.name}</span>
        </div>
        <div className={row}>
          <span>Customer</span>
          <span>{sale.customer?.name ?? "Walk-in"}</span>
        </div>
        {sale.status !== "COMPLETED" ? <p className="mt-1 text-center font-bold">*** {humanize(sale.status).toUpperCase()} ***</p> : null}

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
          <span>Subtotal</span>
          <span>{money(sale.subTotal)}</span>
        </div>
        {toNumber(sale.discountAmount) > 0 ? (
          <div className={row}>
            <span>Discount</span>
            <span>-{money(sale.discountAmount)}</span>
          </div>
        ) : null}
        <div className={`${row} text-[14px] font-bold`}>
          <span>TOTAL</span>
          <span>Tk {money(sale.totalAmount)}</span>
        </div>
        {sale.payments.map((payment, index) => (
          <div key={index} className={row}>
            <span>Paid ({humanize(payment.method)})</span>
            <span>{money(payment.amount)}</span>
          </div>
        ))}
        {toNumber(sale.dueAmount) > 0 ? (
          <div className={`${row} font-bold`}>
            <span>DUE</span>
            <span>{money(sale.dueAmount)}</span>
          </div>
        ) : null}

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center">{setting?.invoiceFooter || "Thank you for your business."}</p>
      </article>
    </div>
  );
}
