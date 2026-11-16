"use client";

import { Printer } from "lucide-react";

export function BarcodePrintButton({ name, sku, barcode }: { name: string; sku: string; barcode: string }) {
  function printLabel() {
    const escape = (value: string) => value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const safeName = escape(name);
    const safeSku = escape(sku);
    const printWindow = window.open("", "_blank", "width=420,height=320");
    if (!printWindow) return;

    const barcodeUrl = `/api/products/barcode?value=${encodeURIComponent(barcode)}`;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${safeName} barcode</title>
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
            <h1>${safeName}</h1>
            <p>SKU: ${safeSku}</p>
            <img src="${barcodeUrl}" alt="Barcode for ${safeName}" onload="window.print()" />
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <button type="button" onClick={printLabel} title="Print barcode label" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">
      <Printer className="h-3.5 w-3.5" />
      Label
    </button>
  );
}
