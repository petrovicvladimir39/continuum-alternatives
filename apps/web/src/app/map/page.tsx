import type { Metadata } from "next";
import { countActiveWithoutGeo, listMapEntities } from "@continuum/db";
import { EntityMap } from "@/components/map/entity-map";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Map",
  description:
    "The alternative-investment landscape of emerging Europe on one map — funds, lenders, servicers, and companies, colored by capital type.",
};

export default async function MapPage() {
  // ~700 geocoded entities is a small inline payload; no API route needed.
  // If the universe grows past ~5k dots, move this to an endpoint + on-demand
  // loading instead of inlining server props.
  const [entities, missingCount] = await Promise.all([listMapEntities(), countActiveWithoutGeo()]);

  return (
    <div className="h-[calc(100vh-52px)] w-full">
      <EntityMap entities={entities} missingCount={missingCount} />
    </div>
  );
}
