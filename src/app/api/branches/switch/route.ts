import { cookies } from "next/headers";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { BRANCH_COOKIE } from "@/lib/branch";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

/** Lets an admin choose which branch they are working in. */
export async function POST(request: Request) {
  const auth = await requireApiAuth("branches:switch");
  if (!auth.ok) return fail(auth.message, auth.status);

  const parsed = z.object({ branchId: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return fail("Choose a branch", 422);

  const branch = await prisma.branch.findFirst({ where: { id: parsed.data.branchId, isActive: true }, select: { id: true, name: true } });
  if (!branch) return fail("Branch not found", 404);

  (await cookies()).set(BRANCH_COOKIE, branch.id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return ok(branch);
}
