"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleCheck } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";
import type { EditableUser } from "./user-edit-form";

/** Turns sign-in off or back on. Unlike Delete, the user stays in the list and can be enabled again. */
export function UserStatusButton({ user }: { user: EditableUser }) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const result = await sendJson(
      `/api/users/${user.id}`,
      { name: user.name, role: user.role, branchId: user.branchId, isActive: !user.isActive },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast(user.isActive ? tr("{0} disabled", user.name) : tr("{0} enabled", user.name));
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={toggle} disabled={busy}>
      {user.isActive ? <Ban className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
      {user.isActive ? tr("Disable") : tr("Enable")}
    </Button>
  );
}
