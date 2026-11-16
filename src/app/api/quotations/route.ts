import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { nextCode } from "@/lib/ids";
import { D } from "@/lib/numbers";
import { requireUnitFactor } from "@/lib/product-units";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const quotationSchema = z.object({
  customerId: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
  discountAmount: z.number().min(0).default(0),
  items: z
    .array(z.object({ productId: z.string().min(1), unitId: z.string().min(1), qty: z.number().positive(), unitPrice: z.number().positive() }))
    .min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth("quotations:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  try {
    const input = quotationSchema.parse(await request.json());
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (validUntil && Number.isNaN(validUntil.getTime())) return fail("Invalid date", 422);

    const quotation = await prisma.$transaction(async (tx) => {
      if (input.customerId) await tx.customer.findFirstOrThrow({ where: { id: input.customerId, branchId } });
      const products = await tx.product.findMany({ where: { branchId, id: { in: input.items.map((i) => i.productId) } }, include: { unitConversions: true } });
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = input.items.map((item) => {
        const product = byId.get(item.productId);
        if (!product) throw new Error("Invalid product in quotation");
        requireUnitFactor(product, item.unitId);
        return { ...item, lineTotal: D(item.qty).mul(item.unitPrice) };
      });
      const subTotal = lines.reduce((sum, line) => sum.add(line.lineTotal), D(0));
      if (D(input.discountAmount).greaterThan(subTotal)) throw new Error("Discount is more than the quotation total");

      const quotationNo = await nextCode(tx, "quotation", "QT", branchId);
      return tx.quotation.create({
        data: {
          quotationNo,
          branchId,
          customerId: input.customerId,
          status: "SENT",
          validUntil,
          subTotal,
          discountAmount: D(input.discountAmount),
          totalAmount: subTotal.sub(input.discountAmount),
          notes: input.notes || null,
          createdById: auth.user.id,
          items: { create: lines.map((line) => ({ productId: line.productId, unitId: line.unitId, qty: D(line.qty), unitPrice: D(line.unitPrice), lineTotal: line.lineTotal })) },
        },
      });
    });

    return ok({ id: quotation.id, quotationNo: quotation.quotationNo }, 201);
  } catch (error) {
    return fail("Failed to create quotation", 400, `${error}`);
  }
}
