"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatQty } from "@/lib/format";
import { Input } from "@/components/ui/field";
import { FormModal } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export type ReceivableItem = { itemId: string; name: string; unit: string; ordered: number; remaining: number };

export function ReceiveForm({ purchaseId, purchaseNo, items }: { purchaseId: string; purchaseNo: string; items: ReceivableItem[] }) {
  const tr = useTr();
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(items.map((item) => [item.itemId, String(item.remaining)])));

  return (
    <FormModal
      trigger={
        <>
          <PackageCheck className="h-3.5 w-3.5" />{tr("Receive")}</>
      }
      triggerLook={{ variant: "secondary", size: "sm" }}
      title={tr("Receive {0}", purchaseNo)}
      description={tr("Enter what arrived. You can receive the rest later.")}
      submitLabel={tr("Add to stock")}
      successMessage={tr("Stock received")}
      onSubmit={() => {
        const lines = items.map((item) => ({ item, qty: Number(quantities[item.itemId]) || 0 })).filter((line) => line.qty > 0);
        if (lines.length === 0) return Promise.resolve(tr("Enter a quantity for at least one item."));
        const tooMany = lines.find((line) => line.qty > line.item.remaining);
        if (tooMany) return Promise.resolve(tr("Only {0} {1} of {2} is still to come.", formatQty(tooMany.item.remaining), tooMany.item.unit, tooMany.item.name));
        return sendJson(`/api/purchases/${purchaseId}/receive`, { items: lines.map((line) => ({ itemId: line.item.itemId, qty: line.qty })) });
      }}
    >
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
        {items.map((item) => (
          <li key={item.itemId} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{item.name}</p>
              <p className="text-xs text-zinc-500">{tr("Ordered")}{" "}{formatQty(item.ordered)} {item.unit} · {formatQty(item.remaining)}{" "}{tr("still to come")}</p>
            </div>
            <Input
              type="number"
              min="0"
              max={item.remaining}
              step="any"
              aria-label={tr("Quantity of {0} received", item.name)}
              value={quantities[item.itemId] ?? ""}
              onChange={(event) => setQuantities((old) => ({ ...old, [item.itemId]: event.target.value }))}
              className="tabular w-28 text-right"
            />
          </li>
        ))}
      </ul>
    </FormModal>
  );
}
