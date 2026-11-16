"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input } from "@/components/ui/field";
import { FormModal, optionalText, text } from "@/components/ui/form-modal";

export function SupplierForm() {
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />
          Add supplier
        </>
      }
      title="Add supplier"
      submitLabel="Add supplier"
      successMessage="Supplier added"
      onSubmit={(form) =>
        sendJson("/api/suppliers", {
          supplierCode: text(form, "supplierCode") || `S-${Date.now().toString(36).toUpperCase()}`,
          name: text(form, "name"),
          company: optionalText(form, "company"),
          phone: optionalText(form, "phone"),
          email: optionalText(form, "email"),
          address: optionalText(form, "address"),
          paymentTerms: optionalText(form, "paymentTerms"),
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name">
          <Input name="name" required />
        </Field>
        <Field label="Company (optional)">
          <Input name="company" />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" />
        </Field>
        <Field label="Email (optional)">
          <Input name="email" type="email" />
        </Field>
        <Field label="Address (optional)" className="sm:col-span-2">
          <Input name="address" />
        </Field>
        <Field label="Payment terms (optional)">
          <Input name="paymentTerms" placeholder="e.g. 30 days" />
        </Field>
        <Field label="Supplier code (optional)" hint="Leave blank to create one automatically.">
          <Input name="supplierCode" />
        </Field>
      </div>
    </FormModal>
  );
}
