"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";

export function UserDeleteButton({ userId, name }: { userId: string; name: string }) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setConfirming(false), []);

  async function removeUser() {
    setBusy(true);
    const result = await sendJson(`/api/users/${userId}`, undefined, "DELETE");
    setBusy(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setConfirming(false);
    toast(tr("{0} removed", name));
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setConfirming(true)}>
        <Trash2 className="h-3.5 w-3.5" />{tr("Delete")}</Button>
      <Modal open={confirming} onClose={close} title={tr("Delete {0}?", name)} size="sm">
        <p className="text-sm text-zinc-600">{tr("This permanently removes them from your users and signs them out. Sales and other records they made stay in your reports. This cannot be undone. To block them for a while instead, use Disable.")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>{tr("Keep user")}</Button>
          <Button variant="danger" onClick={removeUser} disabled={busy}>
            {busy ? tr("Deleting…") : tr("Delete user")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
