"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export function UserCreateForm() {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />{tr("Add user")}</>
      }
      title={tr("Add user")}
      description={tr("They sign in with this email and password, and can change the password themselves afterwards.")}
      submitLabel={tr("Add user")}
      successMessage={tr("User added")}
      onSubmit={(form) =>
        sendJson("/api/users", { name: text(form, "name"), email: text(form, "email"), password: String(form.get("password") ?? ""), role: text(form, "role") })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Full name")}>
          <Input name="name" required />
        </Field>
        <Field label={tr("Email")}>
          <Input name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label={tr("Password")} hint={tr("At least 8 characters.")}>
          <Input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </Field>
        <Field label={tr("Role")}>
          <Select name="role" defaultValue="CASHIER">
            <option value="CASHIER">{tr("Cashier: sells and refunds")}</option>
            <option value="MANAGER">{tr("Manager: everything except users and settings")}</option>
            <option value="INVENTORY">{tr("Inventory: products, stock and purchases")}</option>
            <option value="ACCOUNTANT">{tr("Accountant: reports and money, read-only")}</option>
          </Select>
        </Field>
      </div>
    </FormModal>
  );
}
