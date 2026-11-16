import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { requireApiAuth } from "@/lib/api-auth";
import { z } from "zod";

const schema = z.object({
  supplierCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
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
    const branchId = auth.user.branchId!;
    const existing = await prisma.supplier.findUnique({
      where: {
        branchId_supplierCode: {
          branchId,
          supplierCode: payload.supplierCode,
        },
      },
    });

    let created = false;
    let item = existing;

    if (!item) {
      try {
        item = await prisma.supplier.create({
          data: {
            ...payload,
            branchId,
          },
        });
        created = true;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }

        item = await prisma.supplier.findUnique({
          where: {
            branchId_supplierCode: {
              branchId,
              supplierCode: payload.supplierCode,
            },
          },
        });

        if (!item) throw error;
      }
    }

    return ok(item, created ? 201 : 200);
  } catch (error) {
    return fail("Failed to create supplier", 400, `${error}`);
  }
}
