"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle2, FileText, Minus, PackageSearch, PauseCircle, Plus, Printer, ScanLine, ShoppingCart, Trash2, X } from "lucide-react";
import { sendJson } from "@/lib/client-api";
import { formatDateTime, formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/components/layout/app-context";
import { useTr } from "@/components/layout/language";

type UnitOption = { id: string; code: string; factor: number };

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  stockQty: number;
  retailPrice: number;
  wholesalePrice: number;
  minSellingPrice: number;
  category: { id: string; name: string } | null;
  baseUnit: { id: string; code: string };
  /** Units this product can be sold in. The base unit is always first, with factor 1. */
  units: UnitOption[];
};

type RawProduct = Omit<Product, "stockQty" | "retailPrice" | "wholesalePrice" | "minSellingPrice" | "units"> &
  Record<"stockQty" | "retailPrice" | "wholesalePrice" | "minSellingPrice", number | string> & {
    isActive: boolean;
    unitConversions: Array<{ fromUnitId: string; factor: number | string; fromUnit: { code: string } }>;
  };

type Customer = { id: string; name: string; customerCode: string; priceLevel: string };
type Account = { id: string; name: string; method: string };

type CartLine = {
  productId: string;
  unitId: string;
  qty: number;
  unitPrice: number;
  /** True once the cashier typed a price, so switching customer no longer reprices the line. */
  priceEdited: boolean;
};

type PaymentRow = { key: number; accountId: string; amount: string };
type HeldSale = { id: string; savedAt: string; label: string; cart: CartLine[]; customerId: string; discount: string };
type CompletedSale = { id: string; invoiceNo: string; total: number; paid: number; change: number; due: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products?pageSize=2000").then((r) => r.json());
  return ((res.data?.items ?? []) as RawProduct[])
    .filter((item) => item.isActive)
    .map((item) => ({
      ...item,
      stockQty: Number(item.stockQty),
      retailPrice: Number(item.retailPrice),
      wholesalePrice: Number(item.wholesalePrice),
      minSellingPrice: Number(item.minSellingPrice),
      units: [
        { id: item.baseUnit.id, code: item.baseUnit.code, factor: 1 },
        ...item.unitConversions.map((c) => ({ id: c.fromUnitId, code: c.fromUnit.code, factor: Number(c.factor) })),
      ],
    }));
}

function quickAmounts(total: number): number[] {
  if (total <= 0) return [];
  const options = new Set<number>();
  for (const step of [50, 100, 500, 1000]) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total) options.add(rounded);
  }
  return [...options].sort((a, b) => a - b).slice(0, 3);
}

// Held sales live in this browser only, so a parked cart survives a page reload.
const HELD_EVENT = "pos-held-changed";
function subscribeHeld(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(HELD_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(HELD_EVENT, callback);
  };
}

export default function PosPage() {
  const tr = useTr();
  const toast = useToast();
  const { user, t } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);
  const cartRef = useRef<HTMLElement>(null);
  const checkoutAreaRef = useRef<HTMLDivElement>(null);
  const canOverridePrice = user.role === "ADMIN" || user.role === "MANAGER";
  const heldKey = `pos-held-${user.id}`;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([{ key: 0, accountId: "", amount: "" }]);
  const [quotation, setQuotation] = useState<{ id: string; quotationNo: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const [heldOpen, setHeldOpen] = useState(false);
  const [cartInView, setCartInView] = useState(false);

  // On phones the cart sits below the products. Track whether the checkout button is on screen
  // so the pinned "view cart" bar can step aside instead of covering it.
  useEffect(() => {
    const target = checkoutAreaRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCartInView(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const heldRaw = useSyncExternalStore(
    subscribeHeld,
    () => window.localStorage.getItem(heldKey) ?? "[]",
    () => "[]",
  );
  const held = useMemo<HeldSale[]>(() => {
    try {
      return JSON.parse(heldRaw) as HeldSale[];
    } catch {
      return [];
    }
  }, [heldRaw]);
  const saveHeld = useCallback(
    (next: HeldSale[]) => {
      window.localStorage.setItem(heldKey, JSON.stringify(next));
      window.dispatchEvent(new Event(HELD_EVENT));
    },
    [heldKey],
  );

  const loadProducts = useCallback(async () => {
    setProducts(await fetchProducts());
  }, []);

  useEffect(() => {
    let active = true;
    const quotationId = new URLSearchParams(window.location.search).get("quotation");
    Promise.all([
      fetchProducts(),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/payment-accounts").then((r) => r.json()),
      quotationId ? fetch(`/api/quotations/${quotationId}`).then((r) => r.json()) : null,
    ])
      .then(([items, c, a, q]) => {
        if (!active) return;
        const sorted: Account[] = [...(a.data ?? [])].sort((x: Account, y: Account) => Number(y.method === "CASH") - Number(x.method === "CASH"));
        setProducts(items);
        setCustomers(c.data ?? []);
        setAccounts(sorted);
        setPayments([{ key: 0, accountId: sorted[0]?.id ?? "", amount: "" }]);

        if (q?.success) {
          // Bring a quotation's lines into the cart at the quoted prices.
          const known = new Set(items.map((p) => p.id));
          type QuotedItem = { productId: string; unitId: string; qty: string; unitPrice: string };
          setCart(
            (q.data.items as QuotedItem[])
              .filter((item) => known.has(item.productId))
              .map((item) => ({ productId: item.productId, unitId: item.unitId, qty: Number(item.qty), unitPrice: Number(item.unitPrice), priceEdited: true })),
          );
          setCustomerId(q.data.customerId ?? "");
          setDiscount(Number(q.data.discountAmount) > 0 ? String(Number(q.data.discountAmount)) : "");
          setQuotation({ id: q.data.id, quotationNo: q.data.quotationNo });
          window.history.replaceState(null, "", "/pos");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const customer = customers.find((c) => c.id === customerId);
  const wholesale = customer?.priceLevel === "WHOLESALE";
  const basePrice = (p: Product, isWholesale: boolean) => (isWholesale ? p.wholesalePrice : p.retailPrice);

  const categories = useMemo(() => {
    const names = new Map<string, string>();
    products.forEach((p) => p.category && names.set(p.category.id, p.category.name));
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(
      (p) => (!category || p.category?.id === category) && (!needle || `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [products, query, category]);

  const lines = cart.flatMap((line) => {
    const product = productById.get(line.productId);
    if (!product) return [];
    const unit = product.units.find((u) => u.id === line.unitId) ?? product.units[0];
    return [{ ...line, product, unit, baseQty: line.qty * unit.factor, minPrice: round2(product.minSellingPrice * unit.factor), total: round2(line.qty * line.unitPrice) }];
  });
  const subtotal = round2(lines.reduce((sum, line) => sum + line.total, 0));
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = round2(subtotal - discountValue);
  const itemCount = lines.length;

  // The first payment row is what the customer hands over (it may be more than needed, giving change).
  // Extra rows are exact amounts paid another way.
  const extraPaid = round2(payments.slice(1).reduce((sum, row) => sum + Math.max(Number(row.amount) || 0, 0), 0));
  const needed = round2(Math.max(total - extraPaid, 0));
  const firstReceived = payments[0].amount === "" ? needed : Math.max(Number(payments[0].amount) || 0, 0);
  const firstPaid = round2(Math.min(firstReceived, needed));
  const paid = round2(firstPaid + Math.min(extraPaid, total));
  const change = round2(Math.max(firstReceived - needed, 0));
  const due = round2(Math.max(total - paid, 0));

  const problem = (() => {
    if (lines.length === 0) return tr("Add a product to start");
    const bad = lines.find((line) => !(line.qty > 0));
    if (bad) return tr("Enter a quantity for {0}", bad.product.name);
    const over = lines.find((line) => line.baseQty > line.product.stockQty + 1e-9);
    if (over) return tr("Only {0} {1} of {2} in stock", formatQty(over.product.stockQty), over.product.baseUnit.code, over.product.name);
    const cheap = lines.find((line) => !(line.unitPrice > 0) || (!canOverridePrice && line.unitPrice < line.minPrice));
    if (cheap) return cheap.unitPrice > 0 ? tr("{0} cannot sell below {1}", cheap.product.name, formatMoney(cheap.minPrice)) : tr("Enter a price for {0}", cheap.product.name);
    if (total <= 0) return tr("Total must be more than zero");
    if (extraPaid > total) return tr("The split payments add up to more than the total");
    if (payments.some((row, i) => !row.accountId && (i === 0 || Number(row.amount) > 0))) return tr("Choose how the customer is paying");
    if (new Set(payments.map((row) => row.accountId)).size !== payments.length) return tr("The same payment method is listed twice");
    if (paid <= 0) return tr("Enter the amount received");
    if (due > 0 && !customerId) return tr("Pick a customer to sell on credit");
    return "";
  })();

  function addToCart(p: Product) {
    if (p.stockQty <= 0) {
      toast(tr("{0} is out of stock", p.name), "error");
      return;
    }
    setCart((old) => {
      const existing = old.find((line) => line.productId === p.id);
      if (existing) {
        const factor = p.units.find((u) => u.id === existing.unitId)?.factor ?? 1;
        if ((existing.qty + 1) * factor > p.stockQty) {
          toast(tr("Only {0} {1} of {2} in stock", formatQty(p.stockQty), p.baseUnit.code, p.name), "error");
          return old;
        }
        return old.map((line) => (line.productId === p.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...old, { productId: p.id, unitId: p.baseUnit.id, qty: 1, unitPrice: basePrice(p, wholesale), priceEdited: false }];
    });
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((old) => old.map((line) => (line.productId === productId ? { ...line, ...patch } : line)));
  }

  function changeUnit(product: Product, unitId: string) {
    const unit = product.units.find((u) => u.id === unitId) ?? product.units[0];
    updateLine(product.id, { unitId: unit.id, unitPrice: round2(basePrice(product, wholesale) * unit.factor), priceEdited: false });
  }

  function changeCustomer(id: string) {
    setCustomerId(id);
    const isWholesale = customers.find((c) => c.id === id)?.priceLevel === "WHOLESALE";
    setCart((old) =>
      old.map((line) => {
        const product = productById.get(line.productId);
        if (!product || line.priceEdited) return line;
        const factor = product.units.find((u) => u.id === line.unitId)?.factor ?? 1;
        return { ...line, unitPrice: round2(basePrice(product, isWholesale) * factor) };
      }),
    );
  }

  const resetSale = useCallback(() => {
    setCart([]);
    setDiscount("");
    setCustomerId("");
    setQuery("");
    setQuotation(null);
    setPayments((old) => [{ key: 0, accountId: old[0]?.accountId ?? "", amount: "" }]);
  }, []);

  function holdSale() {
    if (cart.length === 0) return;
    const label = customer?.name ?? `${lines[0].product.name}${lines.length > 1 ? ` +${lines.length - 1}` : ""}`;
    saveHeld([{ id: `${Date.now()}`, savedAt: new Date().toISOString(), label, cart, customerId, discount }, ...held]);
    resetSale();
    toast("Sale put on hold");
    searchRef.current?.focus();
  }

  function resumeSale(sale: HeldSale) {
    if (cart.length > 0) {
      toast("Finish or hold the current sale first", "error");
      return;
    }
    setCart(sale.cart.filter((line) => productById.has(line.productId)));
    setCustomerId(customers.some((c) => c.id === sale.customerId) ? sale.customerId : "");
    setDiscount(sale.discount);
    saveHeld(held.filter((item) => item.id !== sale.id));
    setHeldOpen(false);
  }

  function handleScan() {
    const code = query.trim().toLowerCase();
    if (!code) return;
    const exact = products.find((p) => p.sku.toLowerCase() === code || p.barcode?.toLowerCase() === code);
    const match = exact ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (match) {
      addToCart(match);
      setQuery("");
    } else {
      toast(filtered.length === 0 ? tr("No product matches that code") : tr("More than one match. Tap the product you want."), "error");
    }
  }

  async function checkout() {
    if (problem || submitting) return;
    setSubmitting(true);
    const methodOf = (accountId: string) => accounts.find((a) => a.id === accountId)?.method ?? "CASH";
    const paymentPayload = [
      { accountId: payments[0].accountId, method: methodOf(payments[0].accountId), amount: firstPaid },
      ...payments.slice(1).map((row) => ({ accountId: row.accountId, method: methodOf(row.accountId), amount: round2(Number(row.amount) || 0) })),
    ].filter((payment) => payment.amount > 0);

    const result = await sendJson<{ id: string; invoiceNo: string }>("/api/sales", {
      customerId: customerId || undefined,
      notes: quotation ? tr("From quotation {0}", quotation.quotationNo) : tr("POS checkout"),
      discountAmount: discountValue,
      taxAmount: 0,
      items: lines.map((line) => ({ productId: line.productId, unitId: line.unit.id, qty: line.qty, unitPrice: line.unitPrice, discountAmount: 0, taxAmount: 0 })),
      payments: paymentPayload,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    if (quotation) void sendJson(`/api/quotations/${quotation.id}`, { status: "ACCEPTED" }, "PATCH");
    setCompleted({ id: result.data.id, invoiceNo: result.data.invoiceNo, total, paid, change, due });
    resetSale();
    loadProducts();
  }

  // The shortcut listener is attached once, so it reaches the latest checkout through a ref.
  const checkoutRef = useRef(checkout);
  useEffect(() => {
    checkoutRef.current = checkout;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "F9" || ((event.metaKey || event.ctrlKey) && event.key === "Enter")) {
        event.preventDefault();
        void checkoutRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeCompleted = useCallback(() => {
    setCompleted(null);
    searchRef.current?.focus();
  }, []);
  const closeHeld = useCallback(() => setHeldOpen(false), []);

  return (
    <div className={cn("grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_450px]", lines.length > 0 && !cartInView && "pb-24 xl:pb-0")}>
      {/* Products */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScan();
              }
            }}
            placeholder={t("pos.search")}
            aria-label={t("pos.search")}
            className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-11 pr-4 text-base sm:pr-24 placeholder:text-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-zinc-400 sm:block">{tr("press")}{" "}<kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 font-semibold">/</kbd>
          </span>
        </div>

        {categories.length > 0 ? (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {[["", t("pos.all")], ...categories].map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                aria-pressed={category === id}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition sm:h-8 sm:px-3",
                  category === id ? "border-brand bg-brand text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <PackageSearch className="h-10 w-10 text-zinc-300" />
              <p className="mt-3 font-semibold text-zinc-900">{products.length === 0 ? tr("No products yet") : tr("No product matches")}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {products.length === 0 ? tr("Add products on the Products page, then come back to sell.") : tr("Try a different name, SKU or category.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {filtered.slice(0, 120).map((p) => {
                const inCart = cart.find((line) => line.productId === p.id)?.qty ?? 0;
                const out = p.stockQty <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={cn(
                      "relative flex min-h-24 flex-col rounded-xl border p-3 text-left transition",
                      out ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60" : "border-zinc-200 hover:border-brand hover:shadow-md active:scale-[0.98]",
                      inCart > 0 && "border-brand bg-brand-soft/50",
                    )}
                  >
                    {inCart > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                        {formatQty(inCart)}
                      </span>
                    ) : null}
                    <span className="line-clamp-2 text-sm font-semibold text-zinc-900">{p.name}</span>
                    <span className="mt-0.5 text-xs text-zinc-500">{p.sku}</span>
                    <span className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <span className="tabular text-base font-bold text-zinc-900">{formatMoney(basePrice(p, wholesale))}</span>
                      <span className={cn("text-xs font-medium", out ? "text-red-600" : "text-zinc-500")}>
                        {out ? t("pos.outOfStock") : `${formatQty(p.stockQty)} ${p.baseUnit.code}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Cart */}
      <section ref={cartRef} className="scroll-mt-20 rounded-2xl border border-zinc-200 bg-white shadow-sm xl:sticky xl:top-20">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-zinc-900">
            <ShoppingCart className="h-5 w-5 shrink-0 text-brand" />
            <span className="truncate">{t("pos.currentSale")}</span>
            {itemCount > 0 ? (
              <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 sm:inline">
                {itemCount} {t("pos.items")}
              </span>
            ) : null}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {held.length > 0 ? (
              <button type="button" onClick={() => setHeldOpen(true)} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                {t("pos.held")} ({held.length})
              </button>
            ) : null}
            {lines.length > 0 ? (
              <>
                <button type="button" onClick={holdSale} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                  <PauseCircle className="h-3.5 w-3.5" />
                  {t("pos.hold")}
                </button>
                <button type="button" onClick={resetSale} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("pos.clear")}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {quotation ? <p className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-800">{tr("From quotation")}{" "}{quotation.quotationNo}{tr(", at the quoted prices")}</p> : null}

        <div className="max-h-[34vh] overflow-y-auto px-4">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">{t("pos.empty")}</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {lines.map((line) => {
                const overStock = line.baseQty > line.product.stockQty + 1e-9;
                const belowMin = line.unitPrice < line.minPrice;
                const remove = () => setCart((old) => old.filter((l) => l.productId !== line.productId));
                return (
                  <li key={line.productId} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{line.product.name}</p>
                      <button type="button" onClick={remove} aria-label={tr("Remove {0}", line.product.name)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border border-zinc-300">
                        <button
                          type="button"
                          aria-label={tr("Decrease quantity")}
                          onClick={() => (line.qty <= 1 ? remove() : updateLine(line.productId, { qty: round2(line.qty - 1) }))}
                          className="flex h-11 w-11 items-center justify-center text-zinc-600 hover:bg-zinc-100 sm:h-9 sm:w-9"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={Number.isFinite(line.qty) ? line.qty : ""}
                          onChange={(e) => updateLine(line.productId, { qty: e.target.value === "" ? NaN : Number(e.target.value) })}
                          aria-label={tr("Quantity of {0}", line.product.name)}
                          className="tabular h-11 w-14 border-x border-zinc-300 text-center text-sm font-semibold focus:outline-none sm:h-9"
                        />
                        <button
                          type="button"
                          aria-label={tr("Increase quantity")}
                          disabled={((line.qty || 0) + 1) * line.unit.factor > line.product.stockQty}
                          onClick={() => updateLine(line.productId, { qty: round2((line.qty || 0) + 1) })}
                          className="flex h-11 w-11 items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 sm:h-9 sm:w-9"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {line.product.units.length > 1 ? (
                        <select
                          aria-label={tr("Unit for {0}", line.product.name)}
                          value={line.unit.id}
                          onChange={(e) => changeUnit(line.product, e.target.value)}
                          className="h-11 rounded-lg border border-zinc-300 bg-white px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 sm:h-9"
                        >
                          {line.product.units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-semibold text-zinc-500">{line.unit.code}</span>
                      )}
                      <span className="text-xs text-zinc-400">×</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={Number.isFinite(line.unitPrice) ? line.unitPrice : ""}
                        onChange={(e) => updateLine(line.productId, { unitPrice: e.target.value === "" ? NaN : Number(e.target.value), priceEdited: true })}
                        aria-label={tr("Unit price of {0}", line.product.name)}
                        className={cn("tabular h-11 w-24 rounded-lg border px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 sm:h-9", belowMin ? "border-red-400 text-red-700" : "border-zinc-300")}
                      />
                      <span className="tabular ml-auto text-sm font-bold text-zinc-900">{formatMoney(line.total || 0)}</span>
                    </div>
                    {overStock ? (
                      <p className="mt-1 text-xs font-medium text-red-600">{tr("Only")}{" "}{formatQty(line.product.stockQty)} {line.product.baseUnit.code}{" "}{tr("in stock")}</p>
                    ) : belowMin ? (
                      <p className={cn("mt-1 text-xs font-medium", canOverridePrice ? "text-amber-700" : "text-red-600")}>
                        {canOverridePrice ? tr("Below the minimum price of {0}. Allowed for your role.", formatMoney(line.minPrice)) : tr("Minimum price is {0}", formatMoney(line.minPrice))}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-zinc-200 bg-zinc-50/70 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block sm:col-span-1">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">{t("pos.customer")}</span>
              <select value={customerId} onChange={(e) => changeCustomer(e.target.value)} className={inputClass}>
                <option value="">{t("pos.walkIn")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.priceLevel === "WHOLESALE" ? tr(" (wholesale)") : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 block sm:col-span-1">
              <span className="mb-1 block text-xs font-semibold text-zinc-600">{t("pos.discount")}</span>
              <input type="number" inputMode="decimal" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" className={cn(inputClass, "tabular text-right")} />
            </label>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold text-zinc-600">{t("pos.payments")}</span>
            <div className="space-y-2">
              {payments.map((row, index) => (
                <div key={row.key} className="flex items-center gap-2">
                  <select
                    aria-label={tr("Payment method")}
                    value={row.accountId}
                    onChange={(e) => setPayments((old) => old.map((r) => (r.key === row.key ? { ...r, accountId: e.target.value } : r)))}
                    className={cn(inputClass, "min-w-0 flex-1")}
                  >
                    {index > 0 ? <option value="">{tr("Choose…")}</option> : null}
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={row.amount}
                    onChange={(e) => setPayments((old) => old.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))}
                    placeholder={index === 0 ? (needed > 0 ? tr("{0} (full)", needed.toFixed(2)) : "0.00") : "0.00"}
                    aria-label={index === 0 ? tr("Amount received") : tr("Amount paid this way")}
                    className={cn(inputClass, "tabular w-36 text-right")}
                  />
                  {index > 0 ? (
                    <button
                      type="button"
                      aria-label={tr("Remove payment")}
                      onClick={() => setPayments((old) => old.filter((r) => r.key !== row.key))}
                      className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {quickAmounts(needed).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setPayments((old) => old.map((r, i) => (i === 0 ? { ...r, amount: String(amount) } : r)))}
                  className="tabular h-10 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 sm:h-8 sm:px-2.5"
                >
                  {amount.toLocaleString("en-US")}
                </button>
              ))}
              {payments.length < Math.min(accounts.length, 3) ? (
                <button
                  type="button"
                  onClick={() => setPayments((old) => [...old, { key: Math.max(...old.map((r) => r.key)) + 1, accountId: "", amount: "" }])}
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand hover:bg-brand-soft"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("pos.addPayment")}
                </button>
              ) : null}
            </div>
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-zinc-600">
              <dt>{t("pos.subtotal")}</dt>
              <dd className="tabular">{formatMoney(subtotal)}</dd>
            </div>
            {discountValue > 0 ? (
              <div className="flex justify-between text-zinc-600">
                <dt>{t("pos.discount")}</dt>
                <dd className="tabular">-{formatMoney(discountValue)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-zinc-200 pt-2">
              <dt className="text-base font-bold text-zinc-900">{t("pos.total")}</dt>
              <dd className="tabular text-2xl font-black text-zinc-900">{formatMoney(total)}</dd>
            </div>
            {change > 0 ? (
              <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                <dt>{t("pos.change")}</dt>
                <dd className="tabular">{formatMoney(change)}</dd>
              </div>
            ) : null}
            {due > 0 && lines.length > 0 ? (
              <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                <dt>
                  {t("pos.onCredit")}
                  {customer ? ` (${customer.name})` : ""}
                </dt>
                <dd className="tabular">{formatMoney(due)}</dd>
              </div>
            ) : null}
          </dl>

          <div ref={checkoutAreaRef}>
            <Button size="lg" className="w-full" onClick={checkout} disabled={Boolean(problem) || submitting}>
              {submitting ? t("pos.saving") : `${t("pos.complete")} · ${formatMoney(total)}`}
            </Button>
          </div>
          <p className={cn("text-center text-xs", problem && lines.length > 0 ? "font-medium text-red-600" : "text-zinc-500")}>
            {problem && lines.length > 0 ? problem : t("pos.shortcut")}
          </p>
        </div>
      </section>

      {lines.length > 0 && !cartInView ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur xl:hidden">
          <button
            type="button"
            onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex h-12 w-full items-center justify-between rounded-xl bg-brand px-4 font-semibold text-white active:bg-brand-dark"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {itemCount} {t("pos.items")}
            </span>
            <span className="tabular text-lg font-black">{formatMoney(total)}</span>
          </button>
        </div>
      ) : null}

      <Modal open={completed !== null} onClose={closeCompleted} title={t("pos.saleComplete")} size="sm">
        {completed ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <p className="mt-2 text-sm text-zinc-500">{tr("Invoice")}{" "}{completed.invoiceNo}</p>
            <p className="tabular text-3xl font-black text-zinc-900">{formatMoney(completed.total)}</p>
            <dl className="mt-4 space-y-1 rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">{t("pos.paid")}</dt>
                <dd className="tabular font-semibold">{formatMoney(completed.paid)}</dd>
              </div>
              {completed.change > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>{t("pos.change")}</dt>
                  <dd className="tabular font-bold">{formatMoney(completed.change)}</dd>
                </div>
              ) : null}
              {completed.due > 0 ? (
                <div className="flex justify-between text-amber-700">
                  <dt>{t("pos.onCredit")}</dt>
                  <dd className="tabular font-bold">{formatMoney(completed.due)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`/receipt/${completed.id}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                <Printer className="h-4 w-4" />
                {t("pos.printReceipt")}
              </a>
              <a href={`/api/sales/${completed.id}/invoice`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                <FileText className="h-4 w-4" />
                {t("pos.a4Invoice")}
              </a>
            </div>
            <Button className="mt-2 w-full" onClick={closeCompleted} data-autofocus>
              {t("pos.newSale")}
            </Button>
          </div>
        ) : null}
      </Modal>

      <Modal open={heldOpen} onClose={closeHeld} title={t("pos.held")} description={tr("Parked on this computer. Resume one to carry on where you stopped.")} size="sm">
        <ul className="divide-y divide-zinc-100">
          {held.map((sale) => (
            <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{sale.label}</p>
                <p className="text-xs text-zinc-500">
                  {sale.cart.length}{" "}{tr("item")}{sale.cart.length === 1 ? "" : "s"} · {formatDateTime(sale.savedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" onClick={() => resumeSale(sale)}>
                  {t("pos.resume")}
                </Button>
                <Button size="sm" variant="ghost" aria-label={tr("Delete held sale")} onClick={() => saveHeld(held.filter((item) => item.id !== sale.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
