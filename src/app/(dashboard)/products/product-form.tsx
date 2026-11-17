"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select, inputClass } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

type Unit = { id: string; name: string; code: string };
type Option = { id: string; name: string };
type ConversionRow = { key: number; unitId: string; factor: string };

export type EditableProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryName: string;
  supplierId: string;
  baseUnitId: string;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minSellingPrice: number;
  minStock: number;
  description?: string;
  brand?: string;
  manufacturerId?: string;
  taxRate?: number;
  imageUrl?: string;
  maxStock?: number;
  isActive: boolean;
  conversions: Array<{ unitId: string; factor: number }>;
};

export function ProductForm({ units, categories, suppliers, manufacturers, product }: { units: Unit[]; categories: string[]; suppliers: Option[]; manufacturers: Option[]; product?: EditableProduct }) {
  const tr = useTr();
  const editing = Boolean(product);
  const [baseUnitId, setBaseUnitId] = useState(product?.baseUnitId ?? "");
  const [rows, setRows] = useState<ConversionRow[]>(() => (product?.conversions ?? []).map((c, i) => ({ key: i, unitId: c.unitId, factor: String(c.factor) })));
  const [nextKey, setNextKey] = useState(product?.conversions.length ?? 0);
  const baseUnit = units.find((unit) => unit.id === baseUnitId);

  async function submit(form: FormData) {
    const prices = {
      purchasePrice: number(form, "purchasePrice"),
      retailPrice: number(form, "retailPrice"),
      wholesalePrice: number(form, "wholesalePrice") || number(form, "retailPrice"),
      minSellingPrice: number(form, "minSellingPrice") || number(form, "purchasePrice"),
    };
    if (prices.minSellingPrice > prices.retailPrice) return tr("Minimum price cannot be higher than the retail price.");

    const filled = rows.filter((row) => row.unitId);
    if (filled.some((row) => !(Number(row.factor) > 0))) return tr("Each extra unit needs a number above zero.");
    if (filled.some((row) => row.unitId === baseUnitId)) return tr("An extra unit cannot be the same as the main unit.");
    if (new Set(filled.map((row) => row.unitId)).size !== filled.length) return tr("The same extra unit is listed twice.");

    const shared = {
      name: text(form, "name"),
      barcode: optionalText(form, "barcode"),
      categoryName: optionalText(form, "categoryName"),
      supplierId: optionalText(form, "supplierId"),
      description: optionalText(form, "description"),
      brand: optionalText(form, "brand"),
      manufacturerId: optionalText(form, "manufacturerId"),
      taxRate: number(form, "taxRate"),
      imageUrl: optionalText(form, "imageUrl"),
      maxStock: number(form, "maxStock"),
      minStock: number(form, "minStock"),
      conversions: filled.map((row) => ({ unitId: row.unitId, factor: Number(row.factor) })),
      ...prices,
    };

    if (product) {
      return sendJson(`/api/products/${product.id}`, { ...shared, isActive: form.get("isActive") === "on" }, "PATCH");
    }
    const sku = text(form, "sku");
    return sendJson("/api/products", { ...shared, sku, productCode: sku, baseUnitId, stockQty: number(form, "stockQty") });
  }

  return (
    <FormModal
      trigger={
        editing ? (
          <>
            <Pencil className="h-3.5 w-3.5" />{tr("Edit")}</>
        ) : (
          <>
            <Plus className="h-4 w-4" />{tr("Add product")}</>
        )
      }
      triggerLook={editing ? { variant: "secondary", size: "sm" } : undefined}
      title={editing ? tr("Edit {0}", product!.name) : tr("Add product")}
      description={editing ? tr("Stock is changed with Adjust stock or a purchase, not here.") : undefined}
      submitLabel={editing ? tr("Save changes") : tr("Add product")}
      successMessage={editing ? tr("Product updated") : tr("Product added")}
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Product name")} className="sm:col-span-2">
          <Input name="name" required defaultValue={product?.name} placeholder={tr("e.g. Cement 50kg bag")} />
        </Field>
        {editing ? null : (
          <Field label={tr("SKU")} hint={tr("Your own short code. Must be unique.")}>
            <Input name="sku" required placeholder={tr("e.g. CEM-50")} />
          </Field>
        )}
        <Field label={tr("Barcode")} hint={tr("Leave blank to use the SKU.")}>
          <Input name="barcode" defaultValue={product?.barcode} />
        </Field>
        <Field label={tr("Category")} hint={tr("Pick one or type a new name.")}>
          <Input name="categoryName" list="product-categories" defaultValue={product?.categoryName} placeholder={tr("e.g. Sanitary")} />
          <datalist id="product-categories">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label={tr("Manufacturer")}>
          <Select name="manufacturerId" defaultValue={product?.manufacturerId ?? ""}>
            <option value="">{tr("None")}</option>
            {manufacturers.map((manufacturer) => <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.name}</option>)}
          </Select>
        </Field>
        <Field label={tr("Brand")}><Input name="brand" defaultValue={product?.brand} /></Field>
        <Field label={tr("Description")} className="sm:col-span-2"><Input name="description" defaultValue={product?.description} /></Field>
        <Field label={tr("Usual supplier (optional)")} hint={tr("Used for the reorder list.")}>
          <Select name="supplierId" defaultValue={product?.supplierId ?? ""}>
            <option value="">{tr("None")}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Stock is counted in")} hint={editing ? tr("Cannot be changed after the product is created.") : tr("The smallest unit you sell, e.g. piece.")}>
          <Select required disabled={editing} value={baseUnitId} onChange={(event) => setBaseUnitId(event.target.value)}>
            <option value="" disabled>{tr("Choose a unit")}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-zinc-500">{tr("Also sold or bought in")}</p>
      <p className="mb-2 text-xs text-zinc-500">{tr("For example a box of 12 pieces. Stock is always kept in the main unit, and prices scale automatically.")}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
            <span>1</span>
            <select
              aria-label={tr("Extra unit")}
              value={row.unitId}
              onChange={(event) => setRows((old) => old.map((r) => (r.key === row.key ? { ...r, unitId: event.target.value } : r)))}
              className={`${inputClass} w-40`}
            >
              <option value="">{tr("Choose a unit")}</option>
              {units
                .filter((unit) => unit.id !== baseUnitId)
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
            </select>
            <span>=</span>
            <input
              type="number"
              min="0"
              step="any"
              aria-label={tr("How many main units")}
              value={row.factor}
              onChange={(event) => setRows((old) => old.map((r) => (r.key === row.key ? { ...r, factor: event.target.value } : r)))}
              className={`${inputClass} tabular w-28 text-right`}
            />
            <span>{baseUnit?.code ?? tr("main units")}</span>
            <button
              type="button"
              aria-label={tr("Remove unit")}
              onClick={() => setRows((old) => old.filter((r) => r.key !== row.key))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {rows.length < 4 ? (
        <button
          type="button"
          onClick={() => {
            setRows((old) => [...old, { key: nextKey, unitId: "", factor: "" }]);
            setNextKey(nextKey + 1);
          }}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          <Plus className="h-4 w-4" />{tr("Add a unit")}</button>
      ) : null}

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-zinc-500">{tr("Prices per")}{" "}{baseUnit?.code ?? tr("main unit")} (৳)</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label={tr("Cost price")}>
          <Input name="purchasePrice" type="number" min="0.0001" step="any" required defaultValue={product?.purchasePrice} />
        </Field>
        <Field label={tr("Retail price")}>
          <Input name="retailPrice" type="number" min="0.0001" step="any" required defaultValue={product?.retailPrice} />
        </Field>
        <Field label={tr("Wholesale price")}>
          <Input name="wholesalePrice" type="number" min="0.0001" step="any" defaultValue={product?.wholesalePrice} placeholder={tr("Same as retail")} />
        </Field>
        <Field label={tr("Minimum price")}>
          <Input name="minSellingPrice" type="number" min="0.0001" step="any" defaultValue={product?.minSellingPrice} placeholder={tr("Same as cost")} />
        </Field>
      </div>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-zinc-500">{tr("Stock")}</p>
      <div className="grid grid-cols-2 gap-4">
        {editing ? null : (
          <Field label={tr("Opening stock")}>
            <Input name="stockQty" type="number" min="0" step="0.001" defaultValue="0" required />
          </Field>
        )}
        <Field label={tr("Warn me below")} hint={tr("Low-stock alert level.")}>
          <Input name="minStock" type="number" min="0" step="0.001" defaultValue={product?.minStock ?? 0} />
        </Field>
        <Field label={tr("Maximum stock")} hint={tr("Optional replenishment ceiling.")}>
          <Input name="maxStock" type="number" min="0" step="0.001" defaultValue={product?.maxStock ?? 0} />
        </Field>
        <Field label={tr("Tax rate (%)")}><Input name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue={product?.taxRate ?? 0} /></Field>
        <Field label={tr("Product image URL")} className="sm:col-span-2"><Input name="imageUrl" type="url" defaultValue={product?.imageUrl} /></Field>
      </div>

      {editing ? (
        <label className="mt-5 flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={product!.isActive} className="h-4 w-4 accent-[#154c79]" />{tr("Available for sale (untick to hide it from the POS)")}</label>
      ) : null}
    </FormModal>
  );
}
