"use client";

import dynamic from "next/dynamic";

/** Browser-only isolation — maplibre needs window (house pattern). */
const LogoMap = dynamic(() => import("./logo-map").then((m) => m.LogoMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[12px] text-ink-muted">
      Loading the map…
    </div>
  ),
});

export function LogoMapClient() {
  return (
    <div className="h-[calc(100vh-40px)] w-full">
      <LogoMap />
    </div>
  );
}
