import type { Metadata } from "next";
import { Suspense } from "react";
import { SerbiaMapClient } from "@/components/v2/serbia/serbia-map-client";

export const metadata: Metadata = { title: "Serbia — Continuum" };

/**
 * /v2/serbia — the Serbian entity map: clustered counts far out, logo/class
 * pins close in, filter rail by asset class / role / city, and a click-through
 * entity sheet carrying the full register + firmographic record.
 */
export default function SerbiaPage() {
  return (
    <Suspense>
      <SerbiaMapClient />
    </Suspense>
  );
}
