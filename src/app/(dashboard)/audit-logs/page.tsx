import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Card>
      <h2 className="text-lg font-bold">Audit Logs</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Record</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="px-3 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{l.user?.name ?? "System"}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.entity}</td>
                <td className="px-3 py-2">{l.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
