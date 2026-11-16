import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDate, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { UserCreateForm } from "./user-create-form";
import { UserEditForm } from "./user-edit-form";
import { getTr } from "@/lib/i18n-server";

export default async function UsersPage() {
  const tr = await getTr();
  const { user } = await getSessionContext();
  const [users, branches] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { branch: { select: { name: true } } } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader title={tr("Users")} description={tr("Staff who can sign in, and what each role is allowed to do.")} actions={user?.role === "ADMIN" ? <UserCreateForm /> : null} />

      <TableSearch placeholder={tr("Search name, email or role")}>
        <TableCard>
          <table className="data-table">
            <thead>
              <tr>
                <th>{tr("Name")}</th>
                <th>{tr("Email")}</th>
                <th>{tr("Role")}</th>
                <th>{tr("Branch")}</th>
                <th>{tr("Added")}</th>
                <th>{tr("Status")}</th>
                <th className="num">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-zinc-900">
                    {u.name}
                    {u.id === user?.id ? <span className="ml-2 text-xs font-normal text-zinc-500">{tr("(you)")}</span> : null}
                  </td>
                  <td className="text-zinc-600">{u.email}</td>
                  <td>
                    <Badge tone={u.role === "ADMIN" ? "blue" : "neutral"}>{tr(humanize(u.role))}</Badge>
                  </td>
                  <td className="text-zinc-600">{u.branch?.name ?? "-"}</td>
                  <td className="text-zinc-600">{formatDate(u.createdAt)}</td>
                  <td>{u.isActive ? <Badge tone="green">{tr("Active")}</Badge> : <Badge tone="red">{tr("Disabled")}</Badge>}</td>
                  <td>
                    <div className="flex justify-end">
                      {isAdmin ? (
                        <UserEditForm
                          user={{ id: u.id, name: u.name, email: u.email, role: u.role, branchId: u.branchId ?? branches[0]?.id ?? "", isActive: u.isActive }}
                          branches={branches}
                          isSelf={u.id === user?.id}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </TableSearch>
    </div>
  );
}
