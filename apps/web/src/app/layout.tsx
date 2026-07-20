import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  classifiedLabel,
  frontHrefFor,
  meetsCoverageThreshold,
  VERTICALS,
  type NavLeaf,
} from "@continuum/shared";
import { strategyCoverage } from "@continuum/db";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type HeaderIdentity } from "@/components/site-header";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

/**
 * Coverage-gated Markets ▾ extras (Phase 26C): taxonomy strategies above
 * the render threshold whose front is NOT one of the curated six join the
 * dropdown dynamically. Below threshold they exist only on /coverage.
 */
async function marketExtras(): Promise<NavLeaf[]> {
  try {
    const coverage = await strategyCoverage();
    const curatedHrefs = new Set(VERTICALS.map((v) => `/markets/${v.slug}`));
    const extras: NavLeaf[] = [];
    for (const row of coverage) {
      if (!meetsCoverageThreshold(row)) {
        continue;
      }
      const href = frontHrefFor(row.assetClass, row.strategy);
      if (curatedHrefs.has(href) || extras.some((e) => e.href === href)) {
        continue;
      }
      extras.push({ label: classifiedLabel(row.assetClass, row.strategy), href });
    }
    return extras.sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

// Clerk is active only when both keys exist (Phase 24A). Without them the
// public site runs untouched and /admin + /account 404 in the middleware.
const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

async function headerIdentity(): Promise<HeaderIdentity> {
  if (!clerkEnabled) {
    return { status: "off" };
  }
  const { userId } = await auth();
  if (userId === null) {
    return { status: "anon" };
  }
  const user = await currentUser();
  const name =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Account";
  return { status: "signed_in", name };
}

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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const [identity, extras] = await Promise.all([headerIdentity(), marketExtras()]);

  const page = (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader identity={identity} marketExtras={extras} />
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <SiteFooter />
        {plausibleDomain ? (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        ) : null}
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider appearance={clerkAppearance}>{page}</ClerkProvider> : page;
}
