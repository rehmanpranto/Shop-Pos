import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_NAME } from "@/lib/constants";

export type InvoiceData = {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  invoiceNo: string;
  date: string;
  cashier: string;
  customer?: string | null;
  items: Array<{ name: string; sku: string; qty: number; unit: string; unitPrice: number; tax: number; discount: number; lineTotal: number }>;
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
};

// A4 in PDF points.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.44, 0.44, 0.48);
const RULE = rgb(0.89, 0.89, 0.91);

// Product column takes the space left over by the six number columns.
const NUMBER_COLUMNS = ["Qty", "Unit", "Price", "Discount", "Tax", "Total"] as const;
const NUMBER_COLUMN_WIDTH = 62;
const PRODUCT_COLUMN_WIDTH = CONTENT_WIDTH - NUMBER_COLUMN_WIDTH * NUMBER_COLUMNS.length;

/** Builds the A4 invoice using only plain JavaScript. */
export async function renderInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${data.invoiceNo}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // The built-in PDF fonts only cover Latin text; anything else is shown as "?"
  // instead of failing the whole invoice.
  const supported = new Set(regular.getCharacterSet());
  const clean = (text: string) =>
    Array.from(text.replace(/\s+/g, " "), (char) => (supported.has(char.codePointAt(0)!) ? char : "?")).join("");

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const left = (text: string, x: number, font: PDFFont = regular, size = FONT_SIZE, color = INK) =>
    page.drawText(clean(text), { x, y, size, font, color });
  const right = (text: string, xEnd: number, font: PDFFont = regular, size = FONT_SIZE, color = INK) => {
    const value = clean(text);
    page.drawText(value, { x: xEnd - font.widthOfTextAtSize(value, size), y, size, font, color });
  };
  const rule = (color = RULE) =>
    page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 4 }, thickness: 0.75, color });

  const wrap = (text: string, width: number, font: PDFFont = regular) => {
    const lines: string[] = [];
    let line = "";
    for (const word of clean(text).split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, FONT_SIZE) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  const tableHeader = () => {
    left("Product", MARGIN, bold);
    NUMBER_COLUMNS.forEach((label, index) => right(label, MARGIN + PRODUCT_COLUMN_WIDTH + NUMBER_COLUMN_WIDTH * (index + 1), bold));
    rule();
    y -= LINE_HEIGHT + 4;
  };

  // Starts a new page (repeating the table header when inside the table) if `needed` points do not fit.
  const ensureSpace = (needed: number, insideTable: boolean) => {
    if (y - needed >= MARGIN) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN - FONT_SIZE;
    if (insideTable) tableHeader();
  };

  // Shop details
  y -= 16;
  left(data.businessName, MARGIN, bold, 16);
  y -= 18;
  for (const detail of [data.address, data.phone]) {
    if (!detail) continue;
    for (const line of wrap(detail, CONTENT_WIDTH)) {
      left(line, MARGIN, regular, FONT_SIZE, MUTED);
      y -= LINE_HEIGHT;
    }
  }
  y -= 8;

  // Invoice details
  left(`Invoice: ${data.invoiceNo}`, MARGIN, bold);
  right(`Date: ${data.date}`, PAGE_WIDTH - MARGIN);
  y -= LINE_HEIGHT;
  left(`Cashier: ${data.cashier}`, MARGIN);
  right(`Customer: ${data.customer ?? "Walk-in"}`, PAGE_WIDTH - MARGIN);
  y -= LINE_HEIGHT + 10;

  // Items
  tableHeader();
  for (const item of data.items) {
    const nameLines = wrap(`${item.name} (${item.sku})`, PRODUCT_COLUMN_WIDTH - 8);
    ensureSpace(nameLines.length * LINE_HEIGHT + 4, true);
    const values = [String(item.qty), item.unit, item.unitPrice.toFixed(2), item.discount.toFixed(2), item.tax.toFixed(2), item.lineTotal.toFixed(2)];
    values.forEach((value, index) => right(value, MARGIN + PRODUCT_COLUMN_WIDTH + NUMBER_COLUMN_WIDTH * (index + 1)));
    nameLines.forEach((line, index) => {
      if (index > 0) y -= LINE_HEIGHT;
      left(line, MARGIN);
    });
    rule(rgb(0.95, 0.95, 0.96));
    y -= LINE_HEIGHT + 4;
  }

  // Totals
  const totals: Array<[string, number, boolean]> = [
    ["Subtotal", data.subTotal, false],
    ["Discount", data.discount, false],
    ["VAT/Tax", data.tax, false],
    ["Grand Total", data.total, true],
    ["Paid", data.paid, false],
    ["Due", data.due, false],
  ];
  ensureSpace(totals.length * LINE_HEIGHT + 12, false);
  y -= 6;
  for (const [label, amount, strong] of totals) {
    left(label, PAGE_WIDTH - MARGIN - 220, strong ? bold : regular);
    right(amount.toFixed(2), PAGE_WIDTH - MARGIN, strong ? bold : regular);
    y -= LINE_HEIGHT;
  }

  return pdf.save();
}

/**
 * Loads a sale from this branch and builds its invoice.
 * Returns null when the sale does not exist in the branch.
 */
export async function buildSaleInvoice(saleId: string, branchId: string | null | undefined) {
  const [setting, sale] = await Promise.all([
    prisma.businessSetting.findFirst(),
    prisma.sale.findFirst({
      where: { id: saleId, branchId: branchId ?? undefined },
      include: { customer: true, createdBy: true, items: { include: { product: true, unit: true } } },
    }),
  ]);
  if (!sale) return null;

  const businessName = setting?.businessName ?? DEFAULT_BUSINESS_NAME;
  const pdf = await renderInvoicePdf({
    businessName,
    address: setting?.address,
    phone: setting?.phone,
    invoiceNo: sale.invoiceNo,
    date: new Date(sale.saleDate).toLocaleString(),
    cashier: sale.createdBy.name,
    customer: sale.customer?.name,
    items: sale.items.map((i) => ({
      name: i.product.name,
      sku: i.product.sku,
      qty: Number(i.qty),
      unit: i.unit.code,
      unitPrice: Number(i.unitPrice),
      tax: Number(i.taxAmount),
      discount: Number(i.discountAmount),
      lineTotal: Number(i.lineTotal),
    })),
    subTotal: Number(sale.subTotal),
    tax: Number(sale.taxAmount),
    discount: Number(sale.discountAmount),
    total: Number(sale.totalAmount),
    paid: Number(sale.paidAmount),
    due: Number(sale.dueAmount),
  });

  return { sale, businessName, pdf };
}
