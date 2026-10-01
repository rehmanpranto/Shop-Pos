import Link from "next/link";
import { Card } from "@/components/ui/card";

const reports = [
  "Sales report",
  "Purchase report",
  "Profit report",
  "Refund report",
  "Payment report",
  "Expense report",
  "Customer due report",
  "Supplier due report",
  "Inventory report",
  "Product performance",
  "Category performance",
  "Cashier performance",
];

export default function ReportsPage() {
  return (
    <Card>
      <h2 className="text-lg font-bold">Reports</h2>
      <p className="mt-1 text-sm text-zinc-600">Use API endpoint for date-range summary and export integrations.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {reports.map((r) => (
          <div key={r} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            {r}
          </div>
        ))}
      </div>
      <Link href="/api/reports/sales-summary" className="mt-4 inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
        Open Sales Summary API
      </Link>
    </Card>
  );
}
