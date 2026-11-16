"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { translate, type Language, type TranslationKey } from "@/lib/i18n";
import { useLanguage } from "@/components/layout/language";
import type { Role } from "@/lib/page-access";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

type AppContextValue = {
  user: CurrentUser;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();

  const value = useMemo(() => ({ user, language, setLanguage, t: (key: TranslationKey) => translate(language, key) }), [user, language, setLanguage]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside the app shell");
  return value;
}
