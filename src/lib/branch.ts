import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const BRANCH_COOKIE = "active-branch";

/**
 * The branch a request works in. Staff are fixed to their own branch; an admin may
 * switch to another active branch, remembered in a cookie.
 */
export async function resolveBranchId(user: { role: string; branchId: string | null }): Promise<string | null> {
  if (user.role === "ADMIN") {
    const chosen = (await cookies()).get(BRANCH_COOKIE)?.value;
    if (chosen && chosen !== user.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: chosen, isActive: true }, select: { id: true } });
      if (branch) return branch.id;
    }
  }
  if (user.branchId) return user.branchId;
  const fallback = await prisma.branch.findFirst({ where: { isDefault: true }, select: { id: true } });
  return fallback?.id ?? null;
}
