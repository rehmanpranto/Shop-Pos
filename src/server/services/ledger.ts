import { EntryDirection, PaymentEntityType, PaymentMethod, Prisma } from "@prisma/client";

export async function createLedgerEntry(
  tx: Prisma.TransactionClient,
  input: {
    branchId: string;
    createdById: string;
    accountId: string;
    method: PaymentMethod;
    amount: Prisma.Decimal;
    transactionType: PaymentEntityType;
    direction: EntryDirection;
    saleId?: string;
    purchaseId?: string;
    refundId?: string;
    expenseId?: string;
    customerId?: string;
    supplierId?: string;
    referenceNo?: string;
    notes?: string;
  },
) {
  await tx.paymentLedger.create({
    data: input,
  });

  const account = await tx.paymentAccount.findFirstOrThrow({
    where: { id: input.accountId, branchId: input.branchId },
  });
  const newBalance =
    input.direction === EntryDirection.DEBIT
      ? account.currentBalance.add(input.amount)
      : account.currentBalance.sub(input.amount);

  await tx.paymentAccount.update({
    where: { id: account.id },
    data: { currentBalance: newBalance },
  });
}
