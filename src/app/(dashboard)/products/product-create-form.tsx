"use client";

import { FormEvent, useState } from "react";

type Unit = { id: string; name: string; code: string };

type ProductCreateFormProps = { units: Unit[] };

export function ProductCreateForm({ units }: ProductCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const retailPrice = Number(form.get("retailPrice"));
    const purchasePrice = Number(form.get("purchasePrice"));
    const wholesalePrice = Number(form.get("wholesalePrice"));
    const minSellingPrice = Number(form.get("minSellingPrice"));

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productCode: form.get("productCode"),
        sku: form.get("sku"),
        barcode: form.get("barcode"),
        name: form.get("name"),
        baseUnitId: form.get("baseUnitId"),
        purchasePrice,
        retailPrice,
        wholesalePrice,
        minSellingPrice,
        stockQty: Number(form.get("stockQty")),
      }),
    });
    const result = await response.json();

    setSaving(false);
    if (!response.ok || !result.success) {
      setMessage(result.error?.message ?? "Could not add product");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        {open ? "Close" : "+ Add Product"}
      </button>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <input name="name" placeholder="Product name" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="productCode" placeholder="Product code" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="sku" placeholder="SKU" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="barcode" placeholder="Barcode / scan code" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <select name="baseUnitId" required defaultValue="" className="rounded-lg border border-zinc-300 bg-white px-3 py-2">
            <option value="" disabled>Base unit</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.code})</option>)}
          </select>
          <input name="purchasePrice" type="number" min="0.01" step="0.01" placeholder="Purchase price" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="retailPrice" type="number" min="0.01" step="0.01" placeholder="Retail price" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="wholesalePrice" type="number" min="0.01" step="0.01" placeholder="Wholesale price" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="minSellingPrice" type="number" min="0.01" step="0.01" placeholder="Minimum selling price" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="stockQty" type="number" min="0" step="0.001" placeholder="Opening stock" defaultValue="0" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={saving || units.length === 0} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Adding..." : "Save Product"}
            </button>
            {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
