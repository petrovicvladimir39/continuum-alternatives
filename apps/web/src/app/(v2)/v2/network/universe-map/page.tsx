import type { Metadata } from "next";
import { UniverseMapFull } from "@/components/v2/network/universe-widget";

export const metadata: Metadata = { title: "Universe map — Network" };

/** Full-screen egocentric React Flow graph with a focal selector. */
export default function NetworkUniverseMapPage() {
  return <UniverseMapFull />;
}
