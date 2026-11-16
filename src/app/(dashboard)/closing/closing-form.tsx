"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client-api";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";

export function ClosingForm({ expected, alreadyClosed }: { expected: number; alreadyClosed: boolean }) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const difference = counted === "" ? null : Math.round((Number(counted) - expected) * 100) / 100;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await sendJson("/api/closing", { actualCash: Number(counted), reason: reason.trim() || undefined });
    setSaving(false);
    if (!result.ok) return setError(result.message);
    toast("Day closed");
    setCounted("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label={tr("Cash counted in the drawer (৳)")}>
        <Input type="number" inputMode="decimal" min="0" step="0.01" required value={counted} onChange={(e) => setCounted(e.target.value)} className="tabular h-12 text-right text-lg font-bold" />
      </Field>

      {difference !== null ? (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
            difference === 0 ? "bg-emerald-50 text-emerald-800" : difference > 0 ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-700"
          }`}
        >
          <span>{difference === 0 ? tr("Matches exactly") : difference > 0 ? tr("Over by") : tr("Short by")}</span>
          {difference !== 0 ? <span className="tabular">{formatMoney(Math.abs(difference))}</span> : null}
        </div>
      ) : null}

      {difference !== null && difference !== 0 ? (
        <Field label={tr("Reason for the difference")}>
          <Input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr("e.g. Gave wrong change")} />
        </Field>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={saving || counted === ""}>
        {saving ? tr("Saving…") : alreadyClosed ? tr("Save a new count for today") : tr("Close the day")}
      </Button>
    </form>
  );
}
