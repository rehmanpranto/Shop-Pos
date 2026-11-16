"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";

const NEXT: Record<string, { status: string; label: string } | undefined> = {
  PENDING: { status: "PREPARING", label: "Start preparing" },
  PREPARING: { status: "OUT_FOR_DELIVERY", label: "Send out" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Mark delivered" },
};

export function DeliveryActions({ deliveryId, status }: { deliveryId: string; status: string }) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const next = NEXT[status];
  if (!next) return null;

  async function setStatus(value: string, message: string) {
    setBusy(true);
    const result = await sendJson(`/api/deliveries/${deliveryId}`, { status: value }, "PATCH");
    setBusy(false);
    if (!result.ok) return toast(result.message, "error");
    toast(message);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" disabled={busy} onClick={() => setStatus(next.status, tr("Delivery updated"))}>
        {tr(next.label)}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setStatus("CANCELLED", tr("Delivery cancelled"))}>{tr("Cancel")}</Button>
    </>
  );
}
