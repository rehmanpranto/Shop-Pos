import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { fail, ok } from "@/lib/response";
import { receivePurchase } from "@/server/services/purchases";

const receiveSchema = z.object({
  items: z.array(z.object({ itemId: z.string().min(1), qty: z.number().positive() })).min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ purchaseId: string }> }) {
  const auth = await requireApiAuth("purchases:update");
  if (!auth.ok) return fail(auth.message, auth.status);
  const { purchaseId } = await params;

  try {
    const input = receiveSchema.parse(await request.json());
    const purchase = await receivePurchase({ branchId: auth.user.branchId!, userId: auth.user.id, purchaseId, items: input.items });
    return ok(purchase);
  } catch (error) {
    return fail("Failed to receive stock", 400, `${error}`);
  }
}
