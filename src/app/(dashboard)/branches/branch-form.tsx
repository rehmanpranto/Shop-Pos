"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input } from "@/components/ui/field";
import { FormModal, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export function BranchForm() {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />{tr("Add branch")}</>
      }
      title={tr("Add branch")}
      description={tr("A new branch gets its own products, stock, customers, tills and reports.")}
      submitLabel={tr("Add branch")}
      successMessage={tr("Branch added")}
      size="sm"
      onSubmit={(form) => sendJson("/api/branches", { name: text(form, "name"), code: text(form, "code"), address: optionalText(form, "address"), phone: optionalText(form, "phone") })}
    >
      <div className="grid gap-4">
        <Field label={tr("Branch name")}>
          <Input name="name" required maxLength={120} placeholder={tr("e.g. Station Road branch")} />
        </Field>
        <Field label={tr("Short code")} hint={tr("Letters and numbers, for example SR2.")}>
          <Input name="code" required minLength={2} maxLength={12} pattern="[A-Za-z0-9\-]+" />
        </Field>
        <Field label={tr("Address (optional)")}>
          <Input name="address" maxLength={300} />
        </Field>
        <Field label={tr("Phone (optional)")}>
          <Input name="phone" type="tel" maxLength={40} />
        </Field>
      </div>
    </FormModal>
  );
}
