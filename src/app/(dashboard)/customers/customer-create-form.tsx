"use client";

import { Plus } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

export function CustomerCreateForm() {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <Plus className="h-4 w-4" />{tr("Add customer")}</>
      }
      title={tr("Add customer")}
      submitLabel={tr("Add customer")}
      successMessage={tr("Customer added")}
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
        <Field label={tr("Name")}>
          <Input name="name" required placeholder={tr("Customer or contact name")} />
        </Field>
        <Field label={tr("Phone")}>
          <Input name="phone" type="tel" placeholder={tr("01XXXXXXXXX")} />
        </Field>
        <Field label={tr("Company (optional)")}>
          <Input name="company" />
        </Field>
        <Field label={tr("Email (optional)")} hint={tr("Needed to email invoices.")}>
          <Input name="email" type="email" />
        </Field>
        <Field label={tr("Address (optional)")} className="sm:col-span-2">
          <Input name="address" />
        </Field>
        <Field label={tr("Pricing")}>
          <Select name="priceLevel" defaultValue="RETAIL">
            <option value="RETAIL">{tr("Retail prices")}</option>
            <option value="WHOLESALE">{tr("Wholesale prices")}</option>
          </Select>
        </Field>
        <Field label={tr("Credit limit (৳)")}>
          <Input name="creditLimit" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field label={tr("Customer code (optional)")} hint={tr("Leave blank to create one automatically.")}>
          <Input name="customerCode" />
        </Field>
      </div>
    </FormModal>
  );
}
