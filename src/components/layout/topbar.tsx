import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function Topbar() {
  const session = await getServerSession(authOptions);

  return (
    <header className="border-b border-zinc-200 bg-white px-3 py-3 md:px-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-zinc-900 sm:text-xl">Hardware & Construction Materials ERP</h1>
          <p className="hidden text-xs text-zinc-500 sm:block">Production-ready operations, inventory, and sales management</p>
        </div>
        <div className="shrink-0 rounded-lg bg-zinc-100 px-2 py-2 text-xs font-medium text-zinc-700 sm:px-3 sm:text-sm">
          {session?.user?.name ?? "Guest"} ({session?.user?.role ?? "N/A"})
        </div>
      </div>
    </header>
  );
}
