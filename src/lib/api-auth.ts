import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function requireApiAuth(permission?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  if (permission && !can(session.user.role, permission)) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, user: session.user };
}
