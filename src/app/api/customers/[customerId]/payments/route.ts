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

/** Records money received from a customer against what they owe, oldest unpaid invoice first. */
export async function POST(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireApiAuth("sales:create");
  if (!auth.ok) return fail(auth.message, auth.status);
  const branchId = auth.user.branchId!;
  const { customerId } = await params;

  try {
    const input = paymentSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const [customer, account] = await Promise.all([
        tx.customer.findFirstOrThrow({ where: { id: customerId, branchId } }),
        tx.paymentAccount.findFirstOrThrow({ where: { id: input.accountId, branchId } }),
      ]);

      const amount = D(input.amount);
      if (amount.greaterThan(customer.outstanding)) {
        throw new Error(`${customer.name} only owes ${customer.outstanding.toFixed(2)}`);
      }

      const unpaidSales = await tx.sale.findMany({
        where: { branchId, customerId, status: "COMPLETED", dueAmount: { gt: 0 } },
        orderBy: { saleDate: "asc" },
      });

      let remaining = amount;
      for (const sale of unpaidSales) {
        if (remaining.lessThanOrEqualTo(0)) break;
        const applied = remaining.greaterThan(sale.dueAmount) ? D(sale.dueAmount) : remaining;
        await tx.sale.update({
          where: { id: sale.id },
          data: { paidAmount: { increment: applied }, dueAmount: { decrement: applied } },
        });
        await tx.payment.create({
          data: { branchId, saleId: sale.id, customerId, accountId: account.id, method: account.method, amount: applied, notes: input.notes ?? "Due collection" },
        });
        remaining = remaining.sub(applied);
      }

      if (remaining.greaterThan(0)) {
        await tx.payment.create({
          data: { branchId, customerId, accountId: account.id, method: account.method, amount: remaining, notes: input.notes ?? "Due collection" },
        });
      }

      await createLedgerEntry(tx, {
        branchId,
        createdById: auth.user.id,
        accountId: account.id,
        method: account.method,
        amount,
        transactionType: "CUSTOMER_PAYMENT",
        direction: EntryDirection.DEBIT,
        customerId,
        notes: input.notes,
      });

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { outstanding: { decrement: amount } },
        select: { id: true, name: true, outstanding: true },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          branchId,
          action: "CUSTOMER_PAYMENT_RECEIVED",
          entity: "Customer",
          entityId: customerId,
          newValues: JSON.stringify({ amount: input.amount, account: account.name }),
        },
      });

      return updated;
    });

    return ok(result, 201);
  } catch (error) {
    return fail("Failed to record payment", 400, `${error}`);
  }
}
