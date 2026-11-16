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
