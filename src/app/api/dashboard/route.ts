import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { fail, ok } from "@/lib/response";

export async function GET() {
  const auth = await requireApiAuth("dashboard:read");
  if (!auth.ok) return fail(auth.message, auth.status);

  const branchId = auth.user.branchId!;
  const dayStart = startOfDay(new Date());

  const [todaySales, todayRefunds, todayExpenses, products, todaySaleIds, totalOrders, deliveryCounts, newCustomers] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { branchId, saleDate: { gte: dayStart }, status: "COMPLETED" },
        _sum: { totalAmount: true, paidAmount: true, dueAmount: true, grossProfit: true },
        _count: { id: true },
      }),
      prisma.refund.aggregate({
        where: { branchId, refundDate: { gte: dayStart }, status: "COMPLETED" },
        _sum: { refundAmount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { branchId, date: { gte: dayStart } },
        _sum: { amount: true },
      }),
      prisma.product.findMany({
        where: { branchId },
        select: { stockQty: true, minStock: true },
      }),
      prisma.sale.findMany({
        where: { branchId, saleDate: { gte: dayStart }, status: "COMPLETED" },
        select: { id: true },
      }),
      prisma.sale.count({ where: { branchId, status: { not: "VOIDED" } } }),
      prisma.delivery.groupBy({ by: ["status"], where: { branchId }, _count: { id: true } }),
      prisma.customer.count({ where: { branchId, createdAt: { gte: subDays(dayStart, 30) } } }),
    ]);

  const topProducts =
    todaySaleIds.length > 0
      ? await prisma.saleItem.groupBy({
          by: ["productId"],
          where: { saleId: { in: todaySaleIds.map((sale) => sale.id) } },
          _sum: { qty: true, lineTotal: true },
          orderBy: { _sum: { qty: "desc" } },
          take: 10,
        })
      : [];

  const topProductDetails = await prisma.product.findMany({
    where: { branchId, id: { in: topProducts.map((t) => t.productId) } },
  });

  const top = topProducts.map((t) => ({
    ...t,
    product: topProductDetails.find((p) => p.id === t.productId),
  }));

  const paymentBreakdown = await prisma.payment.groupBy({
    by: ["method"],
    where: { branchId, createdAt: { gte: dayStart } },
    _sum: { amount: true },
  });

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => Number(p.stockQty) <= Number(p.minStock)).length;
  const outOfStockCount = products.filter((p) => Number(p.stockQty) <= 0).length;

  return ok({
    sales: todaySales,
    totalOrders,
    orderStatuses: Object.fromEntries(deliveryCounts.map((item) => [item.status, item._count.id])),
    newCustomers,
    refunds: todayRefunds,
    expenses: todayExpenses,
    inventory: {
      totalProducts,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    },
    paymentBreakdown,
    topProducts: top,
  });
}
