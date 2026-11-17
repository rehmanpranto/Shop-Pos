"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail, PackageCheck, ScanLine } from "lucide-react";
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
    "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm text-zinc-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1b2a44] focus:outline-none focus:ring-4 focus:ring-[#1b2a44]/10";

  return (
    <div className="grid min-h-screen bg-[#f4f6fa] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: navy from the logo, with its roof line drawn large and faint. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1b2a44] p-12 text-white lg:flex xl:p-16">
        <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 -top-10 h-[46rem] w-[46rem] text-white" fill="none">
          {[0, 1, 2, 3, 4].map((step) => (
            <path key={step} d={`M${40 + step * 40} ${330 + step * 0} L300 ${110 + step * 46} L${560 - step * 40} 330`} stroke="currentColor" strokeOpacity={0.07 - step * 0.01} strokeWidth="22" strokeLinejoin="miter" />
          ))}
        </svg>
        <svg aria-hidden="true" viewBox="0 0 600 200" className="pointer-events-none absolute -bottom-6 -left-16 w-[34rem]" fill="none">
          <path d="M20 190 L300 30 L580 190" stroke="#e31b23" strokeOpacity="0.85" strokeWidth="26" />
        </svg>
        <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#2563a6]/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-12 w-12 rounded-2xl" />
          <div>
            <p className="text-lg font-bold leading-tight">{businessName}</p>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{tr("Point of sale")}</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="mb-5 block h-1 w-14 rounded-full bg-[#e31b23]" />
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight xl:text-5xl">{tr("Run your whole shop from one screen.")}</h1>
          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-white ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{tr(title)}</span>
                  <span className="block text-sm leading-relaxed text-slate-300">{tr(text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs tracking-wide text-slate-400">{tr("Sales · Inventory · Purchases · Customers · Reports")}</p>
      </aside>

      <main className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#e31b23]/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#2563a6]/10 blur-3xl" />
        <div className="absolute right-4 top-4">
          <LanguageSwitch />
        </div>

        <div className="pop-in relative w-full max-w-[25rem]">
          <LogoWordmark className="mx-auto mb-8 w-64" alt={businessName} />

          <div className="rounded-[1.75rem] border border-white bg-white/90 p-7 shadow-[0_24px_60px_-20px_rgba(27,42,68,0.25)] backdrop-blur-md sm:p-9">
            <h2 className="text-2xl font-black tracking-tight text-[#1b2a44]">{tr("Welcome back")}</h2>
            <p className="mt-1 text-sm text-slate-500">{tr("Use the email and password your admin gave you.")}</p>

            <form className="mt-7 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">{tr("Email")}</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" autoFocus required placeholder="you@example.com" className={inputClass} />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">{tr("Password")}</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? tr("Hide password") : tr("Show password")}
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {error ? (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b2a44] font-semibold text-white shadow-lg shadow-[#1b2a44]/25 transition hover:bg-[#14203a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1b2a44]/20 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tr("Signing in…")}
                  </>
                ) : (
                  <>
                    {tr("Sign in")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {businessName}
          </p>
        </div>
      </main>
    </div>
  );
}
