"use client";

import Globe, { type GlobeMethods } from "react-globe.gl";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

/**
 * LEVEL 0 — the hero globe (react-globe.gl / three.js), RESKINNED TO TOKENS:
 * no earth texture, no neon — ink globe, hex-dotted continents in muted
 * paper, arcs in the nine taxonomy accents (dark-ground values), soft navy
 * atmosphere. Points are the pilot cities sized by entity count; ~30 arcs
 * connect European financial hubs. Slow auto-rotate, Europe-centered.
 */

export type GlobeCity = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
};

export type HeroGlobeHandle = {
  /** Camera dive toward a target; resolves when the zoom leg is done. */
  dive: (lat: number, lng: number, ms: number) => Promise<void>;
  resetView: () => void;
};

/** Dark-ground taxonomy accents (globe sits on ink). */
const ARC_COLORS = [
  "#47b598", "#c69a3d", "#a3a441", "#9a7bc0", "#4da4a8",
  "#b06aa4", "#c0708f", "#5aa878", "#8486c9",
];

/** Arcs are generated between the SURVIVING pilot cities (all pairs, ≤30). */
const MAX_ARCS = 30;

export const HeroGlobe = forwardRef<
  HeroGlobeHandle,
  { cities: GlobeCity[]; onCityClick: (city: GlobeCity) => void }
>(function HeroGlobe({ cities, onCityClick }, ref) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [land, setLand] = useState<object[]>([]);

  useEffect(() => {
    fetch("/map/world.geojson")
      .then((r) => r.json())
      .then((geo: { features: object[] }) => setLand(geo.features))
      .catch(() => setLand([]));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (el === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    if (globe === undefined) {
      return;
    }
    globe.pointOfView({ lat: 50, lng: 12, altitude: 2.1 }, 0);
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false;
  }, [land]);

  useImperativeHandle(ref, () => ({
    dive: (lat: number, lng: number, ms: number) => {
      const globe = globeRef.current;
      if (globe === undefined) {
        return Promise.resolve();
      }
      globe.controls().autoRotate = false;
      globe.pointOfView({ lat, lng, altitude: 0.28 }, ms);
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    resetView: () => {
      const globe = globeRef.current;
      if (globe === undefined) {
        return;
      }
      globe.pointOfView({ lat: 50, lng: 12, altitude: 2.1 }, 0);
      globe.controls().autoRotate = true;
    },
  }));

  const arcs = useMemo(() => {
    const pairs: { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[] = [];
    for (let i = 0; i < cities.length; i += 1) {
      for (let j = i + 1; j < cities.length; j += 1) {
        pairs.push({
          startLat: cities[i]!.lat,
          startLng: cities[i]!.lng,
          endLat: cities[j]!.lat,
          endLng: cities[j]!.lng,
          color: ARC_COLORS[pairs.length % ARC_COLORS.length]!,
        });
      }
    }
    return pairs.slice(0, MAX_ARCS);
  }, [cities]);

  const maxCount = useMemo(() => Math.max(1, ...cities.map((c) => c.count)), [cities]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe
        globeImageUrl={null as never}
        showAtmosphere
        atmosphereColor="#7aa7cd"
        atmosphereAltitude={0.12}
        hexPolygonsData={land}
        hexPolygonResolution={3}
        hexPolygonMargin={0.72}
        hexPolygonColor={() => "rgba(237,236,234,0.42)"}
        pointsData={cities as object[]}
        pointLat={(d) => (d as GlobeCity).lat}
        pointLng={(d) => (d as GlobeCity).lng}
        pointColor={() => "#7aa7cd"}
        pointAltitude={(d) => 0.015 + ((d as GlobeCity).count / maxCount) * 0.05}
        pointRadius={(d) => 0.28 + ((d as GlobeCity).count / maxCount) * 0.5}
        pointLabel={(d: object) => {
          const c = d as GlobeCity;
          return `<div style="font-family:Instrument Sans,sans-serif;font-size:12px;background:#181817;color:#edecea;border:1px solid #383838;padding:4px 8px;">${c.city} · ${c.count.toLocaleString("en-US")} entities</div>`;
        }}
        onPointClick={(d) => onCityClick(d as GlobeCity)}
        arcsData={arcs as object[]}
        arcColor={(d: object) => (d as { color: string }).color}
        arcAltitude={0.18}
        arcStroke={0.42}
        arcDashLength={0.55}
        arcDashGap={2.2}
        arcDashAnimateTime={2600}
      />
    </div>
  );
});
