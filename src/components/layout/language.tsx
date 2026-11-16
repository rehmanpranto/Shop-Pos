"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE, translatePhrase, type Language, type Translate } from "@/lib/i18n";

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; tr: Translate };

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Holds the chosen language (English or Bangla) for every screen, signed in or not. */
export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: ReactNode }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback(
    (next: Language) => {
      document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      setLanguageState(next);
      // Pages rendered on the server pick the language up from the cookie.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, tr: (text, ...values) => translatePhrase(language, text, values) }),
    [language, setLanguage],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

/** Translates English on-screen text into the chosen language: tr("Save") or tr("{0} sales", count). */
export function useTr(): Translate {
  return useLanguage().tr;
}

/** Two-button English / বাংলা switch. */
export function LanguageSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { language, setLanguage } = useLanguage();
  const base = "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors";
  const active = tone === "dark" ? "bg-white text-slate-900" : "bg-brand text-white";
  const idle = tone === "dark" ? "text-white/70 hover:text-white" : "text-zinc-600 hover:text-zinc-900";
  return (
    <div role="group" aria-label="Language" className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${tone === "dark" ? "border-white/20" : "border-zinc-200 bg-white"}`}>
      <button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")} className={`${base} ${language === "en" ? active : idle}`}>
        English
      </button>
      <button type="button" aria-pressed={language === "bn"} onClick={() => setLanguage("bn")} className={`${base} ${language === "bn" ? active : idle}`}>
        বাংলা
      </button>
    </div>
  );
}
