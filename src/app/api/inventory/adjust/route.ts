import { InventoryReason, MovementType } from "@prisma/client";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { recordInventoryMovement } from "@/server/services/inventory";

const REASONS = {
  MANUAL_ADD: MovementType.STOCK_IN,
  ADJUSTMENT_IN: MovementType.STOCK_IN,
  ADJUSTMENT_OUT: MovementType.STOCK_OUT,
  DAMAGE: MovementType.STOCK_OUT,
  INTERNAL_USAGE: MovementType.STOCK_OUT,
} as const;

const adjustSchema = z.object({
  productId: z.string().min(1),
  reason: z.enum(["MANUAL_ADD", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "INTERNAL_USAGE"]),
  qty: z.number().positive(),
  note: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth("inventory:update");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  try {
    const input = adjustSchema.parse(await request.json());
    const reason: InventoryReason =
      input.reason === "ADJUSTMENT_IN" || input.reason === "ADJUSTMENT_OUT" ? InventoryReason.ADJUSTMENT : InventoryReason[input.reason];

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirstOrThrow({ where: { id: input.productId, branchId } });
      const referenceNo = `ADJ-${Date.now().toString(36).toUpperCase()}`;

      await recordInventoryMovement(tx, {
        branchId,
        productId: existing.id,
        unitId: existing.baseUnitId,
        qty: D(input.qty),
        movementType: REASONS[input.reason],
        reason,
        referenceNo,
        referenceType: "ADJUSTMENT",
        userId: auth.user.id,
        note: input.note,
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId,
          action: "STOCK_ADJUSTED",
          entity: "Product",
          entityId: existing.id,
          oldValues: JSON.stringify({ stockQty: existing.stockQty.toString() }),
          newValues: JSON.stringify({ reason: input.reason, qty: input.qty, referenceNo }),
        },
      });

      return tx.product.findUniqueOrThrow({ where: { id: existing.id }, select: { id: true, name: true, stockQty: true } });
    });

    return ok(product);
  } catch (error) {
    return fail("Failed to adjust stock", 400, `${error}`);
  }
}
