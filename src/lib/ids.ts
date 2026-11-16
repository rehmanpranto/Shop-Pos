import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

type Entity = "sale" | "purchase" | "refund" | "expense" | "quotation" | "delivery";

function existingCount(tx: Prisma.TransactionClient, entity: Entity, branchId: string) {
  switch (entity) {
    case "sale": return tx.sale.count({ where: { branchId } });
    case "purchase": return tx.purchase.count({ where: { branchId } });
    case "refund": return tx.refund.count({ where: { branchId } });
    case "expense": return tx.expense.count({ where: { branchId } });
    case "quotation": return tx.quotation.count({ where: { branchId } });
    case "delivery": return tx.delivery.count({ where: { branchId } });
  }
}

/**
 * Next document number for a branch, e.g. "INV-000042".
 * The counter row is incremented atomically inside the caller's transaction, so two
 * sales saved at the same moment can never receive the same number.
 */
export async function nextCode(tx: Prisma.TransactionClient, entity: Entity, prefix: string, branchId: string) {
  // Only used the first time a counter is created, to continue from documents that already exist.
  const start = (await existingCount(tx, entity, branchId)) + 1;
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "DocumentCounter" ("id", "branchId", "entity", "value")
    VALUES (${randomUUID()}, ${branchId}, ${entity}, ${start})
    ON CONFLICT ("branchId", "entity") DO UPDATE SET "value" = "DocumentCounter"."value" + 1
    RETURNING "value"`;
  return `${prefix}-${String(rows[0].value).padStart(6, "0")}`;
}
