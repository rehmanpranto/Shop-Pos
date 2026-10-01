import { SalesStatus, MovementType, InventoryReason } from "@prisma/client";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { recordInventoryMovement } from "@/server/services/inventory";
import { fail, ok } from "@/lib/response";

export async function DELETE(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const auth = await requireApiAuth("sales:delete");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { saleId } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, branchId: auth.user.branchId! },
        include: { items: true },
      });
      if (!sale) throw new Error("SALE_NOT_FOUND");
      if (sale.status === SalesStatus.CANCELLED) throw new Error("SALE_ALREADY_CANCELLED");

      for (const item of sale.items) {
        await recordInventoryMovement(tx, {
          branchId: sale.branchId,
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          movementType: MovementType.STOCK_RETURN,
          reason: InventoryReason.REVERSAL,
          referenceNo: sale.invoiceNo,
          referenceType: "SALE_CANCELLATION",
          userId: auth.user.id,
        });
      }

      if (sale.customerId && sale.dueAmount.greaterThan(0)) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstanding: { decrement: sale.dueAmount } },
        });
      }

      const cancelledSale = await tx.sale.update({
        where: { id: sale.id },
        data: { status: SalesStatus.CANCELLED },
        select: { id: true, invoiceNo: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId: sale.branchId,
          action: "SALE_CANCELLED",
          entity: "Sale",
          entityId: sale.id,
          oldValues: JSON.stringify({ status: sale.status }),
          newValues: JSON.stringify({ status: cancelledSale.status, invoiceNo: sale.invoiceNo }),
        },
      });

      return cancelledSale;
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SALE_NOT_FOUND") return fail("Sale not found", 404);
    if (error instanceof Error && error.message === "SALE_ALREADY_CANCELLED") return fail("Sale is already cancelled", 409);
    return fail("Failed to cancel sale", 400, `${error}`);
  }
}
