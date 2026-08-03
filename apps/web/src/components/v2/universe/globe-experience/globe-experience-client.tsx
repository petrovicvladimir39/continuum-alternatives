"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

/** three.js + maplibre are browser-only — the whole experience loads client-side. */
const GlobeExperience = dynamic(
  () => import("./globe-experience").then((m) => m.GlobeExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#121212] text-[12px] text-[#8b877e]">
        Spinning up the globe…
      </div>
    ),
  },
);

export function GlobeExperienceClient() {
  const params = useSearchParams();
  return (
    <div className="h-[calc(100vh-40px)] w-full">
      <GlobeExperience debug={params.get("debug") === "1"} />
    </div>
  );
}
