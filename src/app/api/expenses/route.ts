import { EntryDirection } from "@prisma/client";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { nextCode } from "@/lib/ids";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { createLedgerEntry } from "@/server/services/ledger";

const createExpenseSchema = z.object({
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  description: z.string().trim().max(500).optional(),
  vendor: z.string().trim().max(160).optional(),
});

export async function GET() {
  const auth = await requireApiAuth("expenses:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const items = await prisma.expense.findMany({
    where: { branchId: auth.user.branchId! },
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: 500,
  });
  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth("expenses:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;

  try {
    const input = createExpenseSchema.parse(await request.json());
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) return fail("Invalid expense date", 422);

    const expense = await prisma.$transaction(async (tx) => {
      const [category, account] = await Promise.all([
        tx.expenseCategory.findFirstOrThrow({ where: { id: input.categoryId, branchId } }),
        tx.paymentAccount.findFirstOrThrow({ where: { id: input.accountId, branchId } }),
      ]);
      const expenseNo = await nextCode(tx, "expense", "EXP", branchId);

      const created = await tx.expense.create({
        data: {
          expenseNo,
          branchId,
          categoryId: category.id,
          accountId: account.id,
          method: account.method,
          amount: D(input.amount),
          date,
          description: input.description || null,
          vendor: input.vendor || null,
          createdById: auth.user.id,
        },
      });

      await createLedgerEntry(tx, {
        branchId,
        createdById: auth.user.id,
        accountId: account.id,
        method: account.method,
        amount: D(input.amount),
        transactionType: "EXPENSE",
        direction: EntryDirection.CREDIT,
        expenseId: created.id,
        referenceNo: expenseNo,
        notes: input.description,
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId,
          action: "EXPENSE_CREATED",
          entity: "Expense",
          entityId: created.id,
          newValues: JSON.stringify({ expenseNo, amount: input.amount, category: category.name }),
        },
      });

      return created;
    });

    return ok(expense, 201);
  } catch (error) {
    return fail("Failed to record expense", 400, `${error}`);
  }
}
