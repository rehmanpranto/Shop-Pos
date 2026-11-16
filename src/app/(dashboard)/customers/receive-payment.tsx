"use client";

import { HandCoins } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";

type Account = { id: string; name: string };

export function ReceivePayment({ customerId, name, outstanding, accounts, size = "sm" }: { customerId: string; name: string; outstanding: number; accounts: Account[]; size?: "sm" | "md" }) {
  return (
    <FormModal
      trigger={
        <>
          <HandCoins className="h-3.5 w-3.5" />
          Receive payment
        </>
      }
      triggerLook={{ variant: "secondary", size }}
      title={`Receive payment from ${name}`}
      description={`They owe ${formatMoney(outstanding)}. The payment clears the oldest unpaid invoices first.`}
      submitLabel="Record payment"
      successMessage="Payment recorded"
      size="sm"
      onSubmit={(form) => {
        const amount = number(form, "amount");
        if (amount > outstanding) return Promise.resolve(`${name} only owes ${formatMoney(outstanding)}.`);
        return sendJson(`/api/customers/${customerId}/payments`, { accountId: text(form, "accountId"), amount, notes: optionalText(form, "notes") });
      }}
    >
      <div className="grid gap-4">
        <Field label="Amount (৳)">
          <Input name="amount" type="number" min="0.01" step="0.01" max={outstanding} defaultValue={outstanding} required />
        </Field>
        <Field label="Received into">
          <Select name="accountId" required>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note (optional)">
          <Input name="notes" maxLength={300} />
        </Field>
      </div>
    </FormModal>
  );
}
