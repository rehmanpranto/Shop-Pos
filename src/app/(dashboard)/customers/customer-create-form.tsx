"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";

export function CustomerCreateForm() {
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />
          Add customer
        </>
      }
      title="Add customer"
      submitLabel="Add customer"
      successMessage="Customer added"
      onSubmit={(form) =>
        sendJson("/api/customers", {
          customerCode: text(form, "customerCode") || `C-${Date.now().toString(36).toUpperCase()}`,
          name: text(form, "name"),
          phone: optionalText(form, "phone"),
          email: optionalText(form, "email"),
          company: optionalText(form, "company"),
          address: optionalText(form, "address"),
          priceLevel: text(form, "priceLevel"),
          creditLimit: number(form, "creditLimit"),
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" required placeholder="Customer or contact name" />
        </Field>
        <Field label="Phone">
          <Input name="phone" type="tel" placeholder="01XXXXXXXXX" />
        </Field>
        <Field label="Company (optional)">
          <Input name="company" />
        </Field>
        <Field label="Email (optional)" hint="Needed to email invoices.">
          <Input name="email" type="email" />
        </Field>
        <Field label="Address (optional)" className="sm:col-span-2">
          <Input name="address" />
        </Field>
        <Field label="Pricing">
          <Select name="priceLevel" defaultValue="RETAIL">
            <option value="RETAIL">Retail prices</option>
            <option value="WHOLESALE">Wholesale prices</option>
          </Select>
        </Field>
        <Field label="Credit limit (৳)">
          <Input name="creditLimit" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label="Customer code (optional)" hint="Leave blank to create one automatically.">
          <Input name="customerCode" />
        </Field>
      </div>
    </FormModal>
  );
}
