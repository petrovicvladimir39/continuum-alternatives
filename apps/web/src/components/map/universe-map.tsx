"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { EUROPE_MAP_BOUNDS, stripBaseLabels, type MapStyleLike } from "@continuum/shared";

/**
 * The egocentric map (Phase 32C) — a small client island fed ONLY the
 * owner's own layer data by the server page. Marker click focuses the
 * entity (?focus=slug → server renders card + path); layer checkboxes
 * toggle visibility client-side. No data fetching happens here — nothing
 * private ever leaves the owner's server-rendered page.
 */

export type UniverseMarker = {
  entityId: string;
  slug: string;
  name: string;
  layer: "firm" | "contact" | "event" | "watched";
  lat: number | null;
  lng: number | null;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const LAYER_META: Record<UniverseMarker["layer"], { label: string; color: string }> = {
  firm: { label: "My firm", color: "#17456B" }, // accent — ringed below
  contact: { label: "My contacts' firms", color: "#1D7A5F" },
  event: { label: "Event orgs", color: "#96690F" },
  watched: { label: "Watched", color: "#5C5952" },
};

export function UniverseMap({ markers, focusSlug }: { markers: UniverseMarker[]; focusSlug: string | null }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(
    new Set(["firm", "contact", "event", "watched"]),
  );
  // Bumped once the async map init lands, so the marker effect re-runs.
  const [ready, setReady] = useState(0);

  const placed = useMemo(
    () =>
      markers.filter(
        (marker): marker is UniverseMarker & { lat: number; lng: number } =>
          marker.lat !== null && marker.lng !== null,
      ),
    [markers],
  );

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) {
      return;
    }
    let cancelled = false;
    const container = containerRef.current;
    // Same pattern as entity-map: fetch the base style, strip its labels,
    // hand the stripped object to MapLibre.
    fetch(STYLE_URL)
      .then((response) => response.json())
      .then((baseStyle: MapStyleLike) => {
        if (cancelled || mapRef.current !== null) {
          return;
        }
        const map = new maplibregl.Map({
          container,
          style: stripBaseLabels(baseStyle) as never,
          bounds: EUROPE_MAP_BOUNDS,
          fitBoundsOptions: { padding: 24 },
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        setReady((count) => count + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null) {
      return;
    }
    for (const marker of markerRefs.current) {
      marker.remove();
    }
    markerRefs.current = [];
    for (const point of placed) {
      if (!visibleLayers.has(point.layer)) {
        continue;
      }
      const el = document.createElement("button");
      el.type = "button";
      el.title = point.name;
      const isFirm = point.layer === "firm";
      const isFocus = point.slug === focusSlug;
      el.style.cssText = [
        `width:${isFirm ? 14 : 10}px`,
        `height:${isFirm ? 14 : 10}px`,
        "border-radius:50%",
        `background:${LAYER_META[point.layer].color}`,
        // The firm gets the accent ring; focus gets an ink ring.
        `border:2px solid ${isFocus ? "#141311" : isFirm ? "#17456B" : "#FFFFFF"}`,
        "box-shadow:none",
        "cursor:pointer",
        "padding:0",
      ].join(";");
      el.addEventListener("click", () => {
        router.push(`/universe?focus=${point.slug}`);
      });
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markerRefs.current.push(marker);
    }
  }, [placed, visibleLayers, focusSlug, router, ready]);

  const toggle = (layer: string) => {
    setVisibleLayers((current) => {
      const next = new Set(current);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line pb-2">
        {(Object.keys(LAYER_META) as UniverseMarker["layer"][]).map((layer) => (
          <label key={layer} className="flex items-baseline gap-1.5 text-[12px] text-ink-secondary">
            <input
              type="checkbox"
              checked={visibleLayers.has(layer)}
              onChange={() => toggle(layer)}
              className="translate-y-[1px]"
            />
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: LAYER_META[layer].color }}
              />
              {LAYER_META[layer].label}
            </span>
          </label>
        ))}
      </div>
      <div ref={containerRef} className="mt-2 h-[420px] w-full border border-line" />
      {placed.length < markers.length ? (
        <p className="type-small mt-1 text-ink-muted">
          {markers.length - placed.length} entit{markers.length - placed.length === 1 ? "y" : "ies"}{" "}
          without map coordinates appear in the list below only.
        </p>
      ) : null}
    </div>
  );
}
