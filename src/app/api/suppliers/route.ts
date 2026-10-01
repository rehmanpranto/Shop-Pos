import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { z } from "zod";

const schema = z.object({
  supplierCode: z.string(),
  name: z.string(),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  taxInfo: z.string().optional(),
  bankInfo: z.string().optional(),
  openingBalance: z.number().default(0),
  creditLimit: z.number().default(0),
  paymentTerms: z.string().optional(),
});

export async function GET() {
  const auth = await requireApiAuth("suppliers:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.supplier.findMany({
    where: { branchId: auth.user.branchId! },
    orderBy: { createdAt: "desc" },
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("suppliers:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  try {
    const payload = schema.parse(await request.json());
    const item = await prisma.supplier.create({
      data: {
        ...payload,
        branchId: auth.user.branchId!,
      },
    });
    return ok(item, 201);
  } catch (error) {
    return fail("Failed to create supplier", 400, `${error}`);
  }
}
