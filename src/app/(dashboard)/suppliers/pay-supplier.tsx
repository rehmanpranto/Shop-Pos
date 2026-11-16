"use client";

import { HandCoins } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

type Account = { id: string; name: string };

export function PaySupplier({ supplierId, name, owed, accounts, size = "sm" }: { supplierId: string; name: string; owed: number; accounts: Account[]; size?: "sm" | "md" }) {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <HandCoins className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />{tr("Pay supplier")}</>
      }
      triggerLook={{ variant: "secondary", size }}
      title={tr("Pay {0}", name)}
      description={tr("You owe {0}. The payment clears the oldest unpaid purchases first.", formatMoney(owed))}
      submitLabel={tr("Record payment")}
      successMessage={tr("Supplier payment recorded")}
      size="sm"
      onSubmit={(form) => {
        const amount = number(form, "amount");
        if (amount > owed) return Promise.resolve(tr("You only owe {0} {1}.", name, formatMoney(owed)));
        return sendJson(`/api/suppliers/${supplierId}/payments`, { accountId: text(form, "accountId"), amount, notes: optionalText(form, "notes") });
      }}
    >
      <div className="grid gap-4">
        <Field label={tr("Amount (৳)")}>
          <Input name="amount" type="number" min="0.01" step="0.01" max={owed} defaultValue={owed} required />
        </Field>
        <Field label={tr("Paid from")}>
          <Select name="accountId" required>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Note (optional)")}>
          <Input name="notes" maxLength={300} placeholder={tr("e.g. Cheque no. 1234")} />
        </Field>
      </div>
    </FormModal>
  );
}
