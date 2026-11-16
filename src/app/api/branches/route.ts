import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

const branchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only")
    .transform((value) => value.toUpperCase()),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
});

const DEFAULT_ACCOUNTS = [
  ["Cash", "CASH"],
  ["Bank - Account 1", "BANK_TRANSFER"],
  ["Card", "CARD"],
  ["bKash", "MOBILE_FINANCIAL_SERVICE"],
  ["Nagad", "MOBILE_FINANCIAL_SERVICE"],
  ["Check", "CHECK"],
] as const;

const DEFAULT_EXPENSE_CATEGORIES = ["Electricity", "Rent", "Salary", "Transportation", "Delivery", "Maintenance", "Office", "Marketing", "Miscellaneous"];

export async function POST(request: Request) {
  const auth = await requireApiAuth("branches:create");
  if (!auth.ok) return fail(auth.message, auth.status);

  const parsed = branchSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the branch details", 422);

  try {
    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: { name: parsed.data.name, code: parsed.data.code, address: parsed.data.address || null, phone: parsed.data.phone || null },
      });
      // A new branch starts with its own tills and expense categories.
      await tx.paymentAccount.createMany({ data: DEFAULT_ACCOUNTS.map(([name, method]) => ({ branchId: created.id, name, method })) });
      await tx.expenseCategory.createMany({ data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ branchId: created.id, name })) });
      await tx.auditLog.create({
        data: { userId: auth.user.id, branchId: created.id, action: "BRANCH_CREATED", entity: "Branch", entityId: created.id, newValues: JSON.stringify(parsed.data) },
      });
      return created;
    });
    return ok({ id: branch.id, name: branch.name }, 201);
  } catch (error) {
    const duplicate = `${error}`.includes("Unique constraint");
    return fail(duplicate ? "Another branch already uses that code" : "Failed to create branch", 400);
  }
}
