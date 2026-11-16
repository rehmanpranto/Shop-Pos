"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson, type ApiResult } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";

function InlineForm({
  submitLabel,
  successMessage,
  resetOnSuccess,
  onSubmit,
  children,
}: {
  submitLabel: string;
  successMessage: string;
  resetOnSuccess?: boolean;
  onSubmit: (form: FormData) => Promise<ApiResult<unknown> | string>;
  children: ReactNode;
}) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    const result = await onSubmit(new FormData(formElement));
    setSaving(false);
    if (typeof result === "string") return setError(result);
    if (!result.ok) return setError(result.message);
    if (resetOnSuccess) formElement.reset();
    toast(successMessage);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {children}
      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={saving} className="mt-5">
        {saving ? tr("Saving…") : submitLabel}
      </Button>
    </form>
  );
}

export type BusinessDetails = { businessName: string; address: string; phone: string; email: string; vatNumber: string; invoiceFooter: string };

export function BusinessForm({ details, canEdit }: { details: BusinessDetails; canEdit: boolean }) {
  const tr = useTr();
  const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
  return (
    <InlineForm
      submitLabel={tr("Save business details")}
      successMessage={tr("Business details saved")}
      onSubmit={(form) =>
        sendJson(
          "/api/settings",
          {
            businessName: value(form, "businessName"),
            address: value(form, "address"),
            phone: value(form, "phone"),
            email: value(form, "email"),
            vatNumber: value(form, "vatNumber"),
            invoiceFooter: value(form, "invoiceFooter"),
          },
          "PATCH",
        )
      }
    >
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Business name")} hint={tr("Shown in the sidebar and on invoices.")} className="sm:col-span-2">
          <Input name="businessName" required maxLength={160} defaultValue={details.businessName} />
        </Field>
        <Field label={tr("Phone")}>
          <Input name="phone" type="tel" maxLength={40} defaultValue={details.phone} />
        </Field>
        <Field label={tr("Email")}>
          <Input name="email" type="email" maxLength={160} defaultValue={details.email} />
        </Field>
        <Field label={tr("Address")} className="sm:col-span-2">
          <Input name="address" maxLength={500} defaultValue={details.address} />
        </Field>
        <Field label={tr("VAT / BIN number")}>
          <Input name="vatNumber" maxLength={60} defaultValue={details.vatNumber} />
        </Field>
        <Field label={tr("Invoice footer note")} className="sm:col-span-2">
          <Textarea name="invoiceFooter" rows={2} maxLength={300} defaultValue={details.invoiceFooter} placeholder={tr("e.g. Goods once sold are not returnable after 7 days.")} />
        </Field>
      </fieldset>
    </InlineForm>
  );
}

export function PasswordForm() {
  const tr = useTr();
  return (
    <InlineForm
      submitLabel={tr("Change password")}
      successMessage={tr("Password changed")}
      resetOnSuccess
      onSubmit={(form) => {
        const newPassword = String(form.get("newPassword") ?? "");
        if (newPassword !== String(form.get("confirmPassword") ?? "")) return Promise.resolve(tr("The two new passwords do not match."));
        return sendJson("/api/account/password", { currentPassword: String(form.get("currentPassword") ?? ""), newPassword });
      }}
    >
      <div className="grid gap-4">
        <Field label={tr("Current password")}>
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label={tr("New password")} hint={tr("At least 8 characters.")}>
          <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label={tr("New password again")}>
          <Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>
    </InlineForm>
  );
}
