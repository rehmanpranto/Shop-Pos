"use client";

import { HandCoins } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";

type Account = { id: string; name: string };

export function PaySupplier({ supplierId, name, owed, accounts, size = "sm" }: { supplierId: string; name: string; owed: number; accounts: Account[]; size?: "sm" | "md" }) {
  return (
    <FormModal
      trigger={
        <>
          <HandCoins className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Pay supplier
        </>
      }
      triggerLook={{ variant: "secondary", size }}
      title={`Pay ${name}`}
      description={`You owe ${formatMoney(owed)}. The payment clears the oldest unpaid purchases first.`}
      submitLabel="Record payment"
      successMessage="Supplier payment recorded"
      size="sm"
      onSubmit={(form) => {
        const amount = number(form, "amount");
        if (amount > owed) return Promise.resolve(`You only owe ${name} ${formatMoney(owed)}.`);
        return sendJson(`/api/suppliers/${supplierId}/payments`, { accountId: text(form, "accountId"), amount, notes: optionalText(form, "notes") });
      }}
    >
      <div className="grid gap-4">
        <Field label="Amount (৳)">
          <Input name="amount" type="number" min="0.01" step="0.01" max={owed} defaultValue={owed} required />
        </Field>
        <Field label="Paid from">
          <Select name="accountId" required>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note (optional)">
          <Input name="notes" maxLength={300} placeholder="e.g. Cheque no. 1234" />
        </Field>
      </div>
    </FormModal>
  );
}
