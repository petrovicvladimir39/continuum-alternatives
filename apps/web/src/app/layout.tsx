import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type HeaderIdentity } from "@/components/site-header";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

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
  const identity = await headerIdentity();

  const page = (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader identity={identity} />
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
