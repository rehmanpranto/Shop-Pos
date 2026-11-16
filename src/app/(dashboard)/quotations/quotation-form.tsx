"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select, inputClass } from "@/components/ui/field";
import { FormModal, number, optionalText } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

type Customer = { id: string; name: string; priceLevel: string };
export type QuotationProduct = {
  id: string;
  name: string;
  sku: string;
  retailPrice: number;
  wholesalePrice: number;
  units: Array<{ id: string; code: string; factor: number }>;
};
type Line = { key: number; productId: string; unitId: string; qty: string; unitPrice: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const emptyLine = (key: number): Line => ({ key, productId: "", unitId: "", qty: "", unitPrice: "" });

export function QuotationForm({ customers, products }: { customers: Customer[]; products: QuotationProduct[] }) {
  const tr = useTr();
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(0)]);
  const [nextKey, setNextKey] = useState(1);
  const wholesale = customers.find((c) => c.id === customerId)?.priceLevel === "WHOLESALE";

  const priceOf = (product: QuotationProduct, unitId: string, isWholesale: boolean) => {
    const factor = product.units.find((u) => u.id === unitId)?.factor ?? 1;
    return round2((isWholesale ? product.wholesalePrice : product.retailPrice) * factor);
  };
  const update = (key: number, patch: Partial<Line>) => setLines((old) => old.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0), 0);

  async function submit(form: FormData) {
    const filled = lines.filter((line) => line.productId);
    if (filled.length === 0) return tr("Add at least one product.");
    if (filled.some((line) => !(Number(line.qty) > 0) || !(Number(line.unitPrice) > 0))) return tr("Every line needs a quantity and a price above zero.");
    const discountAmount = number(form, "discount");
    if (discountAmount > subtotal) return tr("Discount is more than the total.");

    const result = await sendJson("/api/quotations", {
      customerId: customerId || undefined,
      validUntil: optionalText(form, "validUntil"),
      notes: optionalText(form, "notes"),
      discountAmount,
      items: filled.map((line) => ({ productId: line.productId, unitId: line.unitId, qty: Number(line.qty), unitPrice: Number(line.unitPrice) })),
    });
    if (result.ok) {
      setLines([emptyLine(nextKey)]);
      setNextKey(nextKey + 1);
      setCustomerId("");
    }
    return result;
  }

  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />{tr("New quotation")}</>
      }
      title={tr("New quotation")}
      description={tr("A price offer for a customer. Stock does not change until you turn it into a sale.")}
      submitLabel={tr("Save quotation")}
      successMessage={tr("Quotation saved")}
      size="lg"
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Customer (optional)")}>
          <Select
            value={customerId}
            onChange={(event) => {
              const id = event.target.value;
              const isWholesale = customers.find((c) => c.id === id)?.priceLevel === "WHOLESALE";
              setCustomerId(id);
              setLines((old) =>
                old.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  return product ? { ...line, unitPrice: String(priceOf(product, line.unitId, isWholesale)) } : line;
                }),
              );
            }}
          >
            <option value="">{tr("No customer")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.priceLevel === "WHOLESALE" ? tr(" (wholesale)") : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Valid until (optional)")}>
          <Input name="validUntil" type="date" />
        </Field>
      </div>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-zinc-500">{tr("Items")}</p>
      <div className="space-y-2">
        {lines.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          return (
            <div key={line.key} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-zinc-200 p-2 sm:grid-cols-[minmax(0,1fr)_90px_90px_120px_110px_auto] sm:border-0 sm:p-0">
              <select
                aria-label={tr("Product")}
                value={line.productId}
                onChange={(event) => {
                  const picked = products.find((p) => p.id === event.target.value);
                  update(line.key, { productId: event.target.value, unitId: picked?.units[0].id ?? "", unitPrice: picked ? String(priceOf(picked, picked.units[0].id, wholesale)) : "" });
                }}
                className={`${inputClass} col-span-2 sm:col-span-1`}
              >
                <option value="">{tr("Choose a product")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              <input type="number" min="0" step="any" placeholder={tr("Qty")} aria-label={tr("Quantity")} value={line.qty} onChange={(event) => update(line.key, { qty: event.target.value })} className={`${inputClass} tabular text-right`} />
              <select
                aria-label={tr("Unit")}
                value={line.unitId}
                disabled={!product}
                onChange={(event) => update(line.key, { unitId: event.target.value, unitPrice: product ? String(priceOf(product, event.target.value, wholesale)) : line.unitPrice })}
                className={inputClass}
              >
                {(product?.units ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={tr("Price each")}
                aria-label={tr("Price each")}
                value={line.unitPrice}
                onChange={(event) => update(line.key, { unitPrice: event.target.value })}
                className={`${inputClass} tabular text-right`}
              />
              <p className="tabular flex h-10 items-center justify-end text-sm font-semibold text-zinc-900">{formatMoney((Number(line.qty) || 0) * (Number(line.unitPrice) || 0))}</p>
              <button
                type="button"
                aria-label={tr("Remove line")}
                disabled={lines.length === 1}
                onClick={() => setLines((old) => old.filter((l) => l.key !== line.key))}
                className="flex h-10 w-10 items-center justify-center justify-self-end rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          setLines((old) => [...old, emptyLine(nextKey)]);
          setNextKey(nextKey + 1);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        <Plus className="h-4 w-4" />{tr("Add another item")}</button>

      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-zinc-50 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-700">{tr("Subtotal")}</span>
        <span className="tabular text-xl font-black text-zinc-900">{formatMoney(subtotal)}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={tr("Discount (৳)")}>
          <Input name="discount" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label={tr("Note for the customer (optional)")}>
          <Input name="notes" maxLength={500} placeholder={tr("e.g. Delivery within 3 days")} />
        </Field>
      </div>
    </FormModal>
  );
}
