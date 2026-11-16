"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, text } from "@/components/ui/form-modal";

export function UserCreateForm() {
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />
          Add user
        </>
      }
      title="Add user"
      description="They sign in with this email and password, and can change the password themselves afterwards."
      submitLabel="Add user"
      successMessage="User added"
      onSubmit={(form) =>
        sendJson("/api/users", { name: text(form, "name"), email: text(form, "email"), password: String(form.get("password") ?? ""), role: text(form, "role") })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="name" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue="CASHIER">
            <option value="CASHIER">Cashier: sells and refunds</option>
            <option value="MANAGER">Manager: everything except users and settings</option>
            <option value="INVENTORY">Inventory: products, stock and purchases</option>
            <option value="ACCOUNTANT">Accountant: reports and money, read-only</option>
          </Select>
        </Field>
      </div>
    </FormModal>
  );
}
