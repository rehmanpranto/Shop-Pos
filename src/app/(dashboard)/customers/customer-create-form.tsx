"use client";

import { FormEvent, useState } from "react";

export function CustomerCreateForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerCode: form.get("customerCode"),
        name: form.get("name"),
        phone: form.get("phone") || undefined,
        email: form.get("email") || undefined,
        company: form.get("company") || undefined,
        address: form.get("address") || undefined,
        customerType: form.get("customerType") || undefined,
        priceLevel: form.get("priceLevel"),
        creditLimit: Number(form.get("creditLimit")),
        openingBalance: Number(form.get("openingBalance")),
      }),
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok || !result.success) {
      setMessage(result.error?.message ?? "Could not add customer");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
        {open ? "Close" : "+ Add Customer"}
      </button>
      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <input name="customerCode" placeholder="Customer code" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="name" placeholder="Customer name" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="company" placeholder="Company" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="customerType" placeholder="Customer type" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <select name="priceLevel" defaultValue="RETAIL" className="rounded-lg border border-zinc-300 bg-white px-3 py-2">
            <option value="RETAIL">Retail pricing</option>
            <option value="WHOLESALE">Wholesale pricing</option>
          </select>
          <input name="address" placeholder="Address" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="creditLimit" type="number" min="0" step="0.01" placeholder="Credit limit" defaultValue="0" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="openingBalance" type="number" min="0" step="0.01" placeholder="Opening balance" defaultValue="0" className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Adding..." : "Save Customer"}
            </button>
            {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
