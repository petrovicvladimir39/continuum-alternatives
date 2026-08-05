"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type DataDrivenPropertyValueSpecification,
  type Map as MlMap,
} from "maplibre-gl";
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
  /** Logos-only is the DEFAULT view: it is the map worth looking at, and it
   *  also cuts the payload to the ~25% of entities that carry a logo. */
  const [logosOnly, setLogosOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  /**
   * VIEWPORT LOADING. The whole country in one response was 6.8 MB — big
   * enough that the browser rejected the cache write and the fetch silently
   * failed. Real vector tiles would be the textbook answer, but tippecanoe is
   * not available here, so this fetches per viewport instead: the server
   * returns a revenue-ranked head at low zoom and everything in the bbox once
   * zoomed in. Results accumulate by id, so panning back does not re-fetch
   * and the pins you have already seen stay put.
   */
  const seenIds = useRef<Set<string>>(new Set());
  const inflight = useRef<AbortController | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Until one request has landed, later moves must NOT abort it — map settle
   *  fires several moveend events and each abort was starving the first load,
   *  which is why the rail sat on "Loading…" forever. */
  const hasLoaded = useRef(false);
  const initialLoad = useRef(false);
  // Read inside the stable loader without re-creating it on every toggle.
  const logosOnlyRef = useRef(true);
  logosOnlyRef.current = logosOnly;

  const loadViewport = useMemo(
    () =>
      (m: MlMap): void => {
        const b = m.getBounds();
        const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
          .map((n) => n.toFixed(4))
          .join(",");
        const z = m.getZoom().toFixed(1);
        // Only pre-empt an in-flight request once something has already
        // landed. Before that, let the first load finish.
        if (hasLoaded.current) {
          inflight.current?.abort();
        } else if (inflight.current !== null) {
          return;
        }
        const ctrl = new AbortController();
        inflight.current = ctrl;
        setLoading(true);
        void fetch(
          `/api/serbia/entities?bbox=${bbox}&z=${z}${logosOnlyRef.current ? "&logos=1" : ""}`,
          { signal: ctrl.signal },
        )
          .then((r) => r.json())
          .then((json: { features: Feature[] }) => {
            const fresh = (json.features ?? []).filter(
              (f) => !seenIds.current.has(String(f.properties.id)),
            );
            for (const f of fresh) {
              seenIds.current.add(String(f.properties.id));
            }
            if (fresh.length > 0) {
              setAll((prev) => [...prev, ...fresh]);
            }
            hasLoaded.current = true;
            inflight.current = null;
            setLoading(false);
          })
          .catch((err: unknown) => {
            // An abort means a newer viewport request took over, so it keeps
            // the spinner. Any real failure must clear it, or the rail reads
            // "Loading…" forever with no error anywhere to explain why.
            if (!(err instanceof DOMException && err.name === "AbortError")) {
              inflight.current = null;
              setLoading(false);
            }
          });
      },
    [],
  );

  /**
   * Initial load is deliberately INDEPENDENT of the map's `load` event.
   * Chrome suspends requestAnimationFrame in a background tab, so MapLibre's
   * `load` never fires there — gating the first fetch on it left the map
   * permanently empty with no error to show for it. Data now loads on mount
   * over Serbia's bounds; `moveend` refines it once the map is interactive.
   */
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    void fetch(`/api/serbia/entities?bbox=18.5,41.8,23.2,46.3&z=6.4${logosOnly ? "&logos=1" : ""}`)
      .then((r) => r.json())
      .then((json: { features: Feature[] }) => {
        for (const f of json.features ?? []) seenIds.current.add(String(f.properties.id));
        setAll(json.features ?? []);
        hasLoaded.current = true;
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Mount-only by design: logosOnly is read once here and its toggle does
    // its own reset-and-refetch, so listing it as a dep would double-fetch.
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
        if (logosOnly && (p.logo === null || p.logo === undefined || p.logo === "")) return false;
        return true;
      }),
    [all, classes, roles, city, preciseOnly, logosOnly],
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
          // Built from L1_COLOR at runtime, so the palette has one home. The
          // cast is needed because a spread loses the fixed-arity tuple shape
          // MapLibre's `match` type demands.
          "circle-color": [
            "match",
            ["get", "l1"],
            ...Object.entries(L1_COLOR).flatMap(([k, v]) => [k, v]),
            "#9aa3af",
          ] as unknown as DataDrivenPropertyValueSpecification<string>,
          // Hollow fill for city-centroid pins: a centroid is a weaker claim.
          "circle-opacity": ["case", ["has", "icon"], 0, ["==", ["get", "precision"], "city"], 0.25, 0.9],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 8],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      // LOGO PINS: a symbol layer above the circles. Icons are registered
      // lazily (see the loader effect) — a feature only joins this layer once
      // its logo has actually decoded, so a broken image degrades to the
      // circle beneath rather than leaving a hole.
      m.addLayer({
        id: "logo-pin",
        type: "symbol",
        source: "rs",
        filter: ["all", ["!", ["has", "point_count"]], ["has", "icon"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.32, 14, 0.6],
          "icon-allow-overlap": false,
          "icon-padding": 2,
          // Bigger companies win collisions, so majors stay visible as
          // smaller firms fade in on zoom.
          "symbol-sort-key": ["-", 0, ["coalesce", ["get", "revenue"], 0]],
        },
      });
      m.on("click", "logo-pin", (ev) => {
        const f = ev.features?.[0];
        if (f !== undefined) setSelected(f.properties as Props);
      });
      m.on("mouseenter", "logo-pin", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "logo-pin", () => (m.getCanvas().style.cursor = ""));

      m.on("click", "pin", (ev) => {
        const f = ev.features?.[0];
        if (f !== undefined) setSelected(f.properties as Props);
      });
      m.on("click", "clusters", (ev) => {
        const f = ev.features?.[0];
        if (f === undefined) return;
        if (f.geometry.type !== "Point") return;
        m.easeTo({ center: f.geometry.coordinates as [number, number], zoom: m.getZoom() + 2 });
      });
      for (const layer of ["pin", "clusters"]) {
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }
      // Debounced: map settle emits several moveend events in quick
      // succession, and firing on each one was thrashing the endpoint.
      m.on("moveend", () => {
        if (debounce.current !== null) {
          clearTimeout(debounce.current);
        }
        debounce.current = setTimeout(() => loadViewport(m), 450);
      });
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  /**
   * Logo loader. Company logos are third-party URLs of unknown size, so each
   * is fetched, drawn onto a square canvas with rounded corners and registered
   * with map.addImage() under a per-entity id. Only then does the feature get
   * an `icon` property, which is what puts it in the symbol layer — so a 404
   * or a CORS refusal simply leaves the coloured circle showing instead of a
   * blank pin. Loading is capped and revenue-ordered: the largest companies
   * get logos first, which is also what survives label collision.
   */
  const [iconReady, setIconReady] = useState(0);
  /** Logos that actually decoded and registered — reported in the rail, since
   *  "fetched" and "drawable" are different claims and only the second one
   *  puts a pin on the map. */
  const [iconCount, setIconCount] = useState(0);
  const loadedIcons = useRef<Set<string>>(new Set());

  useEffect(() => {
    const m = map.current;
    if (m === null || all.length === 0) return;
    let cancelled = false;

    const candidates = all
      .filter((f) => typeof f.properties.logo === "string" && f.properties.logo !== "")
      .slice(0, 2000);

    /** One logo: fetch (same-origin proxy) -> decode -> canvas -> addImage.
     *
     *  createImageBitmap, NOT `new Image()` + decode(): an HTMLImageElement's
     *  decode() promise never settles while the document is hidden, which
     *  silently wedged the first batch forever (10 logos fetched, then
     *  nothing). createImageBitmap decodes off the rendering path and is
     *  unaffected by visibility. The timeout is belt-and-braces so no single
     *  slow host can stall the batch it sits in. */
    const loadOne = async (f: Feature): Promise<boolean> => {
      const id = String(f.properties.id);
      try {
        const res = await fetch(
          `/api/serbia/logo?url=${encodeURIComponent(String(f.properties.logo))}`,
          { signal: AbortSignal.timeout(12_000) },
        );
        if (!res.ok) return false;
        const img = await createImageBitmap(await res.blob());
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext("2d");
        if (ctx === null) return false;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(0, 0, 64, 64, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.14)";
        ctx.stroke();
        ctx.clip();
        const scale = Math.min(56 / img.width, 56 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
        const data = ctx.getImageData(0, 0, 64, 64);
        img.close();
        if (!m.hasImage(id)) m.addImage(id, data, { pixelRatio: 2 });
        return true;
      } catch {
        return false;
      }
    };

    // A WORKER POOL, not fixed batches. Sequential loading managed about one
    // logo a second and would never have finished; fixed batches were barely
    // better, because every batch waits on its slowest member and a dead
    // third-party host burns the full timeout while eleven workers idle. Each
    // worker here pulls the next item the moment it is free, so one bad host
    // costs one slot rather than a whole batch.
    const run = async (): Promise<void> => {
      const todo = candidates.filter((f) => !loadedIcons.current.has(String(f.properties.id)));
      for (const f of todo) loadedIcons.current.add(String(f.properties.id));

      let next = 0;
      let done = 0;
      let ok = 0;
      const worker = async (): Promise<void> => {
        while (!cancelled) {
          const f = todo[next++];
          if (f === undefined) return;
          if (await loadOne(f)) ok += 1;
          done += 1;
          // Re-tag the source periodically rather than per logo: each tag is a
          // full setData, so doing it 900 times would cost more than the loads.
          if (done % 20 === 0 && !cancelled) {
            setIconReady((n) => n + 1);
            setIconCount(ok);
          }
        }
      };
      await Promise.all(Array.from({ length: 16 }, worker));
      if (!cancelled) {
        setIconReady((n) => n + 1);
        setIconCount(ok);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [all]);

  // Push filtered data into the source, tagging features whose logo image is
  // registered so the symbol layer can pick them up.
  useEffect(() => {
    const m = map.current;
    if (m === null) return;
    const apply = (): void => {
      const src = m.getSource("rs") as maplibregl.GeoJSONSource | undefined;
      const features = filtered.map((f) => {
        const id = String(f.properties.id);
        return m.hasImage(id)
          ? { ...f, properties: { ...f.properties, icon: id } }
          : f;
      });
      src?.setData({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection);
    };
    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [filtered, iconReady]);

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
          {iconCount > 0 && (
            <>
              <br />
              {iconCount.toLocaleString()} logos drawn
            </>
          )}
        </p>

        <label className="mb-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={logosOnly}
            onChange={(e) => {
              setLogosOnly(e.target.checked);
              seenIds.current.clear();
              setAll([]);
              const m = map.current;
              if (m !== null) loadViewport(m);
            }}
          />
          <span>Companies with logos only</span>
        </label>
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
