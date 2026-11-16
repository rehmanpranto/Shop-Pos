import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  const auth = await requireApiAuth("deliveries:update");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { deliveryId } = await params;

  const parsed = z.object({ status: z.enum(["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]) }).safeParse(await request.json());
  if (!parsed.success) return fail("Invalid status", 422);

  const delivery = await prisma.delivery.findFirst({ where: { id: deliveryId, branchId: auth.user.branchId! } });
  if (!delivery) return fail("Delivery not found", 404);
  if (delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return fail("This delivery is already closed", 409);

  await prisma.delivery.update({ where: { id: delivery.id }, data: { status: parsed.data.status } });
  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      branchId: delivery.branchId,
      action: "DELIVERY_UPDATED",
      entity: "Delivery",
      entityId: delivery.id,
      newValues: JSON.stringify({ deliveryNo: delivery.deliveryNo, status: parsed.data.status }),
    },
  });
  return ok({ id: delivery.id, status: parsed.data.status });
}
