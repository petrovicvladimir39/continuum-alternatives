"use client";

import dynamic from "next/dynamic";

/** deck.gl + maplibre are browser-only — load the canvas client-side. */
export const UniverseCanvasClient = dynamic(
  () => import("./universe-canvas").then((m) => m.UniverseCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[90vh] w-full items-center justify-center border-b border-line bg-[#121212]">
        <span className="type-mono text-[#716e67]">[ LOADING UNIVERSE CANVAS ]</span>
      </div>
    ),
  },
);
