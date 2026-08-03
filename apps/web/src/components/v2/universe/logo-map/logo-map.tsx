"use client";

import maplibregl, { type Map as MlMap, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EUROPE_MAP_BOUNDS, stripBaseLabels, type MapStyleLike } from "@continuum/shared";
import {
  applyFilters,
  countryAggregates,
  EMPTY_FILTERS,
  mockCollection,
  type PinCollection,
  type PinFilters,
  type PinProps,
} from "./logo-map-data";
import { EntitySheet } from "./entity-sheet";
import { FilterRail } from "./filter-rail";
import { FpsMeter } from "./fps-meter";

/**
 * LOGO-PIN EUROPE MAP — S3 rendering law.
 *
 * Zoom tiers:
 *   z0–5   country aggregates (badge circles at country centroids)
 *   z6–9   city clusters — MapLibre cluster:true, which IS Supercluster
 *          under the hood (maplibre bundles it for GeoJSON sources)
 *   z10+   logo pins: symbol layer, icon-allow-overlap:false,
 *          text-optional:true, text-allow-overlap:false, and
 *          symbol-sort-key = -importance so majors always win collisions
 *          and smaller firms fade in as you zoom.
 *
 * Icons come from the S2 sprite atlases, loaded once as ImageBitmap slices
 * (map.addImage per icon) — a handful of HTTP requests for thousands of
 * pins. Basemap: OpenFreeMap `dark` with every base symbol layer except
 * country labels stripped (stripBaseLabels) — roads, water, borders and OUR
 * labels only. Filters rebuild the in-memory GeoJSON (no refetch).
 */

const BASEMAP = "https://tiles.openfreemap.org/styles/dark";
const SPRITES_BASE = "/map/sprites";
const TILES_GEOJSON = "/map/tiles/entities.geojson";

/** v2 dark-ground class accents for the z6–9 dot tier. */
const CLASS_COLOR: [string, string][] = [
  ["private-equity", "#47b598"],
  ["private-credit", "#c69a3d"],
  ["real-assets", "#a3a441"],
  ["hedge-funds", "#9a7bc0"],
  ["structured", "#4da4a8"],
  ["esoteric", "#b06aa4"],
  ["collectibles", "#c0708f"],
  ["climate", "#5aa878"],
  ["digital", "#8486c9"],
];

type Manifest = {
  prefix: string;
  sheets: { id: string; file: string; jsonFile: string; count: number }[];
};

async function loadAtlas(map: MlMap, prefix: string): Promise<number> {
  const manifestRes = await fetch(`${SPRITES_BASE}/${prefix}-manifest.json`);
  if (!manifestRes.ok) {
    return 0;
  }
  const manifest = (await manifestRes.json()) as Manifest;
  let added = 0;
  for (const sheet of manifest.sheets) {
    const [indexRes, pngRes] = await Promise.all([
      fetch(`${SPRITES_BASE}/${sheet.jsonFile}`),
      fetch(`${SPRITES_BASE}/${sheet.file}`),
    ]);
    if (!indexRes.ok || !pngRes.ok) {
      continue;
    }
    const index = (await indexRes.json()) as Record<
      string,
      { x: number; y: number; width: number; height: number }
    >;
    const blob = await pngRes.blob();
    for (const [name, frame] of Object.entries(index)) {
      if (map.hasImage(name)) {
        continue;
      }
      const bitmap = await createImageBitmap(blob, frame.x, frame.y, frame.width, frame.height);
      map.addImage(name, bitmap);
      added += 1;
    }
  }
  return added;
}

export function LogoMap() {
  const params = useSearchParams();
  const forceMock = params.get("mock") === "1";
  const debug = params.get("debug") === "1";

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const allDataRef = useRef<PinCollection | null>(null);

  const [selected, setSelected] = useState<PinProps | null>(null);
  const [filters, setFilters] = useState<PinFilters>(EMPTY_FILTERS);
  const [status, setStatus] = useState<string>("loading");
  const [dataMode, setDataMode] = useState<"mock" | "real">("mock");

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    (async () => {
      // 1 · basemap: fetch + strip POI/label noise, keep country labels.
      const styleRes = await fetch(BASEMAP);
      const style = stripBaseLabels((await styleRes.json()) as MapStyleLike);

      // 2 · data: real tiles export if present, else the mock layer.
      let mode: "mock" | "real" = "mock";
      let data = mockCollection();
      if (!forceMock) {
        try {
          const tilesRes = await fetch(TILES_GEOJSON);
          if (tilesRes.ok) {
            data = (await tilesRes.json()) as PinCollection;
            mode = "real";
          }
        } catch {
          // stay on mock
        }
      }
      if (disposed) {
        return;
      }
      allDataRef.current = data;
      setDataMode(mode);

      const map = new maplibregl.Map({
        container,
        style: style as never,
        bounds: EUROPE_MAP_BOUNDS as never,
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
        fadeDuration: reducedMotion ? 0 : 300,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("load", async () => {
        const icons = await loadAtlas(map, mode);
        if (disposed) {
          return;
        }

        map.addSource("entities", {
          type: "geojson",
          data,
          cluster: true,
          clusterMaxZoom: 9,
          clusterRadius: 44,
        });
        map.addSource("countries", { type: "geojson", data: countryAggregates(data) });

        // z0–5 · country aggregate badges.
        map.addLayer({
          id: "country-agg",
          type: "circle",
          source: "countries",
          maxzoom: 6,
          paint: {
            "circle-color": "rgba(122,167,205,0.18)",
            "circle-stroke-color": "#7aa7cd",
            "circle-stroke-width": 1,
            "circle-radius": [
              "interpolate", ["linear"], ["sqrt", ["get", "count"]],
              1, 8, 20, 22, 60, 34,
            ],
          },
        });
        map.addLayer({
          id: "country-agg-count",
          type: "symbol",
          source: "countries",
          maxzoom: 6,
          layout: {
            "text-field": ["to-string", ["get", "count"]],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#edecea" },
        });

        // z6–9 · city clusters (Supercluster via cluster:true).
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "entities",
          minzoom: 6,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "rgba(31,31,30,0.85)",
            "circle-stroke-color": "#7aa7cd",
            "circle-stroke-width": 1,
            "circle-radius": ["step", ["get", "point_count"], 14, 25, 19, 100, 26],
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "entities",
          minzoom: 6,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["to-string", ["get", "point_count"]],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#edecea" },
        });

        // z6–10 · unclustered singletons as class-colored dots.
        map.addLayer({
          id: "dots",
          type: "circle",
          source: "entities",
          minzoom: 6,
          maxzoom: 10,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "cls"],
              ...CLASS_COLOR.flat(),
              "#8b877e",
            ] as never,
            "circle-radius": 3.5,
            "circle-stroke-color": "rgba(0,0,0,0.5)",
            "circle-stroke-width": 1,
          },
        });

        // z10+ · THE LOGO PINS.
        map.addLayer({
          id: "pins",
          type: "symbol",
          source: "entities",
          minzoom: 10,
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image": ["get", "icon"],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.42, 13, 0.6, 16, 0.8],
            "icon-allow-overlap": false,
            "icon-padding": 2,
            "symbol-sort-key": ["get", "sort"],
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-anchor": "top",
            "text-offset": [0, 1.9],
            "text-optional": true,
            "text-allow-overlap": false,
            "text-max-width": 12,
          },
          paint: {
            "text-color": "#cfcfcf",
            "text-halo-color": "rgba(18,18,18,0.9)",
            "text-halo-width": 1.2,
          },
        });

        map.on("click", "pins", (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["pins"] })[0];
          if (feature !== undefined) {
            setSelected(feature.properties as PinProps);
          }
        });
        map.on("click", "dots", (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["dots"] })[0];
          if (feature !== undefined) {
            setSelected(feature.properties as PinProps);
          }
        });
        map.on("click", "clusters", async (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          const clusterId = feature?.properties?.cluster_id as number | undefined;
          const source = map.getSource("entities") as maplibregl.GeoJSONSource | undefined;
          if (clusterId === undefined || source === undefined) {
            return;
          }
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: (feature!.geometry as unknown as { coordinates: [number, number] })
              .coordinates,
            zoom,
            duration: reducedMotion ? 0 : 500,
          });
        });
        map.on("click", "country-agg", (e: MapMouseEvent) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ["country-agg"] })[0];
          if (feature !== undefined) {
            map.easeTo({
              center: (feature.geometry as unknown as { coordinates: [number, number] })
                .coordinates,
              zoom: 6.5,
              duration: reducedMotion ? 0 : 600,
            });
          }
        });
        for (const layer of ["pins", "dots", "clusters", "country-agg"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        setStatus(`ready · ${data.features.length} entities · ${icons} icons`);
        if (debug) {
          // ?debug=1 — exposes the map for FPS/zoom instrumentation.
          (window as unknown as { __logoMap?: MlMap }).__logoMap = map;
        }
      });
    })().catch((error: unknown) => {
      setStatus(`failed: ${String(error)}`);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Init once per mock toggle — debug/reducedMotion are read-at-init only.
  }, [forceMock]);

  // Filters rebuild in-memory data — layer visibility changes, no refetch.
  useEffect(() => {
    const map = mapRef.current;
    const all = allDataRef.current;
    if (map === null || all === null) {
      return;
    }
    const filtered = applyFilters(all, filters);
    (map.getSource("entities") as maplibregl.GeoJSONSource | undefined)?.setData(filtered);
    (map.getSource("countries") as maplibregl.GeoJSONSource | undefined)?.setData(
      countryAggregates(filtered),
    );
  }, [filters]);

  return (
    <div className="relative h-full w-full" data-v2-theme="dark">
      <div ref={containerRef} className="h-full w-full" />
      <FilterRail filters={filters} onChange={setFilters} />
      <div className="absolute bottom-2 left-2 z-10 border border-line bg-ground/90 px-2 py-1 text-[11px] text-ink-muted">
        {dataMode === "mock" ? "MOCK LAYER — design fixtures" : "REGISTER-GEOCODED DATA"} · {status}
      </div>
      {debug ? <FpsMeter /> : null}
      <EntitySheet entity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
