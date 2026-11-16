import { InventoryReason, MovementType } from "@prisma/client";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { recordInventoryMovement } from "@/server/services/inventory";

const transferSchema = z.object({
  productId: z.string().min(1),
  toBranchId: z.string().min(1),
  qty: z.number().positive(),
  note: z.string().trim().max(200).optional(),
});

/** Moves stock of one product from the current branch to another branch. */
export async function POST(request: Request) {
  const auth = await requireApiAuth("branches:transfer");
  if (!auth.ok) return fail(auth.message, auth.status);
  const fromBranchId = auth.user.branchId!;

  try {
    const input = transferSchema.parse(await request.json());
    if (input.toBranchId === fromBranchId) return fail("Choose a different branch to send stock to", 400);

    const result = await prisma.$transaction(async (tx) => {
      const [source, toBranch, fromBranch] = await Promise.all([
        tx.product.findFirstOrThrow({ where: { id: input.productId, branchId: fromBranchId }, include: { category: true, unitConversions: true } }),
        tx.branch.findFirstOrThrow({ where: { id: input.toBranchId, isActive: true } }),
        tx.branch.findUniqueOrThrow({ where: { id: fromBranchId } }),
      ]);
      const qty = D(input.qty);
      const referenceNo = `TRF-${Date.now().toString(36).toUpperCase()}`;
      const cost = D(source.weightedAverageCost).greaterThan(0) ? D(source.weightedAverageCost) : D(source.purchasePrice);

      // The same product in the other branch is matched by SKU, and created there the first time.
      let target = await tx.product.findFirst({ where: { branchId: toBranch.id, sku: source.sku } });
      if (!target) {
        const category = source.category
          ? await tx.category.upsert({
              where: { branchId_name: { branchId: toBranch.id, name: source.category.name } },
              create: { branchId: toBranch.id, name: source.category.name },
              update: {},
            })
          : null;
        target = await tx.product.create({
          data: {
            branchId: toBranch.id,
            productCode: source.productCode,
            sku: source.sku,
            barcode: source.barcode,
            name: source.name,
            description: source.description,
            categoryId: category?.id,
            brand: source.brand,
            baseUnitId: source.baseUnitId,
            purchasePrice: source.purchasePrice,
            retailPrice: source.retailPrice,
            wholesalePrice: source.wholesalePrice,
            minSellingPrice: source.minSellingPrice,
            minStock: source.minStock,
            taxRate: source.taxRate,
            weightedAverageCost: cost,
            unitConversions: { create: source.unitConversions.map((c) => ({ fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: c.factor })) },
          },
        });
      }

      await recordInventoryMovement(tx, {
        branchId: fromBranchId,
        productId: source.id,
        unitId: source.baseUnitId,
        qty,
        movementType: MovementType.STOCK_OUT,
        reason: InventoryReason.ADJUSTMENT,
        referenceNo,
        referenceType: "TRANSFER",
        userId: auth.user.id,
        note: `Sent to ${toBranch.name}${input.note ? `: ${input.note}` : ""}`,
      });
      const incoming = await recordInventoryMovement(tx, {
        branchId: toBranch.id,
        productId: target.id,
        unitId: target.baseUnitId,
        qty,
        movementType: MovementType.STOCK_IN,
        reason: InventoryReason.ADJUSTMENT,
        referenceNo,
        referenceType: "TRANSFER",
        userId: auth.user.id,
        note: `Received from ${fromBranch.name}${input.note ? `: ${input.note}` : ""}`,
      });

      // Blend the incoming cost into the receiving branch's average cost.
      const oldQty = incoming.previousStock.greaterThan(0) ? incoming.previousStock : D(0);
      const oldCost = D(target.weightedAverageCost).greaterThan(0) ? D(target.weightedAverageCost) : cost;
      await tx.product.update({
        where: { id: target.id },
        data: { weightedAverageCost: oldQty.mul(oldCost).add(qty.mul(cost)).div(oldQty.add(qty)) },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId: fromBranchId,
          action: "STOCK_TRANSFERRED",
          entity: "Product",
          entityId: source.id,
          newValues: JSON.stringify({ product: source.name, qty: input.qty, to: toBranch.name, referenceNo }),
        },
      });
      return { referenceNo, product: source.name, to: toBranch.name };
    });

    return ok(result, 201);
  } catch (error) {
    return fail("Failed to transfer stock", 400, `${error}`);
  }
}
