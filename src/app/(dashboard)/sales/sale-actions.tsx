"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, FileText, Printer, RotateCcw, Truck } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatMoney, formatQty } from "@/lib/format";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useTr } from "@/components/layout/language";

export type RefundableItem = { saleItemId: string; name: string; unit: string; remaining: number; unitPrice: number };
type Account = { id: string; name: string; method: string };

export function SaleActions({
  saleId,
  invoiceNo,
  items,
  accounts,
  hasCustomer,
  canRefund,
  canCancel,
  delivery,
}: {
  saleId: string;
  invoiceNo: string;
  items: RefundableItem[];
  accounts: Account[];
  hasCustomer: boolean;
  canRefund: boolean;
  canCancel: boolean;
  /** Present when a delivery can be scheduled for this sale. */
  delivery?: { address: string; phone: string; today: string };
}) {
  const tr = useTr();
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const closeConfirm = useCallback(() => setConfirming(false), []);

  const refundTotal = items.reduce((sum, item) => sum + (Number(quantities[item.saleItemId]) || 0) * item.unitPrice, 0);

  async function cancelSale() {
    setBusy(true);
    const result = await sendJson(`/api/sales/${saleId}`, undefined, "DELETE");
    setBusy(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    setConfirming(false);
    toast(tr("{0} cancelled and stock restored", invoiceNo));
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-1.5">
      <a href={`/receipt/${saleId}`} target="_blank" rel="noreferrer" title={tr("Print an 80mm receipt")} className={buttonClass("secondary", "sm")}>
        <Printer className="h-3.5 w-3.5" />{tr("Receipt")}</a>
      <a href={`/api/sales/${saleId}/invoice`} target="_blank" rel="noreferrer" title={tr("Open the A4 invoice")} className={buttonClass("secondary", "sm")}>
        <FileText className="h-3.5 w-3.5" />
        A4
      </a>

      {delivery ? (
        <FormModal
          trigger={
            <>
              <Truck className="h-3.5 w-3.5" />{tr("Deliver")}</>
          }
          triggerLook={{ variant: "secondary", size: "sm" }}
          title={tr("Deliver {0}", invoiceNo)}
          description={tr("Schedule a delivery for this sale. You can print the challan from the Deliveries page.")}
          submitLabel={tr("Schedule delivery")}
          successMessage={tr("Delivery scheduled")}
          onSubmit={(form) =>
            sendJson("/api/deliveries", {
              saleId,
              address: text(form, "address"),
              phone: optionalText(form, "phone"),
              driver: optionalText(form, "driver"),
              vehicle: optionalText(form, "vehicle"),
              deliveryDate: optionalText(form, "deliveryDate"),
              deliveryCharge: number(form, "deliveryCharge"),
              notes: optionalText(form, "notes"),
            })
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Delivery address")} className="sm:col-span-2">
              <Input name="address" required maxLength={300} defaultValue={delivery.address} />
            </Field>
            <Field label={tr("Contact phone")}>
              <Input name="phone" type="tel" maxLength={40} defaultValue={delivery.phone} />
            </Field>
            <Field label={tr("Delivery date")}>
              <Input name="deliveryDate" type="date" defaultValue={delivery.today} min={delivery.today} />
            </Field>
            <Field label={tr("Driver (optional)")}>
              <Input name="driver" maxLength={120} />
            </Field>
            <Field label={tr("Vehicle (optional)")}>
              <Input name="vehicle" maxLength={60} placeholder={tr("e.g. Pickup DHK-1234")} />
            </Field>
            <Field label={tr("Delivery charge (৳)")} hint={tr("For your records. It is not added to the invoice.")}>
              <Input name="deliveryCharge" type="number" min="0" step="0.01" defaultValue="0" />
            </Field>
            <Field label={tr("Note (optional)")}>
              <Input name="notes" maxLength={300} />
            </Field>
          </div>
        </FormModal>
      ) : null}

      {canRefund && items.length > 0 ? (
        <FormModal
          trigger={
            <>
              <RotateCcw className="h-3.5 w-3.5" />{tr("Refund")}</>
          }
          triggerLook={{ variant: "secondary", size: "sm" }}
          title={tr("Refund {0}", invoiceNo)}
          description={tr("Enter how many of each item came back. They go back into stock.")}
          submitLabel={refundTotal > 0 ? tr("Refund {0}", formatMoney(refundTotal)) : tr("Refund")}
          successMessage={tr("Refund recorded and stock returned")}
          onSubmit={(form) => {
            const lines = items
              .map((item) => ({ item, qty: Number(quantities[item.saleItemId]) || 0 }))
              .filter((line) => line.qty > 0);
            if (lines.length === 0) return Promise.resolve(tr("Enter a quantity for at least one item."));
            const tooMany = lines.find((line) => line.qty > line.item.remaining);
            if (tooMany) return Promise.resolve(tr("Only {0} of {1} can still be refunded.", formatQty(tooMany.item.remaining), tooMany.item.name));

            const account = accounts.find((a) => a.id === text(form, "accountId"));
            return sendJson("/api/refunds", {
              saleId,
              reason: optionalText(form, "reason"),
              accountId: account?.id,
              paymentMethod: account?.method ?? "CREDIT_DUE",
              items: lines.map((line) => ({ saleItemId: line.item.saleItemId, qty: line.qty })),
            }).then((result) => {
              if (result.ok) setQuantities({});
              return result;
            });
          }}
        >
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {items.map((item) => (
              <li key={item.saleItemId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatQty(item.remaining)} {item.unit}{" "}{tr("can be returned ·")}{" "}{formatMoney(item.unitPrice)}{" "}{tr("each")}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={item.remaining}
                  step="any"
                  placeholder="0"
                  aria-label={tr("Quantity of {0} to refund", item.name)}
                  value={quantities[item.saleItemId] ?? ""}
                  onChange={(event) => setQuantities((old) => ({ ...old, [item.saleItemId]: event.target.value }))}
                  className="tabular w-24 text-right"
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={tr("Give the money back from")}>
              <Select name="accountId" defaultValue={hasCustomer ? "" : accounts[0]?.id}>
                {hasCustomer ? <option value="">{tr("No cash back (take it off what they owe)")}</option> : null}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("Reason (optional)")}>
              <Input name="reason" maxLength={200} placeholder={tr("e.g. Wrong size")} />
            </Field>
          </div>
        </FormModal>
      ) : null}

      {canCancel ? (
        <>
          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setConfirming(true)}>
            <Ban className="h-3.5 w-3.5" />{tr("Cancel")}</Button>
          <Modal open={confirming} onClose={closeConfirm} title={tr("Cancel {0}?", invoiceNo)} size="sm">
            <p className="text-sm text-zinc-600">{tr("The items go back into stock, the payment is taken back out of the account it went into, and any amount on credit is removed. This cannot be undone.")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeConfirm}>{tr("Keep sale")}</Button>
              <Button variant="danger" onClick={cancelSale} disabled={busy}>
                {busy ? tr("Cancelling…") : tr("Cancel sale")}
              </Button>
            </div>
          </Modal>
        </>
      ) : null}
    </div>
  );
}
