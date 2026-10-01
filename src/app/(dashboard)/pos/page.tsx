"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  stockQty: number;
  retailPrice: number;
  baseUnit: { id: string; code: string; name: string };
};

type ProductResponseItem = Omit<Product, "stockQty" | "retailPrice"> & {
  stockQty: number | string;
  retailPrice: number | string;
};

type Customer = { id: string; name: string; customerCode: string };
type Account = { id: string; name: string; method: string };

type CartLine = {
  productId: string;
  name: string;
  unitId: string;
  unitCode: string;
  qty: number;
  unitPrice: number;
};

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [message, setMessage] = useState("");
  const [scanMessage, setScanMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/payment-accounts").then((r) => r.json()),
    ]).then(([p, c, a]) => {
      setProducts((p.data?.items ?? []).map((i: ProductResponseItem) => ({
        ...i,
        stockQty: Number(i.stockQty),
        retailPrice: Number(i.retailPrice),
      })));
      setCustomers(c.data ?? []);
      setAccounts(a.data ?? []);
      setPaymentAccountId(a.data?.[0]?.id ?? "");
    });
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) =>
      `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [products, query]);

  const subtotal = cart.reduce((acc, c) => acc + c.qty * c.unitPrice, 0);

  function addToCart(p: Product) {
    setScanMessage(`${p.name} added - ৳${p.retailPrice.toFixed(2)} each`);
    setCart((old) => {
      const existing = old.find((o) => o.productId === p.id);
      if (existing) {
        return old.map((o) => (o.productId === p.id ? { ...o, qty: o.qty + 1 } : o));
      }
      return [...old, { productId: p.id, name: p.name, unitId: p.baseUnit.id, unitCode: p.baseUnit.code, qty: 1, unitPrice: p.retailPrice }];
    });
  }

  function handleScannerInput() {
    const scannedCode = query.trim().toLowerCase();
    if (!scannedCode) return;

    const scannedProduct = products.find(
      (product) => product.sku.toLowerCase() === scannedCode || product.barcode?.toLowerCase() === scannedCode,
    );
    if (scannedProduct && scannedProduct.stockQty > 0) {
      addToCart(scannedProduct);
      setQuery("");
    } else {
      setScanMessage("No matching product with available stock");
    }
  }

  async function checkout() {
    if (cart.length === 0) return;
    const payload = {
      customerId: selectedCustomerId || undefined,
      notes: "POS checkout",
      discountAmount: 0,
      taxAmount: 0,
      items: cart.map((c) => ({ productId: c.productId, unitId: c.unitId, qty: c.qty, unitPrice: c.unitPrice, discountAmount: 0, taxAmount: 0 })),
      payments: [
        {
          accountId: paymentAccountId,
          method: accounts.find((a) => a.id === paymentAccountId)?.method ?? "CASH",
          amount: paymentAmount > 0 ? paymentAmount : subtotal,
        },
      ],
    };

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());

    if (res.success) {
      setMessage(`Sale created: ${res.data.invoiceNo}`);
      setCart([]);
      setPaymentAmount(0);
    } else {
      setMessage(res.error?.message ?? "Failed to create sale");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold">POS Terminal</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScannerInput();
              }
            }}
            placeholder="Search or scan barcode"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 md:w-80"
          />
        </div>
        {scanMessage ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{scanMessage}</p> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, 60).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p)}
              disabled={p.stockQty <= 0}
              className="rounded-xl border border-zinc-200 p-3 text-left hover:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-zinc-500">{p.sku}</p>
              <p className="mt-1 text-sm">Stock: {p.stockQty}</p>
              <p className="text-sm font-semibold">৳{p.retailPrice.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-lg font-bold">Current Sale</h3>
        <div className="mt-3 space-y-2">
          {cart.map((c) => (
            <div key={c.productId} className="rounded-lg border border-zinc-200 p-2 text-sm">
              <p className="font-semibold">{c.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label>Qty</label>
                <input
                  type="number"
                  value={c.qty}
                  min={1}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    setCart((old) => old.map((o) => (o.productId === c.productId ? { ...o, qty } : o)));
                  }}
                  className="w-20 rounded border border-zinc-300 px-2 py-2"
                />
                <label>Price</label>
                <input
                  type="number"
                  value={c.unitPrice}
                  min={0}
                  onChange={(e) => {
                    const unitPrice = Number(e.target.value);
                    setCart((old) => old.map((o) => (o.productId === c.productId ? { ...o, unitPrice } : o)));
                  }}
                  className="w-28 rounded border border-zinc-300 px-2 py-2"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-600">
                <span>Unit price: ৳{c.unitPrice.toFixed(2)}</span>
                <span className="font-semibold text-zinc-900">Line total: ৳{(c.qty * c.unitPrice).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2">
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>
            ))}
          </select>

          <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.method})</option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            placeholder="Paid amount (leave 0 for full payment)"
            className="w-full rounded border border-zinc-300 px-3 py-2"
          />

          <div className="rounded-lg bg-zinc-100 p-3 text-sm">
            <p>Subtotal: ৳{subtotal.toFixed(2)}</p>
            <p>Due: ৳{Math.max(subtotal - (paymentAmount || subtotal), 0).toFixed(2)}</p>
          </div>

          <button onClick={checkout} className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white">
            Complete Transaction
          </button>
        </div>

        {message ? <p className="mt-3 text-sm font-medium text-zinc-700">{message}</p> : null}
      </section>
    </div>
  );
}
