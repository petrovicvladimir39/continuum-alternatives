"use client";

import dynamic from "next/dynamic";

/** Browser-only isolation — maplibre needs window (house pattern). */
const SerbiaMap = dynamic(() => import("./serbia-map").then((m) => m.SerbiaMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[12px] text-neutral-500">
      Loading the map…
    </div>
  ),
});

export function SerbiaMapClient() {
  return (
    <div className="h-[calc(100vh-40px)] w-full">
      <SerbiaMap />
    </div>
  );
}
