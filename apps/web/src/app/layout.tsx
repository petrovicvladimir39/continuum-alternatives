import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

/**
 * FRONTEND-V2 structural change: the root layout is now chrome-free —
 * SiteHeader/SiteFooter (and their data fetching) moved verbatim into
 * <SiteChrome> (src/components/site-chrome.tsx), rendered by the (site),
 * admin and ecosystem layouts. Production output is unchanged; the (v2)
 * route group supplies its own shell.
 */

// Clerk is active only when both keys exist (Phase 24A). Without them the
// public site runs untouched and /admin + /account 404 in the middleware.
const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

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
  description:
    "The map of European alternative assets — private equity, venture capital, private credit, distressed, and the institutions around them.",
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

  const page = (
    // suppressHydrationWarning: the (v2) group stamps v2-root/data-v2-theme on
    // <html> pre-paint (theme boot); attributes-only, standard next-themes
    // pattern, no effect on production routes.
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {children}
        {plausibleDomain ? (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        ) : null}
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider appearance={clerkAppearance}>{page}</ClerkProvider> : page;
}
