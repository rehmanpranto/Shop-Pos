import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { createRefundSchema } from "@/lib/validation";
import { createRefund } from "@/server/services/refunds";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiAuth("refunds:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.refund.findMany({
    where: { branchId: auth.user.branchId! },
    include: {
      sale: true,
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("refunds:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const payload = createRefundSchema.parse(await request.json());
    const refund = await createRefund({
      ...payload,
      branchId: auth.user.branchId!,
      userId: auth.user.id,
    });

    return ok(refund, 201);
  } catch (error) {
    return fail("Failed to create refund", 400, `${error}`);
  }
}
