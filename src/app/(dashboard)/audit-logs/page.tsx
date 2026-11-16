import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime, humanize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TableSearch } from "@/components/ui/table-search";

function summarize(json: string | null): string {
  if (!json) return "";
  try {
    const value = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(value)
      .filter(([, v]) => typeof v !== "object")
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  } catch {
    return "";
  }
}

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div>
      <PageHeader title="Audit log" description="A record of who changed what. Entries cannot be edited." />

      {logs.length === 0 ? (
        <TableCard>
          <EmptyState icon={History} title="Nothing logged yet" description="Sales, refunds, stock changes and settings changes are recorded here." />
        </TableCard>
      ) : (
        <TableSearch placeholder="Search user, action or details">
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-zinc-600">{formatDateTime(l.createdAt)}</td>
                    <td className="font-semibold text-zinc-900">{l.user?.name ?? "System"}</td>
                    <td>
                      <Badge>{humanize(l.action)}</Badge>
                    </td>
                    <td className="max-w-md truncate text-xs text-zinc-600" title={summarize(l.newValues)}>
                      {summarize(l.newValues) || l.entity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
