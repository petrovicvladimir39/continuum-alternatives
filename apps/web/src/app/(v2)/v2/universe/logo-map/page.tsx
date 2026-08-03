import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMapClient } from "@/components/v2/universe/logo-map/logo-map-client";

export const metadata: Metadata = { title: "Logo map — Universe" };

/**
 * /v2/universe/logo-map — the LOGO-PIN EUROPE MAP: country aggregates →
 * city clusters → collision-managed logo pins. ?mock=1 forces the mock
 * layer; ?debug=1 shows the FPS meter.
 */
export default function LogoMapPage() {
  return (
    <Suspense>
      <LogoMapClient />
    </Suspense>
  );
}
