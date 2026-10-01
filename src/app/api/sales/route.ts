import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { createSaleSchema } from "@/lib/validation";
import { createSale } from "@/server/services/sales";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiAuth("sales:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.sale.findMany({
    where: { branchId: auth.user.branchId! },
    include: {
      customer: true,
      items: { include: { product: true, unit: true } },
      payments: true,
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("sales:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const payload = createSaleSchema.parse(await request.json());
    const sale = await createSale({
      ...payload,
      branchId: auth.user.branchId!,
      userId: auth.user.id,
    });

    return ok(sale, 201);
  } catch (error) {
    return fail("Failed to create sale", 400, `${error}`);
  }
}
