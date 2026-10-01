import { renderToBuffer } from "@react-pdf/renderer";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/response";
import { InvoicePdf } from "@/lib/pdf/invoice";

export async function GET(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { saleId } = await params;

  const [setting, sale] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        createdBy: true,
        items: {
          include: {
            product: true,
            unit: true,
          },
        },
      },
    }),
  ]);

  if (!sale) return fail("Sale not found", 404);

  const buffer = await renderToBuffer(
    InvoicePdf({
      businessName: setting?.businessName ?? "Hardware ERP POS",
      address: setting?.address,
      phone: setting?.phone,
      invoiceNo: sale.invoiceNo,
      date: new Date(sale.saleDate).toLocaleString(),
      cashier: sale.createdBy.name,
      customer: sale.customer?.name,
      items: sale.items.map((i) => ({
        name: i.product.name,
        sku: i.product.sku,
        qty: Number(i.qty),
        unit: i.unit.code,
        unitPrice: Number(i.unitPrice),
        tax: Number(i.taxAmount),
        discount: Number(i.discountAmount),
        lineTotal: Number(i.lineTotal),
      })),
      subTotal: Number(sale.subTotal),
      tax: Number(sale.taxAmount),
      discount: Number(sale.discountAmount),
      total: Number(sale.totalAmount),
      paid: Number(sale.paidAmount),
      due: Number(sale.dueAmount),
    }),
  );

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${sale.invoiceNo}.pdf`,
    },
  });
}
