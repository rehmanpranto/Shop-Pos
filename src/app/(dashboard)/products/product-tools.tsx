"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, FileSpreadsheet, Upload } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatQty } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormModal, number, optionalText, text } from "@/components/ui/form-modal";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const COLUMNS = ["name", "sku", "barcode", "category", "unit", "cost", "retail", "wholesale", "minPrice", "stock", "minStock"] as const;
const NUMERIC = new Set(["cost", "retail", "wholesale", "minPrice", "stock", "minStock"]);
const SAMPLE = [
  COLUMNS.join(","),
  "PVC pipe 1 inch,PVC-1,,Sanitary,FT,18,25,22,20,500,100",
  "LED bulb 12W,LED-12,,Electronic,PC,95,140,125,110,60,20",
].join("\n");

/** Splits CSV text into rows of cells, handling quoted cells that contain commas or line breaks. */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

type ImportResult = { created: number; errors: Array<{ row: number; message: string }> };

export function ProductImport() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const close = useCallback(() => setOpen(false), []);

  function downloadSample() {
    const url = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function upload() {
    const file = fileRef.current?.files?.[0];
    setError("");
    setResult(null);
    if (!file) return setError("Choose a CSV file first.");

    const [header, ...lines] = parseCsv(await file.text());
    const names = (header ?? []).map((name) => name.trim().toLowerCase());
    const missing = ["name", "sku", "unit", "cost", "retail"].filter((column) => !names.includes(column));
    if (missing.length > 0) return setError(`The file is missing these columns: ${missing.join(", ")}. Download the template to see the layout.`);
    if (lines.length === 0) return setError("The file has a header but no products.");

    const rows = lines.map((line) => {
      const row: Record<string, string | number | undefined> = {};
      COLUMNS.forEach((column) => {
        const value = (line[names.indexOf(column.toLowerCase())] ?? "").trim();
        if (value === "") return;
        row[column] = NUMERIC.has(column) ? Number(value.replace(/,/g, "")) : value;
      });
      return row;
    });

    setBusy(true);
    const response = await sendJson<ImportResult>("/api/products/import", { rows });
    setBusy(false);
    if (!response.ok) return setError(response.message);
    setResult(response.data);
    if (response.data.created > 0) {
      toast(`${response.data.created} product${response.data.created === 1 ? "" : "s"} added`);
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setError("");
          setResult(null);
          setOpen(true);
        }}
      >
        <Upload className="h-4 w-4" />
        Import
      </Button>
      <Modal open={open} onClose={close} title="Import products from a spreadsheet" description="Save your Excel sheet as CSV, then upload it here.">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-700">
          <li>Download the template and fill in one product per row.</li>
          <li>
            <span className="font-semibold">unit</span> is the unit code, such as PC, BAG, KG or FT. Leave wholesale and minPrice empty to use retail and cost.
          </li>
          <li>Upload the file. Rows with a problem are skipped and listed below.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={downloadSample}>
            <FileSpreadsheet className="h-4 w-4" />
            Download template
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="CSV file" className="max-w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:text-sm file:font-semibold file:text-brand" />
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="mt-4 rounded-xl border border-zinc-200 p-3 text-sm">
            <p className="font-semibold text-zinc-900">
              {result.created} added, {result.errors.length} skipped
            </p>
            {result.errors.length > 0 ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-zinc-600">
                {result.errors.map((item) => (
                  <li key={item.row}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button onClick={upload} disabled={busy}>
            {busy ? "Importing…" : "Import products"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function StockTransfer({ productId, name, stockQty, unit, branches }: { productId: string; name: string; stockQty: number; unit: string; branches: Array<{ id: string; name: string }> }) {
  return (
    <FormModal
      trigger={
        <>
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Transfer
        </>
      }
      triggerLook={{ variant: "secondary", size: "sm" }}
      title={`Send ${name} to another branch`}
      description={`${formatQty(stockQty)} ${unit} in stock here. The product is created in the other branch if it is not there yet.`}
      submitLabel="Transfer stock"
      successMessage="Stock transferred"
      size="sm"
      onSubmit={(form) => {
        const qty = number(form, "qty");
        if (qty > stockQty) return Promise.resolve(`Only ${formatQty(stockQty)} ${unit} in stock.`);
        return sendJson("/api/branches/transfer", { productId, toBranchId: text(form, "toBranchId"), qty, note: optionalText(form, "note") });
      }}
    >
      <div className="grid gap-4">
        <Field label="Send to">
          <Select name="toBranchId" required>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Quantity (${unit})`}>
          <Input name="qty" type="number" min="0.001" step="0.001" max={stockQty} required />
        </Field>
        <Field label="Note (optional)">
          <Input name="note" maxLength={200} />
        </Field>
      </div>
    </FormModal>
  );
}
