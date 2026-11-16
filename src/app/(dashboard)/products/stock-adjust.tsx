"use client";

import { ArrowUpDown } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatQty } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export function StockAdjust({ productId, name, stockQty, unit }: { productId: string; name: string; stockQty: number; unit: string }) {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <ArrowUpDown className="h-3.5 w-3.5" />{tr("Adjust")}</>
      }
      triggerLook={{ variant: "secondary", size: "sm" }}
      title={tr("Adjust stock: {0}", name)}
      description={tr("Currently {0} {1} in stock. Every change is kept in the inventory ledger.", formatQty(stockQty), unit)}
      submitLabel={tr("Save adjustment")}
      successMessage={tr("Stock adjusted")}
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
        <Field label={tr("What happened?")}>
          <Select name="reason" defaultValue="MANUAL_ADD">
            <optgroup label={tr("Add to stock")}>
              <option value="MANUAL_ADD">{tr("Stock added")}</option>
              <option value="ADJUSTMENT_IN">{tr("Count correction (found more)")}</option>
            </optgroup>
            <optgroup label={tr("Remove from stock")}>
              <option value="DAMAGE">{tr("Damaged or lost")}</option>
              <option value="INTERNAL_USAGE">{tr("Used by the shop")}</option>
              <option value="ADJUSTMENT_OUT">{tr("Count correction (found less)")}</option>
            </optgroup>
          </Select>
        </Field>
        <Field label={tr("Quantity ({0})", unit)}>
          <Input name="qty" type="number" min="0.001" step="0.001" required />
        </Field>
        <Field label={tr("Note (optional)")}>
          <Input name="note" maxLength={300} placeholder={tr("e.g. Broken during unloading")} />
        </Field>
      </div>
    </FormModal>
  );
}
