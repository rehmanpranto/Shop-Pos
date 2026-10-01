import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["MANAGER", "CASHIER", "INVENTORY", "ACCOUNTANT"]),
});

export async function GET() {
  const auth = await requireApiAuth("users:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const users = await prisma.user.findMany({
    where: { branchId: auth.user.branchId ?? undefined },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return ok(users);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("users:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const input = createUserSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role as UserRole,
        branchId: auth.user.branchId,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return ok(user, 201);
  } catch (error) {
    return fail("Failed to create user", 400, `${error}`);
  }
}
