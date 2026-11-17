"use client";

import { FormEvent, ReactNode, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResult } from "@/lib/client-api";
import { Button } from "./button";
import { Modal } from "./modal";
import { useToast } from "./toast";
import { useTr } from "@/components/layout/language";

type ButtonLook = { variant?: "primary" | "secondary" | "ghost" | "danger" | "accent"; size?: "sm" | "md" | "lg" };

/**
 * A button that opens a form in a dialog. On success it closes, shows a toast and refreshes the page data.
 * `onSubmit` returns the API result, or a string to show as a validation message.
 */
export function FormModal({
  trigger,
  triggerLook,
  title,
  description,
  submitLabel = "Save",
  successMessage,
  size = "md",
  onSubmit,
  children,
}: {
  trigger: ReactNode;
  triggerLook?: ButtonLook;
  title: string;
  description?: string;
  submitLabel?: string;
  successMessage: string;
  size?: "sm" | "md" | "lg";
  onSubmit: (form: FormData) => Promise<ApiResult<unknown> | string>;
  children: ReactNode;
}) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(false), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSubmit(new FormData(event.currentTarget));
    setSaving(false);

    if (typeof result === "string") {
      setError(result);
      return;
    }
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    toast(successMessage);
    router.refresh();
  }

  return (
    <>
      <Button
        variant={triggerLook?.variant}
        size={triggerLook?.size}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {trigger}
      </Button>
      <Modal open={open} onClose={close} title={title} description={description} size={size}>
        <form onSubmit={submit}>
          {children}
          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
          <div className="sticky bottom-0 -mx-5 -mb-4 mt-5 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            <Button variant="secondary" onClick={close}>{tr("Cancel")}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? tr("Saving…") : tr(submitLabel)}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export const optionalText = (form: FormData, key: string) => text(form, key) || undefined;
export const number = (form: FormData, key: string) => Number(form.get(key) || 0);
