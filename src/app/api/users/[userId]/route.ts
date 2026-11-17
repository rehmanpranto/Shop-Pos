import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER", "INVENTORY", "ACCOUNTANT"]),
  branchId: z.string().min(1),
  isActive: z.boolean(),
  newPassword: z.string().min(8).max(200).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireApiAuth("users:update");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { userId } = await params;

  const parsed = updateUserSchema.safeParse(await request.json());
  if (!parsed.success) return fail("Check the user details. A new password needs at least 8 characters.", 422);
  const input = parsed.data;

  const [target, branch] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.branch.findFirst({ where: { id: input.branchId, isActive: true }, select: { id: true } }),
  ]);
  if (!target) return fail("User not found", 404);
  if (!branch) return fail("Branch not found", 404);

  // Never let the last working admin be removed, and never let an admin lock themselves out.
  const losingAdmin = target.role === "ADMIN" && target.isActive && (input.role !== "ADMIN" || !input.isActive);
  if (losingAdmin) {
    if (target.id === auth.user.id) return fail("You cannot remove your own admin access", 400);
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: target.id } } });
    if (otherAdmins === 0) return fail("There must be at least one active admin", 400);
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      name: input.name,
      role: input.role,
      branchId: input.branchId,
      isActive: input.isActive,
      ...(input.newPassword ? { passwordHash: await bcrypt.hash(input.newPassword, 12) } : {}),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      branchId: auth.user.branchId,
      action: input.newPassword ? "USER_PASSWORD_RESET" : "USER_UPDATED",
      entity: "User",
      entityId: target.id,
      oldValues: JSON.stringify({ role: target.role, isActive: target.isActive }),
      newValues: JSON.stringify({ user: target.email, role: input.role, isActive: input.isActive }),
    },
  });

  return ok({ id: target.id });
}

/**
 * Deletes someone who has left the business. A user with no sales, purchases or other
 * records is erased completely. A user who has records cannot be erased (the database
 * keeps who made each sale), so they are removed from the Users list for good, can never
 * sign in again, and their email is freed so it can be used for a new account.
 */
export async function DELETE(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireApiAuth("users:delete");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          sales: true,
          purchases: true,
          refunds: true,
          paymentLedgers: true,
          expenses: true,
          quotations: true,
          dailyClosings: true,
          inventoryTransactions: true,
        },
      },
    },
  });
  if (!target || target.deletedAt) return fail("User not found", 404);
  if (target.id === auth.user.id) return fail("You cannot delete your own account", 400);
  if (target.role === "ADMIN" && target.isActive) {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, deletedAt: null, id: { not: target.id } } });
    if (otherAdmins === 0) return fail("There must be at least one active admin", 400);
  }

  const hasRecords = Object.values(target._count).some((count) => count > 0);
  const auditEntry = prisma.auditLog.create({
    data: {
      userId: auth.user.id,
      branchId: auth.user.branchId,
      action: "USER_DELETED",
      entity: "User",
      entityId: target.id,
      oldValues: JSON.stringify({ name: target.name, email: target.email, role: target.role, isActive: target.isActive }),
      newValues: JSON.stringify({ deleted: true, keptForHistory: hasRecords }),
    },
  });

  if (hasRecords) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: { isActive: false, deletedAt: new Date(), email: `${target.email}.deleted-${Date.now()}` },
      }),
      prisma.session.deleteMany({ where: { userId: target.id } }),
      auditEntry,
    ]);
  } else {
    // Sessions and sign-in accounts cascade; their audit log entries keep the event but lose the name link.
    await prisma.$transaction([prisma.user.delete({ where: { id: target.id } }), auditEntry]);
  }

  return ok({ id: target.id });
}
