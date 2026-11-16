import { requireApiAuth } from "@/lib/api-auth";
import { fail } from "@/lib/response";
import { buildSaleInvoice } from "@/lib/pdf/invoice";

export async function GET(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { saleId } = await params;
  const invoice = await buildSaleInvoice(saleId, auth.user.branchId);
  if (!invoice) return fail("Sale not found", 404);

  return new Response(new Uint8Array(invoice.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${invoice.sale.invoiceNo}.pdf`,
    },
  });
}
