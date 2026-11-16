"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RejectQuotation({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function reject() {
    setBusy(true);
    const result = await sendJson(`/api/quotations/${quotationId}`, { status: "REJECTED" }, "PATCH");
    setBusy(false);
    if (!result.ok) return toast(result.message, "error");
    toast("Quotation marked as rejected");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={reject} disabled={busy} className="text-red-700 hover:bg-red-50 hover:text-red-800">
      {busy ? "Saving…" : "Customer said no"}
    </Button>
  );
}
