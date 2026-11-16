import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return fail(auth.message, auth.status);

  const parsed = passwordSchema.safeParse(await request.json());
  if (!parsed.success) return fail("New password must be at least 8 characters", 422);

  const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!user) return fail("Account not found", 404);

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return fail("Current password is not correct", 400);
  if (parsed.data.currentPassword === parsed.data.newPassword) return fail("Choose a password different from the current one", 400);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
  await prisma.auditLog.create({
    data: { userId: user.id, branchId: user.branchId, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id },
  });

  return ok({ message: "Password changed" });
}
