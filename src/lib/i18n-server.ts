import { cache } from "react";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, translatePhrase, type Language, type Translate } from "@/lib/i18n";

/** The language chosen in the browser, read once per request. */
export const getLanguage = cache(async (): Promise<Language> => {
  return (await cookies()).get(LANGUAGE_COOKIE)?.value === "bn" ? "bn" : "en";
});

/** For pages rendered on the server: const tr = await getTr(); tr("Save"); tr("{0} sales", count). */
export const getTr = cache(async (): Promise<Translate> => {
  const language = await getLanguage();
  return (text, ...values) => translatePhrase(language, text, values);
});
