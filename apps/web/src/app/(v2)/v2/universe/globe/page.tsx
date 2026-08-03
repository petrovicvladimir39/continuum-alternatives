import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobeExperienceClient } from "@/components/v2/universe/globe-experience/globe-experience-client";

export const metadata: Metadata = { title: "Globe — Universe" };

/**
 * /v2/universe/globe — GLOBE → EUROPE → COUNTRY → CITY. Level 0 hero globe
 * (three.js, token reskin) hands off via crossfade to the MapLibre 2D map:
 * choropleth → superclusters → deck.gl logo cards. Pilot data: 570 real
 * register-verified corpus entities across 19 cities. ?debug=1 → FPS meter.
 */
export default function GlobePage() {
  return (
    <Suspense>
      <GlobeExperienceClient />
    </Suspense>
  );
}
