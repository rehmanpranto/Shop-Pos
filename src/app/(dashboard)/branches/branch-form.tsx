"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input } from "@/components/ui/field";
import { FormModal, optionalText, text } from "@/components/ui/form-modal";

export function BranchForm() {
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />
          Add branch
        </>
      }
      title="Add branch"
      description="A new branch gets its own products, stock, customers, tills and reports."
      submitLabel="Add branch"
      successMessage="Branch added"
      size="sm"
      onSubmit={(form) => sendJson("/api/branches", { name: text(form, "name"), code: text(form, "code"), address: optionalText(form, "address"), phone: optionalText(form, "phone") })}
    >
      <div className="grid gap-4">
        <Field label="Branch name">
          <Input name="name" required maxLength={120} placeholder="e.g. Station Road branch" />
        </Field>
        <Field label="Short code" hint="Letters and numbers, for example SR2.">
          <Input name="code" required minLength={2} maxLength={12} pattern="[A-Za-z0-9\-]+" />
        </Field>
        <Field label="Address (optional)">
          <Input name="address" maxLength={300} />
        </Field>
        <Field label="Phone (optional)">
          <Input name="phone" type="tel" maxLength={40} />
        </Field>
      </div>
    </FormModal>
  );
}
