"use client";

import { ReactNode, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select, inputClass } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

type Option = { id: string; name: string };
export type PurchaseProduct = {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  /** Units it can be bought in. The base unit is first, with factor 1. */
  units: Array<{ id: string; code: string; factor: number }>;
};
type Line = { key: number; productId: string; unitId: string; qty: string; unitCost: string };
export type PurchaseDefaults = { supplierId?: string; status?: "RECEIVED" | "ORDERED"; lines?: Array<{ productId: string; qty: number }> };

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function PurchaseForm({
  suppliers,
  products,
  accounts,
  defaults,
  trigger,
  secondary,
}: {
  suppliers: Option[];
  products: PurchaseProduct[];
  accounts: Array<Option & { method: string }>;
  defaults?: PurchaseDefaults;
  trigger?: ReactNode;
  secondary?: boolean;
}) {
  const tr = useTr();
  const startingLines = (): Line[] => {
    const preset = (defaults?.lines ?? []).flatMap((line, index) => {
      const product = products.find((p) => p.id === line.productId);
      return product ? [{ key: index, productId: product.id, unitId: product.units[0].id, qty: String(line.qty), unitCost: String(product.purchasePrice) }] : [];
    });
    return preset.length > 0 ? preset : [{ key: 0, productId: "", unitId: "", qty: "", unitCost: "" }];
  };
  const [lines, setLines] = useState<Line[]>(startingLines);
  const [nextKey, setNextKey] = useState(() => (defaults?.lines?.length ?? 0) + 1);

  const total = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitCost) || 0), 0);
  const update = (key: number, patch: Partial<Line>) => setLines((old) => old.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  async function submit(form: FormData) {
    const filled = lines.filter((line) => line.productId);
    if (filled.length === 0) return tr("Add at least one product.");
    if (filled.some((line) => !(Number(line.qty) > 0) || !(Number(line.unitCost) > 0))) return tr("Every line needs a quantity and a cost above zero.");
    if (new Set(filled.map((line) => line.productId)).size !== filled.length) return tr("The same product is listed twice. Combine it into one line.");

    const paid = number(form, "paid");
    if (paid > total) return tr("Paid amount is more than the purchase total.");
    const account = accounts.find((a) => a.id === text(form, "accountId"));
    if (paid > 0 && !account) return tr("Choose the account you paid from.");

    const result = await sendJson("/api/purchases", {
      supplierId: text(form, "supplierId"),
      supplierInvoiceNo: optionalText(form, "supplierInvoiceNo"),
      status: text(form, "status"),
      notes: optionalText(form, "notes"),
      items: filled.map((line) => ({ productId: line.productId, unitId: line.unitId, qty: Number(line.qty), unitCost: Number(line.unitCost), discountAmount: 0, taxAmount: 0 })),
      payments: paid > 0 && account ? [{ accountId: account.id, method: account.method, amount: paid }] : [],
    });
    if (result.ok) {
      setLines([{ key: nextKey, productId: "", unitId: "", qty: "", unitCost: "" }]);
      setNextKey(nextKey + 1);
    }
    return result;
  }

  return (
    <FormModal
      trigger={
        trigger ?? (
          <>
            <Plus className="h-4 w-4" />{tr("New purchase")}</>
        )
      }
      triggerLook={secondary ? { variant: "secondary" } : undefined}
      title={tr("New purchase")}
      description={tr("Record stock bought from a supplier. Received items are added to stock and update the average cost.")}
      submitLabel={tr("Save purchase")}
      successMessage={tr("Purchase saved")}
      size="lg"
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tr("Supplier")}>
          <Select name="supplierId" required defaultValue={defaults?.supplierId ?? ""}>
            <option value="" disabled>{tr("Choose a supplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Supplier's invoice no. (optional)")}>
          <Input name="supplierInvoiceNo" />
        </Field>
        <Field label={tr("Stock")}>
          <Select name="status" defaultValue={defaults?.status ?? "RECEIVED"}>
            <option value="RECEIVED">{tr("Received, add to stock now")}</option>
            <option value="ORDERED">{tr("Ordered, not received yet")}</option>
          </Select>
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
                  update(line.key, { productId: event.target.value, unitId: picked?.units[0].id ?? "", unitCost: picked ? String(picked.purchasePrice) : "" });
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
                onChange={(event) => {
                  const unit = product?.units.find((u) => u.id === event.target.value);
                  update(line.key, { unitId: event.target.value, unitCost: product && unit ? String(round4(product.purchasePrice * unit.factor)) : line.unitCost });
                }}
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
                placeholder={tr("Cost each")}
                aria-label={tr("Cost each")}
                value={line.unitCost}
                onChange={(event) => update(line.key, { unitCost: event.target.value })}
                className={`${inputClass} tabular text-right`}
              />
              <p className="tabular flex h-10 items-center justify-end text-sm font-semibold text-zinc-900">{formatMoney((Number(line.qty) || 0) * (Number(line.unitCost) || 0))}</p>
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
          setLines((old) => [...old, { key: nextKey, productId: "", unitId: "", qty: "", unitCost: "" }]);
          setNextKey(nextKey + 1);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        <Plus className="h-4 w-4" />{tr("Add another item")}</button>

      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-zinc-50 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-700">{tr("Purchase total")}</span>
        <span className="tabular text-xl font-black text-zinc-900">{formatMoney(total)}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label={tr("Paid now (৳)")} hint={tr("Leave 0 to owe the full amount.")}>
          <Input name="paid" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label={tr("Paid from")}>
          <Select name="accountId" defaultValue={accounts[0]?.id}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Note (optional)")}>
          <Input name="notes" maxLength={300} />
        </Field>
      </div>
    </FormModal>
  );
}
