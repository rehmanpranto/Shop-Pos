"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, PackageCheck, ScanLine } from "lucide-react";
import { LogoMark, LogoWordmark } from "@/components/brand/logo-mark";
import { LanguageSwitch, useTr } from "@/components/layout/language";

const highlights = [
  { icon: ScanLine, title: "Fast checkout", text: "Scan, take payment and print the invoice in seconds." },
  { icon: PackageCheck, title: "Stock you can trust", text: "Every sale, purchase and return updates stock automatically." },
  { icon: BarChart3, title: "Know your profit", text: "Daily sales, expenses and dues in one place." },
];

export function LoginForm({ businessName }: { businessName: string }) {
  const tr = useTr();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (!result || result.error) {
      setLoading(false);
      setError(tr("That email and password don't match. Check them and try again."));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-accent opacity-10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <span className="text-lg font-bold">{businessName}</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-black leading-tight tracking-tight">{tr("Run your whole shop from one screen.")}</h1>
          <ul className="mt-10 space-y-6">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{tr(title)}</span>
                  <span className="block text-sm text-slate-300">{tr(text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">{tr("Sales · Inventory · Purchases · Customers · Reports")}</p>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-10">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-4 top-4">
          <LanguageSwitch />
        </div>
        <div className="relative w-full max-w-sm rounded-[2rem] border border-white/90 bg-white/78 p-7 shadow-[0_18px_50px_rgba(39,70,100,0.08)] backdrop-blur-md sm:p-9">
          <LogoWordmark className="mb-8 w-56 lg:hidden" alt={businessName} />

          <h2 className="text-3xl font-black tracking-tight text-zinc-900">{tr("Sign in")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{tr("Use the email and password your admin gave you.")}</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">{tr("Email")}</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" autoFocus required className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">{tr("Password")}</span>
              <span className="relative block">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? tr("Hide password") : tr("Show password")}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-brand font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-60">
              {loading ? tr("Signing in…") : tr("Sign in")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
