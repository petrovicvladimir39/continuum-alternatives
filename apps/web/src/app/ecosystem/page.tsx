import type { Metadata } from "next";
import { countActiveWithoutGeo, listMapData } from "@continuum/db";
import { EntityMap } from "@/components/map/entity-map";
import { TrackView } from "@/components/track-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ecosystem",
  description:
    "The European alternative-asset ecosystem on one map — funds, lenders, servicers, and companies, colored by capital type.",
};

// Phase 25A: /map 301-redirects here (next.config redirects()).
export default async function EcosystemPage() {
  // ~160 city features + ~700 compact entity rows is a small inline payload;
  // no API route for the base data. If the universe grows past ~5k entities,
  // move this to an endpoint + on-demand loading instead of inlining props.
  const [data, missingCount] = await Promise.all([listMapData(), countActiveWithoutGeo()]);

  return (
    <div className="h-[calc(100vh-52px)] w-full">
      <TrackView event="map_opened" />
      <EntityMap data={data} missingCount={missingCount} />
    </div>
  );
}
