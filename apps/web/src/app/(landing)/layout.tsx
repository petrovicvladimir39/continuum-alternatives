import type { Metadata } from "next";
import type { ReactNode } from "react";
import { V2_THEME_BOOT_SCRIPT, V2ThemeProvider } from "@/components/v2/theme";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";

/**
 * LANDING route group — the Aceternity-template front door at "/". Shares
 * the v2 theme system (data-v2-theme drives the `dark:` variant) but keeps
 * its own template chrome: floating navbar + template footer, no SiteChrome
 * and no v2 GlobalHeader.
 */

export const metadata: Metadata = {
  title: "Continuum Alternatives — the map of European alternative assets",
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <V2ThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: V2_THEME_BOOT_SCRIPT }} />
      <div className="flex min-h-screen w-full flex-col bg-white antialiased dark:bg-neutral-950">
        <LandingNavbar />
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <LandingFooter />
      </div>
    </V2ThemeProvider>
  );
}
