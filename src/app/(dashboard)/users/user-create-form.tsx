"use client";

import { FormEvent, useState } from "react";

export function UserCreateForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
      }),
    });
    const result = await response.json();

    setSaving(false);
    if (!response.ok || !result.success) {
      setMessage(result.error?.message ?? "Could not add user");
      return;
    }

    event.currentTarget.reset();
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        {open ? "Close" : "+ Add User"}
      </button>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <input name="name" placeholder="Full name" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <input name="password" type="password" minLength={8} placeholder="Password (8+ characters)" required className="rounded-lg border border-zinc-300 bg-white px-3 py-2" />
          <select name="role" defaultValue="CASHIER" className="rounded-lg border border-zinc-300 bg-white px-3 py-2">
            <option value="CASHIER">Salesman</option>
            <option value="MANAGER">Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="INVENTORY">Inventory staff</option>
          </select>
          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Adding..." : "Save User"}
            </button>
            {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
