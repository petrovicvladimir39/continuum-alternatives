import type { Metadata } from "next";
import { UniverseCanvasClient } from "@/components/v2/universe/universe-client";

export const metadata: Metadata = { title: "Map — Universe" };

/** Full-viewport canvas. */
export default function FullMapPage() {
  return <UniverseCanvasClient heightClass="h-[calc(100vh-40px)]" />;
}
