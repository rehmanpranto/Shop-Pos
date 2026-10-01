import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { ProductCreateForm } from "./product-create-form";
import { BarcodePrintButton } from "./barcode-print-button";

export default async function ProductsPage() {
  const branch = await prisma.branch.findFirst({ where: { isDefault: true } });
  const [products, units] = branch
    ? await Promise.all([
        prisma.product.findMany({
        where: { branchId: branch.id },
        include: { baseUnit: true, supplier: true, category: true },
        orderBy: { createdAt: "desc" },
        }),
        prisma.unit.findMany({ orderBy: { name: "asc" } }),
      ])
    : [[], []];

  return (
    <Card>
      <h2 className="text-lg font-bold">Products</h2>
      <ProductCreateForm units={units} />
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Barcode</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Retail</th>
              <th className="px-3 py-2">Wholesale</th>
              <th className="px-3 py-2">Label</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2">
                  <Image src={`/api/products/barcode?value=${encodeURIComponent(p.barcode ?? p.sku)}`} alt={`Barcode for ${p.name}`} width={128} height={48} unoptimized className="h-12 w-32 object-contain" />
                </td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.category?.name ?? "-"}</td>
                <td className="px-3 py-2">{p.baseUnit.name}</td>
                <td className="px-3 py-2">{Number(p.stockQty)}</td>
                <td className="px-3 py-2">৳{Number(p.retailPrice).toFixed(2)}</td>
                <td className="px-3 py-2">৳{Number(p.wholesalePrice).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <BarcodePrintButton name={p.name} sku={p.sku} barcode={p.barcode ?? p.sku} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
