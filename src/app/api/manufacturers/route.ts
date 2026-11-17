import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const manufacturerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export async function GET() {
  const auth = await requireApiAuth("products:read");
  if (!auth.ok) return fail(auth.message, auth.status);
  const items = await prisma.manufacturer.findMany({
    where: { branchId: auth.user.branchId! },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("products:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  try {
    const data = manufacturerSchema.parse(await request.json());
    const item = await prisma.manufacturer.create({ data: { ...data, branchId: auth.user.branchId! } });
    return ok(item, 201);
  } catch (error) {
    const duplicate = `${error}`.includes("Unique constraint");
    return fail(duplicate ? "A manufacturer with that name already exists" : "Failed to create manufacturer", 400, duplicate ? undefined : `${error}`);
  }
}
