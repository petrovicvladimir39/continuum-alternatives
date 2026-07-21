import type { ReactNode } from "react";
import { SiteChrome } from "@/components/site-chrome";

// Chrome previously came from the root layout (see site-chrome.tsx).
export default function EcosystemLayout({ children }: { children: ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
