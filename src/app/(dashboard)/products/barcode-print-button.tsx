"use client";

import { Printer } from "lucide-react";

export function BarcodePrintButton({ name, sku, barcode }: { name: string; sku: string; barcode: string }) {
  function printLabel() {
    const printWindow = window.open("", "_blank", "width=420,height=320");
    if (!printWindow) return;

    const barcodeUrl = `/api/products/barcode?value=${encodeURIComponent(barcode)}`;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${name} barcode</title>
          <style>
            @page { margin: 8mm; }
            body { margin: 0; display: flex; justify-content: center; font-family: Arial, sans-serif; }
            .label { width: 70mm; padding: 5mm; text-align: center; }
            h1 { margin: 0 0 3mm; font-size: 16px; }
            p { margin: 1mm 0; font-size: 11px; }
            img { display: block; width: 64mm; height: 24mm; margin: 4mm auto 0; object-fit: contain; }
          </style>
        </head>
        <body>
          <main class="label">
            <h1>${name}</h1>
            <p>SKU: ${sku}</p>
            <img src="${barcodeUrl}" alt="Barcode for ${name}" onload="window.print()" />
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <button type="button" onClick={printLabel} title="Print barcode label" className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100">
      <Printer className="h-3.5 w-3.5" />
      Print
    </button>
  );
}
