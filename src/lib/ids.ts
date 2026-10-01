import { prisma } from "@/lib/prisma";

function pad(n: number) {
  return `${n}`.padStart(6, "0");
}

export async function nextCode(entity: "sale" | "purchase" | "refund" | "expense" | "quotation" | "delivery", prefix: string, branchId: string) {
  const map = {
    sale: prisma.sale,
    purchase: prisma.purchase,
    refund: prisma.refund,
    expense: prisma.expense,
    quotation: prisma.quotation,
    delivery: prisma.delivery,
  } as const;

  const count = await (() => {
    switch (entity) {
      case "sale": return map.sale.count({ where: { branchId } });
      case "purchase": return map.purchase.count({ where: { branchId } });
      case "refund": return map.refund.count({ where: { branchId } });
      case "expense": return map.expense.count({ where: { branchId } });
      case "quotation": return map.quotation.count({ where: { branchId } });
      case "delivery": return map.delivery.count({ where: { branchId } });
    }
  })();
  return `${prefix}-${pad(count + 1)}`;
}
