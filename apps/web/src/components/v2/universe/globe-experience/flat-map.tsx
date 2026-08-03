"use client";

import maplibregl, { type Map as MlMap, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer, type PickingInfo } from "deck.gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  applyFilters,
  EMPTY_FILTERS,
  type PinCollection,
  type PinFeature,
  type PinFilters,
  type PinProps,
} from "@/components/v2/universe/logo-map/logo-map-data";
import { FilterRail } from "@/components/v2/universe/logo-map/filter-rail";
import { EntitySheet } from "@/components/v2/universe/logo-map/entity-sheet";

/**
 * 2D MAP — three levels in ONE DARK REGISTER (the globe is dark; the map is
 * dark; the crossfade reads as one world). Consumer POIs stripped:
 *   LEVEL 1 (z3–5)  country choropleth by full-corpus entity count, hover
 *                   tooltip (country · count · top classes), click → fly in
 *   LEVEL 2 (z6–9)  Supercluster badges (MapLibre cluster:true); other
 *                   countries dimmed by a mask layer
 *   LEVEL 3 (z10+)  deck.gl IconLayer — rounded-square WHITE logo cards that
 *                   pop on the dark ground (dark receding monogram filler);
 *                   labels via a separate MapLibre symbol layer so collisions
 *                   are managed (text-allow-overlap:false, sort=importance)
 * Style URL: https://tiles.openfreemap.org/styles/dark — the Dark-Matter-class
 * minimal dark style on the keyless house-proven host (carto-hosted styles
 * stalled in this environment).
 */

const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";
const PILOT_GEOJSON = "/map/tiles/pilot.geojson";
const COUNTRY_STATS = "/map/tiles/country-stats.json";
const WORLD = "/map/world.geojson";
const PILOT_ATLAS = "/map/sprites/pilot-atlas.png";
const PILOT_MAPPING = "/map/sprites/pilot-mapping.json";

/** ISO A3 (world.geojson ids) → our A2 codes, Europe only. */
const A3_TO_A2: Record<string, string> = {
  POL: "PL", CZE: "CZ", ROU: "RO", GRC: "GR", HUN: "HU", BGR: "BG", HRV: "HR",
  SRB: "RS", SVK: "SK", SVN: "SI", LTU: "LT", LVA: "LV", EST: "EE", BIH: "BA",
  MKD: "MK", ALB: "AL", MNE: "ME", KOS: "XK", DEU: "DE", GBR: "GB", FRA: "FR",
  ITA: "IT", ESP: "ES", NLD: "NL", LUX: "LU", CHE: "CH", SWE: "SE", BEL: "BE",
  AUT: "AT", DNK: "DK", NOR: "NO", IRL: "IE", FIN: "FI", PRT: "PT", ISL: "IS",
  MLT: "MT", CYP: "CY", LIE: "LI", UKR: "UA",
};

type CountryStats = Record<string, { count: number; topClasses: string[] }>;

export type FlatMapHandle = {
  jumpTo: (lat: number, lng: number, zoom: number) => void;
};

type Tooltip = { x: number; y: number; name: string; count: number; classes: string[] };

/** Strip consumer POIs/transit noise; keep geography + admin/place labels. */
function stripPois<T extends { layers?: { id: string }[] }>(style: T): T {
  const NOISE = /poi|transit|aeroway|airport|housenumber|ferry|building/i;
  return {
    ...style,
    layers: (style.layers ?? []).filter((layer) => !NOISE.test(layer.id)),
  };
}

export const FlatMap = forwardRef<
  FlatMapHandle,
  { active: boolean; onBackToGlobe: () => void; debug?: boolean }
>(function FlatMap({ active, onBackToGlobe, debug = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const allDataRef = useRef<PinCollection | null>(null);
  const mappingRef = useRef<object | null>(null);
  const filtersRef = useRef<PinFilters>(EMPTY_FILTERS);

  const [selected, setSelected] = useState<PinProps | null>(null);
  const [filters, setFilters] = useState<PinFilters>(EMPTY_FILTERS);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    jumpTo: (lat: number, lng: number, zoom: number) => {
      mapRef.current?.jumpTo({ center: [lng, lat], zoom });
    },
  }));

  function iconLayerFor(data: PinFeature[], zoom: number): IconLayer<PinFeature> {
    return new IconLayer<PinFeature>({
      id: "pilot-cards",
      data,
      visible: zoom >= 10,
      iconAtlas: PILOT_ATLAS,
      iconMapping: (mappingRef.current ?? {}) as never,
      getIcon: (d: PinFeature) => d.properties.icon,
      getPosition: (d: PinFeature) => d.geometry.coordinates,
      getSize: 34,
      sizeScale: Math.min(1.5, Math.max(0.85, 0.85 + (zoom - 10) * 0.12)),
      pickable: true,
      onClick: (info: PickingInfo<PinFeature>) => {
        const feature = info.object;
        if (feature !== undefined && feature !== null) {
          setSelected(feature.properties);
        }
      },
    });
  }

  function refreshIcons(): void {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    const all = allDataRef.current;
    if (map === null || overlay === null || all === null) {
      return;
    }
    const filtered = applyFilters(all, filtersRef.current);
    overlay.setProps({ layers: [iconLayerFor(filtered.features, map.getZoom())] });
  }

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    let disposed = false;

    (async () => {
      const [styleRaw, pilot, stats, world, mapping] = await Promise.all([
        fetch(DARK_STYLE).then((r) => r.json()),
        fetch(PILOT_GEOJSON).then((r) => r.json() as Promise<PinCollection>),
        fetch(COUNTRY_STATS).then((r) => r.json() as Promise<CountryStats>),
        fetch(WORLD).then((r) => r.json()),
        fetch(PILOT_MAPPING).then((r) => r.json() as Promise<object>),
      ]);
      if (disposed) {
        return;
      }
      allDataRef.current = pilot;
      mappingRef.current = mapping;

      // Join corpus counts onto Europe polygons; drop the rest of the world.
      const worldFeatures = (world as { features: { id?: string; properties: Record<string, unknown> }[] }).features;
      const europe = worldFeatures.flatMap((f) => {
        const a2 = f.id !== undefined ? A3_TO_A2[f.id] : undefined;
        if (a2 === undefined) {
          return [];
        }
        const s = stats[a2];
        return [
          {
            ...f,
            properties: {
              ...f.properties,
              a2,
              count: s?.count ?? 0,
              topClasses: (s?.topClasses ?? []).join(" · "),
            },
          },
        ];
      });

      const map = new maplibregl.Map({
        container,
        style: stripPois(styleRaw) as never,
        center: [12, 50],
        zoom: 4.2,
        attributionControl: false,
        fadeDuration: 0,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("error", (e: { error?: Error }) => {
        console.error("[flat-map]", e.error?.message ?? e);
      });
      map.on("load", () => {
        if (disposed) {
          return;
        }
        try {
        map.addSource("countries", {
          type: "geojson",
          data: { type: "FeatureCollection", features: europe } as never,
        });
        map.addSource("pilot", {
          type: "geojson",
          data: pilot as never,
          cluster: true,
          clusterMaxZoom: 9,
          clusterRadius: 46,
        });

        // LEVEL 1 — choropleth (full opacity only at overview zooms).
        map.addLayer({
          id: "country-fill",
          type: "fill",
          source: "countries",
          maxzoom: 6,
          paint: {
            "fill-color": [
              "interpolate", ["linear"], ["get", "count"],
              0, "#1a1a19", 50, "#20303d", 300, "#2b4a63", 1000, "#3a648b", 3000, "#4d7ba6",
            ],
            "fill-opacity": 0.66,
          },
        });
        map.addLayer({
          id: "country-line",
          type: "line",
          source: "countries",
          maxzoom: 10,
          paint: { "line-color": "#383838", "line-width": 0.6 },
        });
        // LEVEL 2 — other countries dim while zoomed into one.
        map.addLayer({
          id: "country-dim",
          type: "fill",
          source: "countries",
          minzoom: 6,
          maxzoom: 10,
          filter: ["==", ["get", "a2"], ""],
          paint: { "fill-color": "#121212", "fill-opacity": 0.6 },
        });

        // LEVEL 2 — Supercluster badges, token-styled for the light ground.
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "pilot",
          minzoom: 6,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "rgba(24,24,23,0.9)",
            "circle-stroke-color": "#7aa7cd",
            "circle-stroke-width": 1.25,
            "circle-radius": ["step", ["get", "point_count"], 16, 20, 22, 60, 28],
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "pilot",
          minzoom: 6,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["concat", ["to-string", ["get", "point_count"]], " ent."],
            "text-font": ["Noto Sans Regular"],
            "text-size": 10.5,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#edecea" },
        });

        // LEVEL 3 — LABELS ONLY via MapLibre symbols (collision-managed);
        // the cards themselves are deck.gl icons.
        map.addLayer({
          id: "pilot-labels",
          type: "symbol",
          source: "pilot",
          minzoom: 10,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-anchor": "left",
            "text-offset": [1.7, 0],
            "text-allow-overlap": false,
            "text-optional": false,
            "symbol-sort-key": ["get", "sort"],
            "text-max-width": 14,
          },
          paint: {
            "text-color": "#cfcfcf",
            "text-halo-color": "rgba(18,18,18,0.9)",
            "text-halo-width": 1.3,
          },
        });

        const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
        map.addControl(overlay as never);
        overlayRef.current = overlay;
        refreshIcons();

        map.on("zoom", refreshIcons);

        // Hover tooltip on the choropleth.
        map.on("mousemove", "country-fill", (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["country-fill"] })[0];
          if (feature !== undefined) {
            const p = feature.properties as { name?: string; count?: number; topClasses?: string };
            setTooltip({
              x: e.point.x,
              y: e.point.y,
              name: String(p.name ?? ""),
              count: Number(p.count ?? 0),
              classes: (p.topClasses ?? "").split(" · ").filter((c) => c !== ""),
            });
          }
        });
        map.on("mouseleave", "country-fill", () => setTooltip(null));

        // Clicks: country → Level 2; cluster → Level 3.
        map.on("click", "country-fill", (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["country-fill"] })[0];
          const a2 = (feature?.properties as { a2?: string } | undefined)?.a2;
          if (a2 !== undefined) {
            map.setFilter("country-dim", ["!=", ["get", "a2"], a2]);
            map.flyTo({ center: e.lngLat, zoom: 6.4, duration: prefersReduced() ? 0 : 900 });
          }
        });
        map.on("click", "clusters", async (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const clusterId = (feature?.properties as { cluster_id?: number } | undefined)?.cluster_id;
          const source = map.getSource("pilot") as maplibregl.GeoJSONSource | undefined;
          if (clusterId === undefined || source === undefined) {
            return;
          }
          const zoom = Math.max(10.2, await source.getClusterExpansionZoom(clusterId));
          map.flyTo({
            center: (feature!.geometry as unknown as { coordinates: [number, number] }).coordinates,
            zoom,
            duration: prefersReduced() ? 0 : 800,
          });
        });
        for (const layer of ["country-fill", "clusters"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        if (debug) {
          // ?debug=1 — exposes the map for FPS/zoom instrumentation.
          (window as unknown as { __flatMap?: MlMap }).__flatMap = map;
        }
        setReady(true);
        } catch (error) {
          console.error("[flat-map] layer setup failed:", error);
          (window as unknown as { __flatMapError?: string }).__flatMapError = String(error);
        }
      });
    })().catch((error: unknown) => {
      console.error("[flat-map] init failed:", error);
      setReady(false);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Init once — imperative MapLibre lifecycle.

  }, []);

  // Filters: rebuild cluster source data + deck layer, zero refetch.
  useEffect(() => {
    filtersRef.current = filters;
    const map = mapRef.current;
    const all = allDataRef.current;
    if (map === null || all === null || !ready) {
      return;
    }
    const filtered = applyFilters(all, filters);
    (map.getSource("pilot") as maplibregl.GeoJSONSource | undefined)?.setData(filtered as never);
    refreshIcons();

  }, [filters, ready]);

  return (
    <div className="relative h-full w-full" data-v2-theme="dark">
      <div ref={containerRef} className="h-full w-full" />
      <FilterRail filters={filters} onChange={setFilters} />
      <button
        type="button"
        onClick={onBackToGlobe}
        className="absolute right-2 top-2 z-10 border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-ink/5"
      >
        ↑ Globe
      </button>
      {tooltip !== null ? (
        <div
          className="pointer-events-none absolute z-20 border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <span className="font-medium">{tooltip.name}</span>
          <span className="text-ink-muted"> · {tooltip.count.toLocaleString("en-US")} entities</span>
          {tooltip.classes.length > 0 ? (
            <span className="text-ink-muted"> · {tooltip.classes.join(", ")}</span>
          ) : null}
        </div>
      ) : null}
      {debug && active ? <FpsBadge /> : null}
      <EntitySheet entity={selected} onClose={() => setSelected(null)} />
    </div>
  );
});

function prefersReduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function FpsBadge() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let raf = 0;
    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="absolute bottom-2 right-2 z-10 border border-line bg-surface px-2 py-1 text-[11px] tabular-nums text-ink">
      {fps} fps
    </div>
  );
}
