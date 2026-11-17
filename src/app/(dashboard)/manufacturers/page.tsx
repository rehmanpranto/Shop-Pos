import { Factory } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getSessionContext } from "@/lib/session";
import { getTr } from "@/lib/i18n-server";
import { PageHeader } from "@/components/ui/page-header";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ManufacturerForm } from "./manufacturer-form";

export default async function ManufacturersPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  const canCreate = user ? can(user.role, "products:create") : false;
  const items = branchId ? await prisma.manufacturer.findMany({
    where: { branchId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  }) : [];

  return (
    <div>
      <PageHeader title={tr("Manufacturers")} description={tr("Manage the brands and manufacturers used by your catalog.")} actions={canCreate ? <ManufacturerForm /> : null} />
      {items.length === 0 ? (
        <TableCard><EmptyState icon={Factory} title={tr("No manufacturers yet")} description={tr("Add manufacturers to make product reporting and catalog management more consistent.")} action={canCreate ? <ManufacturerForm /> : null} /></TableCard>
      ) : (
        <TableCard>
          <table className="data-table">
            <thead><tr><th>{tr("Manufacturer")}</th><th>{tr("Description")}</th><th className="num">{tr("Products")}</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td className="font-semibold">{item.name}</td><td className="text-zinc-600">{item.description || "-"}</td><td className="num">{item._count.products}</td></tr>)}</tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}
