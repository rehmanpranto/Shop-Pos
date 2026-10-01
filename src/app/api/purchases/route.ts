import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { createPurchaseSchema } from "@/lib/validation";
import { createPurchase } from "@/server/services/purchases";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiAuth("purchases:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.purchase.findMany({
    where: { branchId: auth.user.branchId! },
    include: { supplier: true, items: { include: { product: true, unit: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("purchases:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const payload = createPurchaseSchema.parse(await request.json());
    const purchase = await createPurchase({
      ...payload,
      branchId: auth.user.branchId!,
      userId: auth.user.id,
    });

    return ok(purchase, 201);
  } catch (error) {
    return fail("Failed to create purchase", 400, `${error}`);
  }
}
