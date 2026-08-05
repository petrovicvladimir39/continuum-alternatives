"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * /v2/serbia — the Serbian entity map.
 *
 * Zoom tiers: clustered counts far out → individual pins close in. Pins carry
 * the company logo where we have one and a monogram tile otherwise, coloured
 * by Level-1 asset class.
 *
 * HONESTY IN THE RENDER: coordinate precision travels with every feature.
 * City-centroid pins are drawn hollow and are excluded by the "precise
 * locations only" filter, because a centroid is a different claim from a
 * rooftop fix and the map should not blur the two.
 */

type Props = Record<string, string | number | string[] | null>;
type Feature = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Props };

const L1_COLOR: Record<string, string> = {
  pe_growth: "#7c5cff",
  private_debt: "#e0623d",
  real_assets: "#2f9e6e",
  liquid_alts: "#2d7ff9",
  niche_alts: "#d4a12a",
  service_graph: "#6b7280",
  unclassified: "#9aa3af",
};

const L1_LABEL: Record<string, string> = {
  pe_growth: "Private Equity & Growth",
  private_debt: "Private Debt & Credit",
  real_assets: "Real Assets & Infrastructure",
  liquid_alts: "Liquid Alternatives",
  niche_alts: "Niche & Emerging",
  service_graph: "Service Graph",
  unclassified: "Unclassified",
};

const STYLE = "https://tiles.openfreemap.org/styles/positron";

function fmtRsd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} mlrd RSD`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} mil RSD`;
  return `${n.toLocaleString("sr-RS")} RSD`;
}

export function SerbiaMap(): React.ReactElement {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<MlMap | null>(null);
  const [all, setAll] = useState<Feature[]>([]);
  const [selected, setSelected] = useState<Props | null>(null);
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [city, setCity] = useState<string>("");
  const [preciseOnly, setPreciseOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetch("/api/serbia/entities")
      .then((r) => r.json())
      .then((json: { features: Feature[] }) => {
        if (alive) {
          setAll(json.features ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of all) {
      const c = (f.properties.city as string | null) ?? "";
      if (c !== "") counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [all]);

  const roleList = useMemo(() => {
    const s = new Set<string>();
    for (const f of all) {
      const r = f.properties.role as string | null;
      if (r !== null && r !== "") s.add(r);
    }
    return [...s].sort();
  }, [all]);

  const filtered = useMemo(
    () =>
      all.filter((f) => {
        const p = f.properties;
        if (classes.size > 0 && !classes.has(String(p.l1))) return false;
        if (roles.size > 0 && !roles.has(String(p.role ?? ""))) return false;
        if (city !== "" && p.city !== city) return false;
        if (preciseOnly && p.precision === "city") return false;
        return true;
      }),
    [all, classes, roles, city, preciseOnly],
  );

  // Map init (once).
  useEffect(() => {
    if (container.current === null || map.current !== null) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE,
      center: [20.9, 44.1],
      zoom: 6.4,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("rs", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 46,
        clusterMaxZoom: 11,
      });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "rs",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1f2937",
          "circle-opacity": 0.86,
          "circle-radius": ["step", ["get", "point_count"], 15, 25, 21, 100, 27, 500, 34],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "rs",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      m.addLayer({
        id: "pin",
        type: "circle",
        source: "rs",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "l1"],
            ...Object.entries(L1_COLOR).flatMap(([k, v]) => [k, v]),
            "#9aa3af",
          ],
          // Hollow fill for city-centroid pins: a centroid is a weaker claim.
          "circle-opacity": ["case", ["==", ["get", "precision"], "city"], 0.25, 0.9],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 8],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.on("click", "pin", (ev) => {
        const f = ev.features?.[0];
        if (f !== undefined) setSelected(f.properties as Props);
      });
      m.on("click", "clusters", (ev) => {
        const f = ev.features?.[0];
        if (f === undefined) return;
        m.easeTo({ center: (f.geometry as { coordinates: [number, number] }).coordinates, zoom: m.getZoom() + 2 });
      });
      for (const layer of ["pin", "clusters"]) {
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Push filtered data into the source.
  useEffect(() => {
    const m = map.current;
    if (m === null) return;
    const apply = (): void => {
      const src = m.getSource("rs") as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: filtered } as GeoJSON.FeatureCollection);
    };
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [filtered]);

  const toggle = (set: Set<string>, val: string, fn: (s: Set<string>) => void): void => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    fn(next);
  };

  const p = selected;

  return (
    <div className="relative flex h-full w-full">
      {/* Filter rail */}
      <aside className="z-10 w-64 shrink-0 overflow-y-auto border-r border-black/10 bg-white/95 p-4 text-[13px]">
        <h1 className="mb-1 text-[15px] font-semibold">Serbia</h1>
        <p className="mb-4 text-[12px] text-neutral-500">
          {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${all.length.toLocaleString()} placed`}
        </p>

        <label className="mb-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={preciseOnly}
            onChange={(e) => setPreciseOnly(e.target.checked)}
          />
          <span>Precise locations only</span>
        </label>

        <div className="mb-4">
          <div className="mb-1.5 font-medium">Asset class</div>
          {Object.entries(L1_LABEL).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 py-0.5">
              <input type="checkbox" checked={classes.has(k)} onChange={() => toggle(classes, k, setClasses)} />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: L1_COLOR[k] }}
              />
              <span className="truncate">{label}</span>
            </label>
          ))}
        </div>

        {roleList.length > 0 && (
          <div className="mb-4">
            <div className="mb-1.5 font-medium">Role</div>
            {roleList.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 py-0.5">
                <input type="checkbox" checked={roles.has(r)} onChange={() => toggle(roles, r, setRoles)} />
                <span className="truncate">{r}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mb-2">
          <div className="mb-1.5 font-medium">City</div>
          <select
            className="w-full rounded border border-black/15 px-2 py-1"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All cities</option>
            {cities.map(([c, n]) => (
              <option key={c} value={c}>
                {c} ({n})
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-[11px] leading-snug text-neutral-500">
          Hollow pins are city-centroid placements, not exact addresses.
          Register data is live; machine-proposed classifications await review.
        </p>
      </aside>

      <div ref={container} className="h-full flex-1" />

      {/* Entity sheet */}
      {p !== null && (
        <aside className="absolute right-0 top-0 z-20 h-full w-[380px] overflow-y-auto border-l border-black/10 bg-white p-5 text-[13px] shadow-xl">
          <button
            className="float-right text-[18px] leading-none text-neutral-400 hover:text-neutral-700"
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            ×
          </button>
          <div className="mb-3 flex items-start gap-3">
            {typeof p.logo === "string" && p.logo !== "" ? (
              // Logos are third-party URLs of unknown dimensions, so a plain
              // <img> is correct here; next/image would need per-host config.
              <img src={p.logo} alt="" className="h-12 w-12 rounded border border-black/10 object-contain" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded text-[15px] font-semibold text-white"
                style={{ background: L1_COLOR[String(p.l1)] ?? "#9aa3af" }}
              >
                {String(p.name).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold leading-tight">{String(p.name)}</h2>
              <div className="text-[12px] text-neutral-500">
                {L1_LABEL[String(p.l1)] ?? "Unclassified"}
                {p.role !== null && p.role !== undefined ? ` · ${String(p.role)}` : ""}
              </div>
            </div>
          </div>

          {typeof p.summary === "string" && p.summary !== "" && (
            <p className="mb-4 text-[12px] leading-relaxed text-neutral-700">{p.summary}</p>
          )}

          <dl className="space-y-1.5">
            {(
              [
                ["Industry", p.nace],
                ["Company type", p.companyType],
                ["Employees", p.employeeRange ?? p.employees],
                ["Revenue", p.revenue === null ? p.revenueRange : fmtRsd(Number(p.revenue))],
                ["Legal form", p.legalForm],
                ["Status", p.status],
                ["Founded", p.founded],
                ["Matični broj", p.mb],
                ["PIB", p.pib],
                ["Address", [p.street, p.city].filter(Boolean).join(", ")],
                ["Location precision", p.precision],
              ] as [string, unknown][]
            )
              .filter(([, v]) => v !== null && v !== undefined && String(v) !== "")
              .map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-[130px] shrink-0 text-neutral-500">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words">{String(v)}</dd>
                </div>
              ))}
          </dl>

          {(typeof p.website === "string" || typeof p.email === "string" || typeof p.linkedin === "string") && (
            <div className="mt-4 flex flex-wrap gap-2">
              {typeof p.website === "string" && (
                <a className="rounded border border-black/15 px-2 py-1 text-[12px] hover:bg-neutral-50" href={p.website} target="_blank" rel="noreferrer">
                  Website
                </a>
              )}
              {typeof p.email === "string" && (
                <a className="rounded border border-black/15 px-2 py-1 text-[12px] hover:bg-neutral-50" href={`mailto:${p.email}`}>
                  Email
                </a>
              )}
              {typeof p.linkedin === "string" && (
                <a className="rounded border border-black/15 px-2 py-1 text-[12px] hover:bg-neutral-50" href={p.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          )}

          {Array.isArray(p.banks) && p.banks.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 font-medium">Banking relationships</div>
              <ul className="space-y-0.5 text-[12px] text-neutral-700">
                {(p.banks as string[]).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-neutral-500">
                NBS Jedinstveni registar računa · proposed, pending review
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
