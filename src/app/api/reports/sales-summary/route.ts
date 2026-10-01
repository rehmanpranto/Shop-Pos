import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { fail, ok } from "@/lib/response";

export async function GET(request: Request) {
  const auth = await requireApiAuth("reports:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const fromDate = from ? startOfDay(new Date(from)) : startOfDay(new Date());
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());

  const where = {
    branchId: auth.user.branchId!,
    saleDate: { gte: fromDate, lte: toDate },
    status: "COMPLETED" as const,
  };

  const [sales, refunds, expenses, paymentByMethod] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: {
        subTotal: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        cogsAmount: true,
        grossProfit: true,
      },
      _count: { id: true },
    }),
    prisma.refund.aggregate({
      where: {
        branchId: auth.user.branchId!,
        refundDate: { gte: fromDate, lte: toDate },
        status: "COMPLETED",
      },
      _sum: { refundAmount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where: {
        branchId: auth.user.branchId!,
        date: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        branchId: auth.user.branchId!,
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
    }),
  ]);

  return ok({
    from: fromDate,
    to: toDate,
    sales,
    refunds,
    expenses,
    paymentByMethod,
  });
}
