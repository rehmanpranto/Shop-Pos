import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { LANGUAGE_COOKIE } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, branchId } = await getSessionContext();
  if (!user) {
    redirect("/login");
  }

  const [setting, branches, cookieStore] = await Promise.all([
    prisma.businessSetting.findFirst({ select: { businessName: true } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    cookies(),
  ]);

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      language={cookieStore.get(LANGUAGE_COOKIE)?.value === "bn" ? "bn" : "en"}
      businessName={setting?.businessName ?? DEFAULT_BUSINESS_NAME}
      branches={branches}
      activeBranchId={branchId}
    >
      {children}
    </AppShell>
  );
}
