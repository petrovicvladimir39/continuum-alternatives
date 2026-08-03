import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GlobalFooter } from "@/components/v2/global-footer";
import { GlobalHeader } from "@/components/v2/global-header";
import { V2_THEME_BOOT_SCRIPT, V2ThemeProvider } from "@/components/v2/theme";

/**
 * V2 route group — THE production presentation layer (2026-08-03 cutover,
 * operator decision): v2 on mock data replaces the DB-backed (site) front.
 * Supplies its own shell (no SiteChrome); tokens scoped under .v2-root,
 * stamped on <html> pre-paint by the boot script, managed by V2ThemeProvider.
 * Prototype ribbon + noindex removed at cutover.
 */

export const metadata: Metadata = {
  title: {
    default: "Continuum Alternatives",
    template: "%s — Continuum Alternatives",
  },
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2ThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: V2_THEME_BOOT_SCRIPT }} />
      <div className="flex min-h-screen w-full flex-col bg-ground text-ink antialiased">
        <GlobalHeader />
        <main className="flex w-full flex-1 flex-col">{children}</main>
        <GlobalFooter />
      </div>
    </V2ThemeProvider>
  );
}
