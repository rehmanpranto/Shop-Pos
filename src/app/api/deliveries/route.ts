import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { nextCode } from "@/lib/ids";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const deliverySchema = z.object({
  saleId: z.string().min(1),
  address: z.string().trim().min(1).max(300),
  phone: z.string().trim().max(40).optional(),
  driver: z.string().trim().max(120).optional(),
  vehicle: z.string().trim().max(60).optional(),
  deliveryDate: z.string().optional(),
  deliveryCharge: z.number().min(0).default(0),
  notes: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth("deliveries:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  try {
    const input = deliverySchema.parse(await request.json());
    const deliveryDate = input.deliveryDate ? new Date(input.deliveryDate) : null;
    if (deliveryDate && Number.isNaN(deliveryDate.getTime())) return fail("Invalid delivery date", 422);

    const delivery = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirstOrThrow({ where: { id: input.saleId, branchId } });
      if (sale.status !== "COMPLETED") throw new Error("Only completed sales can be delivered");
      const open = await tx.delivery.count({ where: { saleId: sale.id, status: { notIn: ["CANCELLED"] } } });
      if (open > 0) throw new Error("This sale already has a delivery");

      const deliveryNo = await nextCode(tx, "delivery", "DL", branchId);
      return tx.delivery.create({
        data: {
          deliveryNo,
          branchId,
          saleId: sale.id,
          customerId: sale.customerId,
          address: input.address,
          phone: input.phone || null,
          driver: input.driver || null,
          vehicle: input.vehicle || null,
          deliveryDate,
          deliveryCharge: D(input.deliveryCharge),
          notes: input.notes || null,
        },
      });
    });

    return ok({ id: delivery.id, deliveryNo: delivery.deliveryNo }, 201);
  } catch (error) {
    return fail("Failed to schedule delivery", 400, `${error}`);
  }
}
