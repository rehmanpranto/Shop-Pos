import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const setting = await prisma.businessSetting.findFirst();

  return (
    <Card>
      <h2 className="text-lg font-bold">Business Settings</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-semibold">Business Name</p>
          <p>{setting?.businessName ?? "-"}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-semibold">Currency</p>
          <p>{setting?.currency ?? "BDT"} ({setting?.currencySymbol ?? "৳"})</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-semibold">Invoice Prefix</p>
          <p>{setting?.invoicePrefix ?? "INV"}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-semibold">Costing Method</p>
          <p>{setting?.costingMethod ?? "WEIGHTED_AVERAGE"}</p>
        </div>
      </div>
    </Card>
  );
}
