import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PrototypeRibbon } from "@/components/v2/prototype-ribbon";
import { V2_THEME_BOOT_SCRIPT, V2ThemeProvider } from "@/components/v2/theme";

/**
 * FRONTEND-V2 route group — the isolated presentation layer. Supplies its
 * own shell (no SiteChrome); tokens are scoped under .v2-root, stamped on
 * <html> pre-paint by the boot script and managed by V2ThemeProvider.
 */

export const metadata: Metadata = {
  title: {
    default: "Continuum Alternatives",
    template: "%s — Continuum Alternatives",
  },
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2ThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: V2_THEME_BOOT_SCRIPT }} />
      <div className="flex min-h-screen w-full flex-col bg-ground text-ink antialiased">
        <PrototypeRibbon />
        {children}
      </div>
    </V2ThemeProvider>
  );
}
