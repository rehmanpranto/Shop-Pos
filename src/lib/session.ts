import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveBranchId } from "@/lib/branch";

/** Current user plus the branch they are working in. */
export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;
  const branchId = user ? await resolveBranchId(user) : null;
  return { user, branchId };
}
