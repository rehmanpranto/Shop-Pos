import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { sendInvoiceEmail } from "@/lib/email/send";
import { buildSaleInvoice } from "@/lib/pdf/invoice";

export async function POST(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { saleId } = await params;
  const invoice = await buildSaleInvoice(saleId, auth.user.branchId);
  if (!invoice) return fail("Sale not found", 404);

  const { sale, businessName, pdf } = invoice;
  const emailTo = sale.customer?.email;
  if (!emailTo) return fail("Customer email not found", 400);

  const subject = `Invoice #${sale.invoiceNo} - ${businessName}`;
  const log = (status: "PENDING" | "SENT" | "FAILED", extra: { sentAt?: Date; providerResponse?: string } = {}) =>
    prisma.emailLog.create({ data: { saleId: sale.id, emailTo, subject, status, ...extra } });

  await log("PENDING");

  try {
    await sendInvoiceEmail({
      to: emailTo,
      subject,
      html: "<p>Thank you for your purchase.</p>",
      pdfBuffer: Buffer.from(pdf),
      fileName: `${sale.invoiceNo}.pdf`,
    });
    await log("SENT", { sentAt: new Date() });
    return ok({ message: "Invoice email sent" });
  } catch (error) {
    await log("FAILED", { providerResponse: String(error) });
    return fail("Failed to send invoice email", 500, String(error));
  }
}
