import type { Metadata, Viewport } from "next";
import { Geist_Mono, Hind_Siliguri, Montserrat } from "next/font/google";
import { LanguageProvider } from "@/components/layout/language";
import { getLanguage } from "@/lib/i18n-server";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

// Montserrat has no Bangla letters; this font is used for them.
const hindSiliguri = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rahman Hardware, Sanitary and Electronic",
  description: "Sales, stock and accounts for Rahman Hardware, Sanitary and Electronic",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f2236",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await getLanguage();
  return (
    <html
      lang={language}
      className={`${montserrat.variable} ${hindSiliguri.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
