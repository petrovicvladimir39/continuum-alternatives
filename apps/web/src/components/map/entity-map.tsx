"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapEntity } from "@continuum/db";

/**
 * The one client-side island of the platform — all client JS stays confined
 * to this map. Base tiles: OpenFreeMap positron (keyless), the lightest
 * monochrome style; everything painted on top follows the styleguide tokens.
 */

const COLORS = {
  equity: "#1D7A5F",
  credit: "#96690F",
  distressed: "#A4442A",
  neutral: "#5C5952",
} as const;

const SURFACE = "#FFFFFF";
const LINE_STRONG = "#D2CEC3";
const INK = "#141311";

const PUBLIC_PATHS: Record<string, string> = {
  organization: "companies",
  fund_vehicle: "funds",
  deal: "deals",
};

/**
 * Same-city stacks share identical coordinates after geocoding. At max zoom
 * we spread them on a deterministic ~12m ring (index-based golden-angle
 * rosette) so every dot stays clickable. DISPLAY-ONLY: stored geo is never
 * touched; the offset is recomputed identically on every render.
 */
type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, string | number>;
};

function ringOffset(entities: MapEntity[]): PointFeature[] {
  const seen = new Map<string, number>();
  return entities.map((entity) => {
    const key = `${entity.lat},${entity.lng}`;
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    let { lat, lng } = entity;
    if (index > 0) {
      const angle = index * 2.399963; // golden angle — no two dots align
      const radius = 0.000108 * (1 + Math.floor(index / 24)); // ~12m per ring
      lat += radius * Math.sin(angle);
      lng += (radius * Math.cos(angle)) / Math.cos((entity.lat * Math.PI) / 180);
    }
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        slug: entity.slug,
        kind: entity.kind,
        name: entity.name,
        dominant: entity.capitalTypes[0] ?? "neutral",
        factsCount: entity.factsCount,
      },
    };
  });
}

export function EntityMap({
  entities,
  missingCount,
}: {
  entities: MapEntity[];
  missingCount: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/positron",
      bounds: [
        [11.5, 36.5],
        [31.0, 60.0],
      ],
      fitBoundsOptions: { padding: 40 },
      // OpenFreeMap's required credit line; the style's TileJSON does not
      // reliably surface it, so we set it explicitly (bottom-right default).
      attributionControl: {
        compact: false,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      },
    });
    // Zoom only — no compass, no extra chrome.
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Test hook: lets verification scripts reach the map instance.
    (container as HTMLDivElement & { _map?: maplibregl.Map })._map = map;

    map.on("load", () => {
      const collection = { type: "FeatureCollection", features: ringOffset(entities) };
      map.addSource("entities", {
        type: "geojson",
        data: collection as never,
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 13,
      });

      // Clusters: surface fill + 1px line-strong stroke — never default blue.
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "entities",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": SURFACE,
          "circle-stroke-color": LINE_STRONG,
          "circle-stroke-width": 1,
          "circle-radius": ["step", ["get", "point_count"], 13, 25, 17, 100, 22],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "entities",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: { "text-color": INK },
      });

      // Dots: dominant capital type fill, radius 4–10 by sqrt(factsCount).
      map.addLayer({
        id: "dots",
        type: "circle",
        source: "entities",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "dominant"],
            "equity",
            COLORS.equity,
            "credit",
            COLORS.credit,
            "distressed",
            COLORS.distressed,
            COLORS.neutral,
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["sqrt", ["get", "factsCount"]],
            0,
            4,
            6,
            10,
          ],
          "circle-stroke-color": SURFACE,
          "circle-stroke-width": 1,
        },
      });

      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        if (feature === undefined) {
          return;
        }
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource("entities") as maplibregl.GeoJSONSource;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (feature.geometry as { coordinates: [number, number] }).coordinates,
            zoom,
          });
        });
      });

      map.on("click", "dots", (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) {
          return;
        }
        const base = PUBLIC_PATHS[String(properties.kind)];
        if (base !== undefined) {
          router.push(`/${base}/${String(properties.slug)}`);
        }
      });

      for (const layer of ["clusters", "dots"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    return () => {
      map.remove();
    };
  }, [entities, router]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-6 left-4 rounded-md border border-line bg-surface p-3">
        <div className="space-y-1.5">
          {(
            [
              ["Equity", COLORS.equity],
              ["Credit", COLORS.credit],
              ["Distressed", COLORS.distressed],
              ["Other", COLORS.neutral],
            ] as const
          ).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[12px] leading-none">{label}</span>
            </div>
          ))}
        </div>
        <p className="type-label mt-2.5">Size = recorded facts</p>
        {missingCount > 0 ? (
          <p className="mt-1.5 max-w-[200px] text-[11px] leading-[1.4] text-ink-muted">
            {missingCount} active {missingCount === 1 ? "entity" : "entities"} without a mappable
            HQ {missingCount === 1 ? "is" : "are"} not shown.
          </p>
        ) : null}
      </div>
    </div>
  );
}
