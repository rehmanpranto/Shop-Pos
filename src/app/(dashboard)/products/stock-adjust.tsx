"use client";

import { ArrowUpDown } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatQty } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";

export function StockAdjust({ productId, name, stockQty, unit }: { productId: string; name: string; stockQty: number; unit: string }) {
  return (
    <FormModal
      trigger={
        <>
          <ArrowUpDown className="h-3.5 w-3.5" />
          Adjust
        </>
      }
      triggerLook={{ variant: "secondary", size: "sm" }}
      title={`Adjust stock: ${name}`}
      description={`Currently ${formatQty(stockQty)} ${unit} in stock. Every change is kept in the inventory ledger.`}
      submitLabel="Save adjustment"
      successMessage="Stock adjusted"
      size="sm"
      onSubmit={(form) =>
        sendJson("/api/inventory/adjust", {
          productId,
          reason: text(form, "reason"),
          qty: number(form, "qty"),
          note: optionalText(form, "note"),
        })
      }
    >
      <div className="grid gap-4">
        <Field label="What happened?">
          <Select name="reason" defaultValue="MANUAL_ADD">
            <optgroup label="Add to stock">
              <option value="MANUAL_ADD">Stock added</option>
              <option value="ADJUSTMENT_IN">Count correction (found more)</option>
            </optgroup>
            <optgroup label="Remove from stock">
              <option value="DAMAGE">Damaged or lost</option>
              <option value="INTERNAL_USAGE">Used by the shop</option>
              <option value="ADJUSTMENT_OUT">Count correction (found less)</option>
            </optgroup>
          </Select>
        </Field>
        <Field label={`Quantity (${unit})`}>
          <Input name="qty" type="number" min="0.001" step="0.001" required />
        </Field>
        <Field label="Note (optional)">
          <Input name="note" maxLength={300} placeholder="e.g. Broken during unloading" />
        </Field>
      </div>
    </FormModal>
  );
}
