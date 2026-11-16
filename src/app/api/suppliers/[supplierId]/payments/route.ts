import { EntryDirection } from "@prisma/client";
import { z } from "zod";
import { requireApiAuth } from "@/lib/api-auth";
import { D } from "@/lib/numbers";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";
import { createLedgerEntry } from "@/server/services/ledger";

const paymentSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().trim().max(300).optional(),
});

/** Pays a supplier against what is owed, oldest unpaid purchase first. */
export async function POST(request: Request, { params }: { params: Promise<{ supplierId: string }> }) {
  const auth = await requireApiAuth("payments:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;
  const { supplierId } = await params;

  try {
    const input = paymentSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const [supplier, account] = await Promise.all([
        tx.supplier.findFirstOrThrow({ where: { id: supplierId, branchId } }),
        tx.paymentAccount.findFirstOrThrow({ where: { id: input.accountId, branchId } }),
      ]);
      const unpaid = await tx.purchase.findMany({
        where: { branchId, supplierId, status: { not: "CANCELLED" }, dueAmount: { gt: 0 } },
        orderBy: { purchaseDate: "asc" },
      });
      const owed = unpaid.reduce((sum, purchase) => sum.add(purchase.dueAmount), D(0));
      const amount = D(input.amount);
      if (amount.greaterThan(owed)) throw new Error(`You only owe ${supplier.name} ${owed.toFixed(2)}`);

      let remaining = amount;
      for (const purchase of unpaid) {
        if (remaining.lessThanOrEqualTo(0)) break;
        const applied = remaining.greaterThan(purchase.dueAmount) ? D(purchase.dueAmount) : remaining;
        await tx.purchase.update({ where: { id: purchase.id }, data: { paidAmount: { increment: applied }, dueAmount: { decrement: applied } } });
        await tx.payment.create({
          data: { branchId, purchaseId: purchase.id, supplierId, accountId: account.id, method: account.method, amount: applied, notes: input.notes ?? "Supplier payment" },
        });
        remaining = remaining.sub(applied);
      }

      await createLedgerEntry(tx, {
        branchId,
        createdById: auth.user.id,
        accountId: account.id,
        method: account.method,
        amount,
        transactionType: "SUPPLIER_PAYMENT",
        direction: EntryDirection.CREDIT,
        supplierId,
        notes: input.notes,
      });
      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId,
          action: "SUPPLIER_PAID",
          entity: "Supplier",
          entityId: supplierId,
          newValues: JSON.stringify({ supplier: supplier.name, amount: input.amount, account: account.name }),
        },
      });
      return { owed: owed.sub(amount).toString() };
    });

    return ok(result, 201);
  } catch (error) {
    return fail("Failed to record payment", 400, `${error}`);
  }
}
