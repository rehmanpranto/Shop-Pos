import { renderToBuffer } from "@react-pdf/renderer";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { sendInvoiceEmail } from "@/lib/email/send";
import { InvoicePdf } from "@/lib/pdf/invoice";

export async function POST(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
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
  if (!sale.customer?.email) return fail("Customer email not found", 400);

  await prisma.emailLog.create({
    data: {
      saleId: sale.id,
      emailTo: sale.customer.email,
      subject: `Invoice #${sale.invoiceNo} - ${setting?.businessName ?? "Hardware ERP POS"}`,
      status: "PENDING",
    },
  });

  try {
    const pdfBuffer = await renderToBuffer(
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

    await sendInvoiceEmail({
      to: sale.customer.email,
      subject: `Invoice #${sale.invoiceNo} - ${setting?.businessName ?? "Hardware ERP POS"}`,
      html: "<p>Thank you for your purchase.</p>",
      pdfBuffer,
      fileName: `${sale.invoiceNo}.pdf`,
    });

    await prisma.emailLog.create({
      data: {
        saleId: sale.id,
        emailTo: sale.customer.email,
        subject: `Invoice #${sale.invoiceNo} - ${setting?.businessName ?? "Hardware ERP POS"}`,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return ok({ message: "Invoice email sent" });
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        saleId: sale.id,
        emailTo: sale.customer.email,
        subject: `Invoice #${sale.invoiceNo} - ${setting?.businessName ?? "Hardware ERP POS"}`,
        status: "FAILED",
        providerResponse: String(error),
      },
    });

    return fail("Failed to send invoice email", 500, String(error));
  }
}
