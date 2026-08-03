"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapCity, MapData, MapEntityCard } from "@continuum/db";
import { EUROPE_MAP_BOUNDS, stripBaseLabels, type MapStyleLike } from "@continuum/shared";
import { MapPanel, type PanelState } from "@/components/map/map-panel";
import { countryName } from "@/lib/public-labels";

/**
 * The one client-side island of the platform — all client JS stays confined
 * to the map. Base tiles: OpenFreeMap positron (keyless), the lightest
 * monochrome style; everything painted on top follows the styleguide tokens.
 *
 * Phase 16 model: ONE dot per CITY (aggregated server-side) — no per-entity
 * jitter. Hover = tooltip peek, click = right panel with the firm list,
 * row click = in-panel entity card, and only the card's explicit button
 * navigates to the full profile.
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
const INK_SECONDARY = "#5C5952";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

type Hover = {
  city: string;
  country: string;
  count: number;
  equity: number;
  credit: number;
  distressed: number;
  neutral: number;
  x: number;
  y: number;
};

function cityFeatures(cities: MapCity[]) {
  return {
    type: "FeatureCollection",
    features: cities.map((city) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [city.lng, city.lat] },
      properties: {
        key: city.key,
        city: city.city,
        country: city.country,
        count: city.count,
        dominant: city.dominant,
        equity: city.capitalTypeCounts.equity,
        credit: city.capitalTypeCounts.credit,
        distressed: city.capitalTypeCounts.distressed,
        neutral: city.capitalTypeCounts.neutral,
      },
    })),
  };
}

const EMPTY_LINES = { type: "FeatureCollection", features: [] } as const;

export function EntityMap({ data, missingCount }: { data: MapData; missingCount: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [card, setCard] = useState<MapEntityCard | null>(null);

  // Entity card fetch — small on-demand payload; the map list itself stays inline.
  const selectEntity = useCallback(
    (entityId: string, cityKey: string) => {
      setPanel({ mode: "entity", entityId, cityKey });
      setCard(null);
      void fetch(`/api/map/entity/${entityId}`)
        .then((response) => (response.ok ? (response.json() as Promise<MapEntityCard>) : null))
        .then((result) => {
          setCard(result);
        })
        .catch(() => {
          setCard(null);
        });
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    let activeMap: maplibregl.Map | null = null;
    let cancelled = false;

    // Fetch the base style and strip its label layers (everything except
    // country labels) before the map ever renders — the canvas stays quiet
    // and OUR city labels (below) are the only town names on it.
    void fetch(STYLE_URL)
      .then((response) => response.json() as Promise<MapStyleLike>)
      .then((baseStyle) => {
        if (cancelled || containerRef.current === null) {
          return;
        }
        initMap(stripBaseLabels(baseStyle));
      })
      .catch(() => {
        // Style fetch failed — fall back to the untransformed hosted style.
        if (!cancelled && containerRef.current !== null) {
          initMap(STYLE_URL);
        }
      });

    function initMap(style: MapStyleLike | string) {
      const map = new maplibregl.Map({
      container: container as HTMLDivElement,
      style: style as never,
      bounds: EUROPE_MAP_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      // OpenFreeMap's required credit line; the style's TileJSON does not
      // reliably surface it, so we set it explicitly (bottom-right default).
      attributionControl: {
        compact: false,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    activeMap = map;
    mapRef.current = map;
    // Test hook: lets verification scripts reach the map instance.
    (container as HTMLDivElement & { _map?: maplibregl.Map })._map = map;

    map.on("load", () => {
      map.addSource("cities", {
        type: "geojson",
        data: cityFeatures(data.cities) as never,
        // Clustering kept ONLY for zoomed-out city-of-cities aggregation:
        // maxZoom 5 means every individual city is visible from mid-zoom on.
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 5,
        clusterProperties: { total: ["+", ["get", "count"]] },
      });
      // Connection lines (entity card selection) — empty until a card opens.
      map.addSource("connections", { type: "geojson", data: EMPTY_LINES as never });

      map.addLayer({
        id: "connection-lines",
        type: "line",
        source: "connections",
        paint: {
          "line-color": [
            "match",
            ["get", "group"],
            "equity",
            COLORS.equity,
            "credit",
            COLORS.credit,
            "distressed",
            COLORS.distressed,
            COLORS.neutral,
          ],
          "line-width": 1.5,
          "line-opacity": 0.75,
        },
      });

      // City-of-cities clusters (low zoom only): surface fill, 1px stroke.
      map.addLayer({
        id: "city-clusters",
        type: "circle",
        source: "cities",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": SURFACE,
          "circle-stroke-color": LINE_STRONG,
          "circle-stroke-width": 1,
          "circle-radius": ["step", ["get", "total"], 14, 50, 18, 250, 24],
        },
      });
      map.addLayer({
        id: "city-cluster-count",
        type: "symbol",
        source: "cities",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "total"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: { "text-color": INK },
      });

      // City dots: dominant capital type fill, radius 6–22 by sqrt(count).
      map.addLayer({
        id: "cities",
        type: "circle",
        source: "cities",
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
          "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "count"]], 1, 6, 15, 22],
          "circle-stroke-color": SURFACE,
          "circle-stroke-width": 1,
        },
      });
      // Count label centered on the dot when it is large enough (radius ≥ 14
      // ⇔ count ≥ 64 under the interpolation above).
      map.addLayer({
        id: "city-count",
        type: "symbol",
        source: "cities",
        filter: ["all", ["!", ["has", "point_count"]], [">=", ["get", "count"], 64]],
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": SURFACE },
      });
      // OUR city labels — only cities we have firms in, visible exactly when
      // the city's dot is unclustered (same source + filter). 11px in the
      // ink-secondary token. NOTE: MapLibre glyphs come from the tile server's
      // glyph set, which does not include Instrument Sans — Noto Sans Regular
      // is the closest available face; collision handling is MapLibre default.
      map.addLayer({
        id: "city-labels",
        type: "symbol",
        source: "cities",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "city"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-variable-anchor-offset": ["top", [0, 1.1], "bottom", [0, -1.1]],
        },
        paint: {
          "text-color": INK_SECONDARY,
          "text-halo-color": SURFACE,
          "text-halo-width": 1,
        },
      });

      map.on("click", "city-clusters", (event) => {
        const feature = event.features?.[0];
        if (feature === undefined) {
          return;
        }
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource("cities") as maplibregl.GeoJSONSource;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            // `as unknown` hop: the newer @types/geojson union (pulled in by
            // deck.gl) no longer overlaps structurally; behavior unchanged.
            center: (feature.geometry as unknown as { coordinates: [number, number] }).coordinates,
            zoom,
          });
        });
      });

      map.on("click", "cities", (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) {
          return;
        }
        setHover(null);
        setPanel({ mode: "city", cityKey: String(properties.key) });
        setCard(null);
      });

      map.on("mousemove", "cities", (event) => {
        const properties = event.features?.[0]?.properties;
        if (!properties) {
          return;
        }
        setHover({
          city: String(properties.city),
          country: String(properties.country),
          count: Number(properties.count),
          equity: Number(properties.equity),
          credit: Number(properties.credit),
          distressed: Number(properties.distressed),
          neutral: Number(properties.neutral),
          x: event.point.x,
          y: event.point.y,
        });
      });
      map.on("mouseleave", "cities", () => {
        setHover(null);
      });

      for (const layer of ["city-clusters", "cities"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });
    }

    return () => {
      cancelled = true;
      mapRef.current = null;
      activeMap?.remove();
    };
  }, [data]);

  // Connection lines follow the selected entity card.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null) {
      return;
    }
    const apply = () => {
      const source = map.getSource("connections") as maplibregl.GeoJSONSource | undefined;
      if (source === undefined) {
        return;
      }
      if (card === null || card.lat === null || card.lng === null) {
        source.setData(EMPTY_LINES as never);
        return;
      }
      source.setData({
        type: "FeatureCollection",
        features: card.lines.map((line) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [card.lng, card.lat],
              [line.toLng, line.toLat],
            ],
          },
          properties: { group: line.group },
        })),
      } as never);
    };
    if (map.loaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [card]);

  const breakdown =
    hover === null
      ? []
      : (
          [
            ["equity", hover.equity],
            ["credit", hover.credit],
            ["distressed", hover.distressed],
            ["neutral", hover.neutral],
          ] as const
        ).filter(([, n]) => n > 0);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {/* Hover peek — no navigation. */}
      {hover !== null && panel === null ? (
        <div
          className="pointer-events-none absolute z-20 rounded-sm border border-line bg-surface px-3 py-2"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <p className="font-serif text-[14px] leading-[1.2] font-medium">
            {hover.city}, {countryName(hover.country) ?? hover.country}
          </p>
          <p className="type-data mt-0.5 text-ink-secondary">
            {hover.count} firm{hover.count === 1 ? "" : "s"}
          </p>
          {breakdown.length > 0 ? (
            <p className="mt-1 flex items-center gap-2">
              {breakdown.map(([type, n]) => (
                <span key={type} className="flex items-center gap-1 text-[11px] text-ink-secondary">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[type] }}
                  />
                  {n} {type === "neutral" ? "other" : type}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      {panel !== null ? (
        <MapPanel
          state={panel}
          cities={data.cities}
          entities={data.entities}
          card={card}
          onSelectEntity={(id) => {
            selectEntity(id, panel.cityKey);
          }}
          onBackToCity={() => {
            setPanel({ mode: "city", cityKey: panel.cityKey });
            setCard(null);
          }}
          onClose={() => {
            setPanel(null);
            setCard(null);
          }}
        />
      ) : null}

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
        <p className="type-label mt-2.5">Size = firms in city</p>
        <p className="type-data mt-1.5 text-ink-secondary">
          {data.cities.length} cities · {data.entities.length} entities · {data.countries}{" "}
          countries
        </p>
        {missingCount > 0 ? (
          <p className="mt-1 max-w-[200px] text-[11px] leading-[1.4] text-ink-muted">
            {missingCount} active {missingCount === 1 ? "entity" : "entities"} without a mappable
            HQ {missingCount === 1 ? "is" : "are"} not shown.
          </p>
        ) : null}
      </div>
    </div>
  );
}
