"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_COOKIE, translate, type Language, type TranslationKey } from "@/lib/i18n";
import type { Role } from "@/lib/page-access";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

type AppContextValue = {
  user: CurrentUser;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ user, initialLanguage, children }: { user: CurrentUser; initialLanguage: Language; children: ReactNode }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback(
    (next: Language) => {
      document.cookie = `${LANGUAGE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setLanguageState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ user, language, setLanguage, t: (key: TranslationKey) => translate(language, key) }), [user, language, setLanguage]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside the app shell");
  return value;
}
