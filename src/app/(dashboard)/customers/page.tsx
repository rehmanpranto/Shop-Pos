import { HandCoins, Users } from "lucide-react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { whatsappLink } from "@/lib/whatsapp";
import { buttonClass } from "@/components/ui/button";
import { getSessionContext } from "@/lib/session";
import { formatMoney, toNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { TableCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TableSearch } from "@/components/ui/table-search";
import { CustomerCreateForm } from "./customer-create-form";
import { ReceivePayment } from "./receive-payment";
import { getTr } from "@/lib/i18n-server";

export default async function CustomersPage() {
  const tr = await getTr();
  const { user, branchId } = await getSessionContext();
  const setting = await prisma.businessSetting.findFirst({ select: { businessName: true } });
  const businessName = setting?.businessName ?? DEFAULT_BUSINESS_NAME;
  const canAdd = user ? can(user.role, "customers:create") : false;
  const canCollect = user ? can(user.role, "sales:create") : false;
  const [items, accounts] = branchId
    ? await Promise.all([
        prisma.customer.findMany({ where: { branchId }, include: { _count: { select: { sales: true } } }, orderBy: { name: "asc" } }),
        prisma.paymentAccount.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ])
    : [[], []];
  const owing = items.filter((c) => toNumber(c.outstanding) > 0);
  const totalDue = owing.reduce((sum, c) => sum + toNumber(c.outstanding), 0);

  return (
    <div>
      <PageHeader title={tr("Customers")} description={tr("Regular customers, their pricing and what they owe.")} actions={canAdd ? <CustomerCreateForm /> : null} />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={tr("Customers")} value={`${items.length}`} icon={Users} />
        <StatCard label={tr("Total owed to you")} value={formatMoney(totalDue)} hint={tr("{0} with dues", owing.length)} icon={HandCoins} tone="amber" />
      </div>

      {items.length === 0 ? (
        <TableCard>
          <EmptyState icon={Users} title={tr("No customers yet")} description={tr("Walk-in sales don't need one. Add customers you sell to on credit or at wholesale prices.")} action={canAdd ? <CustomerCreateForm /> : null} />
        </TableCard>
      ) : (
        <TableSearch placeholder={tr("Search name, phone or code")} filters={[{ label: tr("Has dues"), value: "due" }, { label: tr("Wholesale"), value: "wholesale" }]}>
          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr("Customer")}</th>
                  <th>{tr("Phone")}</th>
                  <th>{tr("Pricing")}</th>
                  <th className="num">{tr("Sales")}</th>
                  <th className="num">{tr("Credit limit")}</th>
                  <th className="num">{tr("Owes")}</th>
                  <th className="num">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const due = toNumber(c.outstanding);
                  const limit = toNumber(c.creditLimit);
                  const reminder = whatsappLink(
                    c.phone,
                    `Dear ${c.name}, this is a reminder from ${businessName}. Your outstanding balance is ${formatMoney(due)}. Please arrange payment at your convenience. Thank you.`,
                  );
                  return (
                    <tr key={c.id} data-tags={`${due > 0 ? "due" : ""} ${c.priceLevel === "WHOLESALE" ? "wholesale" : ""}`}>
                      <td>
                        <Link href={`/customers/${c.id}`} className="font-semibold text-zinc-900 hover:text-brand hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {c.customerCode}
                          {c.company ? ` · ${c.company}` : ""}
                        </p>
                      </td>
                      <td className="text-zinc-600">{c.phone ?? "-"}</td>
                      <td>{c.priceLevel === "WHOLESALE" ? <Badge tone="blue">{tr("Wholesale")}</Badge> : <Badge>{tr("Retail")}</Badge>}</td>
                      <td className="num text-zinc-600">{c._count.sales}</td>
                      <td className="num text-zinc-600">{limit > 0 ? formatMoney(limit) : "-"}</td>
                      <td className="num">
                        {due > 0 ? <span className="font-bold text-amber-700">{formatMoney(due)}</span> : <span className="text-zinc-400">-</span>}
                        {limit > 0 && due > limit ? <Badge tone="red" className="ml-1.5">{tr("Over limit")}</Badge> : null}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {due > 0 && reminder ? (
                            <a href={reminder} target="_blank" rel="noreferrer" title={tr("Send a WhatsApp reminder")} className={buttonClass("secondary", "sm")}>
                              <MessageCircle className="h-3.5 w-3.5" />{tr("Remind")}</a>
                          ) : null}
                          {due > 0 && canCollect ? <ReceivePayment customerId={c.id} name={c.name} outstanding={due} accounts={accounts} /> : null}
                          <Link href={`/customers/${c.id}`} className={buttonClass("secondary", "sm")}>{tr("Statement")}</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        </TableSearch>
      )}
    </div>
  );
}
