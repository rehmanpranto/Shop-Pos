"use client";

import { useState } from "react";

export function SaleActions({ saleId }: { saleId: string }) {
  const [busy, setBusy] = useState(false);

  async function cancelSale() {
    if (!window.confirm("Cancel this sale and restore its stock?")) return;
    setBusy(true);
    const response = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const result = await response.json();
      window.alert(result.error?.message ?? "Could not cancel sale");
      return;
    }
    window.location.reload();
  }

  return (
    <button type="button" onClick={cancelSale} disabled={busy} className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
      {busy ? "Cancelling..." : "Cancel"}
    </button>
  );
}
