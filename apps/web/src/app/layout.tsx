import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal"],
  variable: "--font-serif",
});

const sans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://continuumalternatives.com"),
  title: {
    default: "Continuum Alternatives",
    template: "%s — Continuum Alternatives",
  },
  description: "The record of private capital in emerging Europe.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    siteName: "Continuum Alternatives",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <SiteFooter />
        {plausibleDomain ? (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        ) : null}
      </body>
    </html>
  );
}
