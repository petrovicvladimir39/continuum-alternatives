"use client";

import { useEffect, useRef, useState } from "react";
import { HeroGlobe, type GlobeCity, type HeroGlobeHandle } from "./hero-globe";
import { FlatMap, type FlatMapHandle } from "./flat-map";

/**
 * GLOBE → EUROPE → COUNTRY → CITY — one continuous-feeling gesture.
 *
 * THE HANDOFF: both canvases stay mounted; MapLibre is pre-warmed behind
 * the globe. A dive animates the globe camera toward the target (~900ms),
 * the 2D map is jumped to the same position meanwhile, then a ~400ms
 * crossfade swaps surfaces. "↑ Globe" fades back. prefers-reduced-motion →
 * instant switch, no camera animation.
 */

/** Pilot cities (coords mirror pipeline pilot-cities.ts). */
const CITIES: Omit<GlobeCity, "count">[] = [
  { city: "Warsaw", country: "PL", lat: 52.2297, lng: 21.0122 },
  { city: "Prague", country: "CZ", lat: 50.0755, lng: 14.4378 },
  { city: "Budapest", country: "HU", lat: 47.4979, lng: 19.0402 },
  { city: "Bucharest", country: "RO", lat: 44.4268, lng: 26.1025 },
  { city: "Belgrade", country: "RS", lat: 44.7866, lng: 20.4489 },
  { city: "Zagreb", country: "HR", lat: 45.815, lng: 15.9819 },
  { city: "Sofia", country: "BG", lat: 42.6977, lng: 23.3219 },
  { city: "Vilnius", country: "LT", lat: 54.6872, lng: 25.2797 },
  { city: "Bratislava", country: "SK", lat: 48.1486, lng: 17.1077 },
  { city: "Ljubljana", country: "SI", lat: 46.0569, lng: 14.5058 },
  { city: "Vienna", country: "AT", lat: 48.2082, lng: 16.3738 },
  { city: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821 },
  { city: "Luxembourg", country: "LU", lat: 49.6116, lng: 6.1319 },
  { city: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041 },
  { city: "Paris", country: "FR", lat: 48.8566, lng: 2.3522 },
  { city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { city: "Milan", country: "IT", lat: 45.4642, lng: 9.19 },
  { city: "Madrid", country: "ES", lat: 40.4168, lng: -3.7038 },
  { city: "Stockholm", country: "SE", lat: 59.3293, lng: 18.0686 },
];

type PilotReport = {
  cities: Record<string, { selectedReal: number; survives: boolean }>;
};

/** Second visit skips the dive animation entirely (sessionStorage). */
const SKIP_KEY = "v2-globe-dived";

export function GlobeExperience({ debug = false }: { debug?: boolean }) {
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const [globeHidden, setGlobeHidden] = useState(false);
  const [instant, setInstant] = useState(false);
  const [diving, setDiving] = useState(false);
  const [cities, setCities] = useState<GlobeCity[]>(CITIES.map((c) => ({ ...c, count: 30 })));
  const globeRef = useRef<HeroGlobeHandle>(null);
  const mapRef = useRef<FlatMapHandle>(null);

  useEffect(() => {
    // Only surviving pilot cities land on the globe (logo-dense pilot).
    fetch("/map/tiles/pilot-report.json")
      .then((r) => r.json() as Promise<PilotReport>)
      .then((report) =>
        setCities(
          CITIES.flatMap((c) => {
            const entry = report.cities[c.city];
            if (entry === undefined || !entry.survives) {
              return [];
            }
            return [{ ...c, count: entry.selectedReal }];
          }),
        ),
      )
      .catch(() => undefined);
  }, []);

  async function dive(lat: number, lng: number, zoom: number): Promise<void> {
    if (diving) {
      return;
    }
    setDiving(true);
    mapRef.current?.jumpTo(lat, lng, zoom);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skip = window.sessionStorage.getItem(SKIP_KEY) === "1";
    setInstant(reduced || skip);
    if (!reduced && !skip) {
      await globeRef.current?.dive(lat, lng, 350);
    }
    setMode("map");
    setDiving(false);
    try {
      window.sessionStorage.setItem(SKIP_KEY, "1");
    } catch {
      // storage unavailable — every visit animates
    }
    // visibility backstop — never rely on the transition finishing.
    window.setTimeout(() => setGlobeHidden(true), reduced || skip ? 0 : 250);
  }

  function backToGlobe(): void {
    globeRef.current?.resetView();
    setInstant(false);
    setGlobeHidden(false);
    setMode("globe");
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#121212]" data-mode={mode}>
      {/* 2D map — always mounted, pre-warmed behind the globe. */}
      <div className="absolute inset-0">
        <FlatMap ref={mapRef} active={mode === "map"} onBackToGlobe={backToGlobe} debug={debug} />
      </div>

      {/* Globe overlay — stays mounted (warm for the return trip); the
          crossfade is a plain CSS opacity transition (~400ms). */}
      <div
        style={{
          pointerEvents: mode === "globe" ? "auto" : "none",
          opacity: mode === "globe" ? 1 : 0,
          visibility: globeHidden && mode !== "globe" ? "hidden" : "visible",
          transition: instant ? "none" : "opacity 200ms ease-out",
        }}
        className="absolute inset-0 z-20 bg-[#121212]"
        data-v2-theme="dark"
        aria-hidden={mode !== "globe"}
      >
        <div className="h-full w-full">
          <HeroGlobe
            ref={globeRef}
            cities={cities}
            onCityClick={(city) => void dive(city.lat, city.lng, 10.6)}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-10 z-10 flex flex-col items-center px-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8b877e]">
            The universe
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-3xl font-medium text-[#edecea] md:text-5xl">
            European alternative assets, mapped to the address.
          </h1>
          <button
            type="button"
            onClick={() => void dive(50, 12, 4.2)}
            className={
              "mt-6 border border-[#383838] bg-[#181817] px-5 py-2.5 text-[13px] font-medium text-[#edecea] transition-colors hover:border-[#7aa7cd] hover:text-[#7aa7cd] " +
              (mode === "globe" ? "pointer-events-auto" : "")
            }
          >
            Explore the universe →
          </button>
          <p className="mt-3 text-[11px] text-[#716e67]">or click any city on the globe</p>
        </div>
      </div>
    </div>
  );
}
