import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

/** A quotation with its lines, used by the POS to turn it into a sale. */
export async function GET(_: Request, { params }: { params: Promise<{ quotationId: string }> }) {
  const auth = await requireApiAuth("quotations:read");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { quotationId } = await params;

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, branchId: auth.user.branchId! },
    select: {
      id: true,
      quotationNo: true,
      customerId: true,
      discountAmount: true,
      status: true,
      items: { select: { productId: true, unitId: true, qty: true, unitPrice: true } },
    },
  });
  if (!quotation) return fail("Quotation not found", 404);
  return ok(quotation);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quotationId: string }> }) {
  const auth = await requireApiAuth("quotations:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { quotationId } = await params;

  const parsed = z.object({ status: z.enum(["SENT", "ACCEPTED", "REJECTED", "EXPIRED"]) }).safeParse(await request.json());
  if (!parsed.success) return fail("Invalid status", 422);

  const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, branchId: auth.user.branchId! }, select: { id: true } });
  if (!quotation) return fail("Quotation not found", 404);

  await prisma.quotation.update({ where: { id: quotation.id }, data: { status: parsed.data.status } });
  return ok({ id: quotation.id, status: parsed.data.status });
}
