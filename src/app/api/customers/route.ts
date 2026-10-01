import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { z } from "zod";

const schema = z.object({
  customerCode: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  customerType: z.string().optional(),
  priceLevel: z.string().default("RETAIL"),
  creditLimit: z.number().default(0),
  openingBalance: z.number().default(0),
});

export async function GET() {
  const auth = await requireApiAuth("customers:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.customer.findMany({
    where: { branchId: auth.user.branchId! },
    orderBy: { createdAt: "desc" },
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("customers:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const payload = schema.parse(await request.json());
    const item = await prisma.customer.create({
      data: {
        ...payload,
        branchId: auth.user.branchId!,
      },
    });
    return ok(item, 201);
  } catch (error) {
    return fail("Failed to create customer", 400, `${error}`);
  }
}
