"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";

type Option = { id: string; name: string };

export function ExpenseForm({ categories, accounts, today }: { categories: Option[]; accounts: Option[]; today: string }) {
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />
          Record expense
        </>
      }
      title="Record expense"
      description="The amount is taken out of the account you choose."
      submitLabel="Record expense"
      successMessage="Expense recorded"
      onSubmit={(form) =>
        sendJson("/api/expenses", {
          categoryId: text(form, "categoryId"),
          accountId: text(form, "accountId"),
          amount: number(form, "amount"),
          date: text(form, "date"),
          vendor: optionalText(form, "vendor"),
          description: optionalText(form, "description"),
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (৳)">
          <Input name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Paid from">
          <Select name="accountId" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required defaultValue={today} max={today} />
        </Field>
        <Field label="Paid to (optional)">
          <Input name="vendor" maxLength={160} placeholder="e.g. DESCO" />
        </Field>
        <Field label="Note (optional)">
          <Input name="description" maxLength={500} />
        </Field>
      </div>
    </FormModal>
  );
}
