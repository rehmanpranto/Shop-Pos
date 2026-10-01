import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  userId?: string;
  branchId?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      branchId: input.branchId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      oldValues: input.oldValues ? JSON.stringify(input.oldValues) : null,
      newValues: input.newValues ? JSON.stringify(input.newValues) : null,
    },
  });
}
