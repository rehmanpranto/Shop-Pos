import { AlertTriangle, Boxes, Package, PackageX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatMoney, formatQty, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSearch } from "@/components/ui/table-search";
import { BarcodePrintButton } from "./barcode-print-button";
import { ProductForm } from "./product-form";
import { ProductImport, StockTransfer } from "./product-tools";
import { StockAdjust } from "./stock-adjust";

export default async function ProductsPage() {
  const { user, branchId } = await getSessionContext();
  const [products, units, categoryRows, suppliers, otherBranches] = branchId
    ? await Promise.all([
        prisma.product.findMany({
          where: { branchId },
          include: { baseUnit: true, category: true, unitConversions: { include: { fromUnit: { select: { code: true } } } } },
          orderBy: { name: "asc" },
        }),
        prisma.unit.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
        prisma.category.findMany({ where: { branchId }, orderBy: { name: "asc" }, select: { name: true } }),
        prisma.supplier.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.branch.findMany({ where: { isActive: true, id: { not: branchId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ])
    : [[], [], [], [], []];
  const categories = categoryRows.map((c) => c.name);
  const canTransfer = user?.role === "ADMIN" && otherBranches.length > 0;
  const addProduct = <ProductForm units={units} categories={categories} suppliers={suppliers} />;

  const rows = products.map((p) => {
    const stock = toNumber(p.stockQty);
    const state = !p.isActive ? "inactive" : stock <= 0 ? "out" : stock <= toNumber(p.minStock) ? "low" : "ok";
    return { p, stock, state };
  });
  const stockValue = rows.reduce((sum, { p, stock }) => sum + stock * toNumber(p.weightedAverageCost), 0);
  const count = (state: string) => rows.filter((row) => row.state === state).length;

  return (
    <div>
      <PageHeader title="Products" description="Your catalogue, prices and stock levels." actions={
          <>
            <ProductImport />
            {addProduct}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Products" value={`${products.length}`} icon={Package} />
        <StatCard label="Stock value" value={formatMoney(stockValue)} hint="At average cost" icon={Boxes} tone="neutral" />
        <StatCard label="Low stock" value={`${count("low")}`} icon={AlertTriangle} tone="amber" />
        <StatCard label="Out of stock" value={`${count("out")}`} icon={PackageX} tone="red" />
      </div>

      {products.length === 0 ? (
        <TableCard>
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product with its price and opening stock. It will show up in the POS straight away."
            action={addProduct}
          />
        </TableCard>
      ) : (
        <TableSearch
          placeholder="Search name, SKU or category"
          filters={[
            { label: "Low stock", value: "low" },
            { label: "Out of stock", value: "out" },
            { label: "Hidden", value: "inactive" },
          ]}
        >
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">In stock</th>
                  <th className="num">Cost</th>
                  <th className="num">Retail</th>
                  <th className="num">Wholesale</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, stock, state }) => (
                  <tr key={p.id} data-tags={state}>
                    <td>
                      <p className="font-semibold text-zinc-900">{p.name}</p>
                      <p className="text-xs text-zinc-500">
                        {p.sku}
                        {p.unitConversions.map((c) => ` · 1 ${c.fromUnit.code} = ${formatQty(c.factor)} ${p.baseUnit.code}`).join("")}
                      </p>
                    </td>
                    <td className="text-zinc-600">{p.category?.name ?? "-"}</td>
                    <td className="num">
                      <span className="font-semibold">
                        {formatQty(stock)} {p.baseUnit.code}
                      </span>{" "}
                      {state === "out" ? <Badge tone="red">Out</Badge> : state === "low" ? <Badge tone="amber">Low</Badge> : state === "inactive" ? <Badge>Hidden</Badge> : null}
                    </td>
                    <td className="num text-zinc-600">{formatMoney(p.weightedAverageCost)}</td>
                    <td className="num font-semibold">{formatMoney(p.retailPrice)}</td>
                    <td className="num text-zinc-600">{formatMoney(p.wholesalePrice)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <StockAdjust productId={p.id} name={p.name} stockQty={stock} unit={p.baseUnit.code} />
                        {canTransfer ? <StockTransfer productId={p.id} name={p.name} stockQty={stock} unit={p.baseUnit.code} branches={otherBranches} /> : null}
                        <ProductForm
                          units={units}
                          categories={categories}
                          suppliers={suppliers}
                          product={{
                            supplierId: p.supplierId ?? "",
                            baseUnitId: p.baseUnitId,
                            conversions: p.unitConversions.map((c) => ({ unitId: c.fromUnitId, factor: toNumber(c.factor) })),
                            id: p.id,
                            name: p.name,
                            sku: p.sku,
                            barcode: p.barcode ?? p.sku,
                            categoryName: p.category?.name ?? "",
                            purchasePrice: toNumber(p.purchasePrice),
                            retailPrice: toNumber(p.retailPrice),
                            wholesalePrice: toNumber(p.wholesalePrice),
                            minSellingPrice: toNumber(p.minSellingPrice),
                            minStock: toNumber(p.minStock),
                            isActive: p.isActive,
                          }}
                        />
                        <BarcodePrintButton name={p.name} sku={p.sku} barcode={p.barcode ?? p.sku} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
