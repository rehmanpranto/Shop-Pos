import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { formatDate, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";
import { UserCreateForm } from "./user-create-form";
import { UserEditForm } from "./user-edit-form";

export default async function UsersPage() {
  const { user } = await getSessionContext();
  const [users, branches] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { branch: { select: { name: true } } } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader title="Users" description="Staff who can sign in, and what each role is allowed to do." actions={user?.role === "ADMIN" ? <UserCreateForm /> : null} />

      <TableSearch placeholder="Search name, email or role">
        <TableCard>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Added</th>
                <th>Status</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-zinc-900">
                    {u.name}
                    {u.id === user?.id ? <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span> : null}
                  </td>
                  <td className="text-zinc-600">{u.email}</td>
                  <td>
                    <Badge tone={u.role === "ADMIN" ? "blue" : "neutral"}>{humanize(u.role)}</Badge>
                  </td>
                  <td className="text-zinc-600">{u.branch?.name ?? "-"}</td>
                  <td className="text-zinc-600">{formatDate(u.createdAt)}</td>
                  <td>{u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}</td>
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
