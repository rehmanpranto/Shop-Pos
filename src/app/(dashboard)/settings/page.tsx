import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { humanize } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BusinessForm, PasswordForm } from "./settings-forms";
import { getTr } from "@/lib/i18n-server";

export default async function SettingsPage() {
  const tr = await getTr();
  const { user } = await getSessionContext();
  const setting = await prisma.businessSetting.findFirst();
  const canEdit = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader title={tr("Settings")} description={tr("Business details and your own account.")} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="text-base font-bold text-zinc-900">{tr("Business details")}</h3>
          <p className="mb-4 mt-0.5 text-sm text-zinc-500">{canEdit ? tr("These appear on invoices.") : tr("Only an admin can change these.")}</p>
          <BusinessForm
            canEdit={canEdit}
            details={{
              businessName: setting?.businessName ?? "",
              address: setting?.address ?? "",
              phone: setting?.phone ?? "",
              email: setting?.email ?? "",
              vatNumber: setting?.vatNumber ?? "",
              invoiceFooter: setting?.invoiceFooter ?? "",
            }}
          />
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Currency")}</dt>
              <dd className="mt-0.5 text-zinc-900">
                {setting?.currency ?? "BDT"} ({setting?.currencySymbol ?? "৳"})
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Invoice prefix")}</dt>
              <dd className="mt-0.5 text-zinc-900">{setting?.invoicePrefix ?? "INV"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{tr("Stock costing")}</dt>
              <dd className="mt-0.5 text-zinc-900">{tr(humanize(setting?.costingMethod ?? "WEIGHTED_AVERAGE"))}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="text-base font-bold text-zinc-900">{tr("Your password")}</h3>
            <p className="mb-4 mt-0.5 text-sm text-zinc-500">{tr("Signed in as")}{" "}{user?.email}.</p>
            <PasswordForm />
          </Card>

          {canEdit ? (
            <Card>
              <h3 className="text-base font-bold text-zinc-900">{tr("Backup")}</h3>
              <p className="mb-4 mt-0.5 text-sm text-zinc-500">{tr("Download every product, sale, purchase, customer and payment as one file. Keep a copy somewhere safe, such as a USB drive or Google Drive. Passwords are not included.")}</p>
              <a href="/api/backup" className={buttonClass("secondary")}>
                <Download className="h-4 w-4" />{tr("Download backup")}</a>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
