"use client";

import { Pencil } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, text } from "@/components/ui/form-modal";
import { useTr } from "@/components/layout/language";

type Branch = { id: string; name: string };
export type EditableUser = { id: string; name: string; email: string; role: string; branchId: string; isActive: boolean };

export function UserEditForm({ user, branches, isSelf }: { user: EditableUser; branches: Branch[]; isSelf: boolean }) {
  const tr = useTr();
  return (
    <FormModal
      trigger={
        <>
          <Pencil className="h-3.5 w-3.5" />{tr("Edit")}</>
      }
      triggerLook={{ variant: "secondary", size: "sm" }}
      title={tr("Edit {0}", user.name)}
      description={user.email}
      submitLabel={tr("Save changes")}
      successMessage={tr("User updated")}
      onSubmit={(form) => {
        const newPassword = String(form.get("newPassword") ?? "");
        if (newPassword && newPassword.length < 8) return Promise.resolve(tr("The new password needs at least 8 characters."));
        return sendJson(
          `/api/users/${user.id}`,
          {
            name: text(form, "name"),
            role: isSelf ? user.role : text(form, "role"),
            branchId: text(form, "branchId"),
            isActive: isSelf ? true : form.get("isActive") === "on",
            newPassword: newPassword || undefined,
          },
          "PATCH",
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Full name")}>
          <Input name="name" required maxLength={120} defaultValue={user.name} />
        </Field>
        <Field label={tr("Role")} hint={isSelf ? tr("You cannot change your own role.") : undefined}>
          <Select name="role" defaultValue={user.role} disabled={isSelf}>
            <option value="ADMIN">{tr("Admin: everything")}</option>
            <option value="MANAGER">{tr("Manager: everything except users and settings")}</option>
            <option value="CASHIER">{tr("Cashier: sells and refunds")}</option>
            <option value="INVENTORY">{tr("Inventory: products, stock and purchases")}</option>
            <option value="ACCOUNTANT">{tr("Accountant: reports and money, read-only")}</option>
          </Select>
        </Field>
        <Field label={tr("Branch")}>
          <Select name="branchId" defaultValue={user.branchId}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr("Set a new password")} hint={tr("Leave blank to keep the current one.")}>
          <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" />
        </Field>
      </div>
      {isSelf ? null : (
        <label className="mt-5 flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="h-4 w-4 accent-[#154c79]" />{tr("Can sign in (untick to disable this account)")}</label>
      )}
    </FormModal>
  );
}
