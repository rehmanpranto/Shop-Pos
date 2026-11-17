"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input } from "@/components/ui/field";
import { FormModal, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export function ManufacturerForm() {
  const tr = useTr();
  return (
    <FormModal
      trigger={<><Plus className="h-4 w-4" />{tr("Add manufacturer")}</>}
      title={tr("Add manufacturer")}
      submitLabel={tr("Add manufacturer")}
      successMessage={tr("Manufacturer added")}
      onSubmit={(form) => sendJson("/api/manufacturers", {
        name: text(form, "name"),
        description: optionalText(form, "description"),
        imageUrl: optionalText(form, "imageUrl"),
        seoTitle: optionalText(form, "seoTitle"),
        seoDescription: optionalText(form, "seoDescription"),
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Manufacturer name")} className="sm:col-span-2"><Input name="name" required /></Field>
        <Field label={tr("Description")} className="sm:col-span-2"><Input name="description" /></Field>
        <Field label={tr("Image URL")}><Input name="imageUrl" type="url" /></Field>
        <Field label={tr("SEO title")}><Input name="seoTitle" /></Field>
        <Field label={tr("SEO description")} className="sm:col-span-2"><Input name="seoDescription" /></Field>
      </div>
    </FormModal>
  );
}
