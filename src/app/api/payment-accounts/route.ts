import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { fail, ok } from "@/lib/response";

export async function GET() {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.paymentAccount.findMany({
    where: { branchId: auth.user.branchId!, isActive: true },
    orderBy: { name: "asc" },
  });

  return ok(items);
}
