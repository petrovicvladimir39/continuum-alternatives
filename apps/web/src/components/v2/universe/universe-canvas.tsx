"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DeckGL, { ScatterplotLayer } from "deck.gl";
import { Map as MapGL } from "react-map-gl/maplibre";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildMockEdges,
  mockFeedPage,
  MOCK_COUNTRIES,
  MOCK_ENTITIES,
  MOCK_ENTITY_BY_ID,
  type MockEntity,
} from "@continuum/shared";
import { fmtDate, fmtEuroM } from "@/lib/v2/format";
import { CLASS_RGB_DARK, V2_CLASSES, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * P4 — Universe map canvas. MapLibre (OpenFreeMap dark, monochrome) +
 * deck.gl scatter encoding: COLOR = asset class (the sanctioned accent
 * encoding), RADIUS = AUM. Layer toggles by ROLE and by CLASS; the
 * ContextualFilterRail narrows geography/AUM/tier; pin click opens the
 * EntitySlideOut without touching the view state.
 *
 * Deviation from the blueprint noted: no cluster layer — at mock scale
 * (116 entities) clustering would hide the map's point; real-data cutover
 * adds a cluster/heat layer at 30k scale.
 */

const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const ROLE_LAYERS: { key: string; label: string; roles: MockEntity["role"][] }[] = [
  { key: "managers", label: "Fund Managers", roles: ["gp", "fund"] },
  { key: "lps", label: "LPs", roles: ["lp"] },
  { key: "servicers", label: "Servicers & Advisors", roles: ["servicer", "advisor", "lender"] },
  { key: "companies", label: "Real Assets & Companies", roles: ["company"] },
  { key: "regulatory", label: "Regulatory", roles: ["regulator"] },
];

const AUM_BANDS: { key: string; label: string; min: number; max: number }[] = [
  { key: "all", label: "Any AUM", min: -1, max: Infinity },
  { key: "lt500", label: "< €500m", min: -1, max: 500 },
  { key: "500-2000", label: "€500m – €2bn", min: 500, max: 2000 },
  { key: "gt2000", label: "> €2bn", min: 2000, max: Infinity },
];

function EntitySlideOut({ entity, onClose }: { entity: MockEntity; onClose: () => void }) {
  const cls = v2ClassFor(entity.assetClass);
  const edges = useMemo(() => {
    return buildMockEdges()
      .filter((e) => e.sourceId === entity.id || e.targetId === entity.id)
      .slice(0, 8)
      .map((e) => {
        const otherId = e.sourceId === entity.id ? e.targetId : e.sourceId;
        const other = MOCK_ENTITY_BY_ID.get(otherId);
        return { id: e.id, type: e.edgeType.replace(/_/g, " "), other: other?.name ?? otherId };
      });
  }, [entity]);
  const signals = useMemo(
    () => mockFeedPage({ pageSize: 400 }).items.filter((i) => i.entitySlug === entity.slug).slice(0, 5),
    [entity],
  );

  return (
    <aside className="absolute right-0 top-0 z-20 h-full w-full max-w-[380px] overflow-y-auto border-l border-line-strong bg-ground p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`type-label ${cls?.accent.text ?? ""}`}>{cls?.label}</div>
          <h2 className="type-h2 mt-1">{entity.name}</h2>
          <div className="type-small mt-1 text-ink-secondary">
            {entity.city}, {entity.country} · {entity.strategy}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close entity panel" className="cursor-pointer text-ink-muted hover:text-ink">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-surface px-3 py-2">
          <div className="type-label">AUM / Book</div>
          <div className="type-data mt-0.5">{fmtEuroM(entity.aumM)}</div>
        </div>
        <div className="bg-surface px-3 py-2">
          <div className="type-label">Tier</div>
          <div className="type-mono mt-0.5 text-ink-secondary">{entity.tier.toUpperCase()}</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="type-label border-b border-line pb-1.5">Relationship edges</div>
        {edges.length === 0 ? (
          <div className="terminal-empty mt-2">[ 0 EDGES RECORDED ]</div>
        ) : (
          edges.map((e) => (
            <div key={e.id} className="flex items-baseline justify-between border-b border-line py-1.5 last:border-b-0">
              <span className="type-small min-w-0 truncate">{e.other}</span>
              <span className="type-mono ml-2 shrink-0 text-ink-muted">{e.type.toUpperCase()}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-5">
        <div className="type-label border-b border-line pb-1.5">Recent signals</div>
        {signals.length === 0 ? (
          <div className="terminal-empty mt-2">[ 0 SIGNALS · 60D ]</div>
        ) : (
          signals.map((s) => (
            <div key={s.id} className="border-b border-line py-1.5 last:border-b-0">
              <div className="type-small">{s.title}</div>
              <div className="type-data mt-0.5 text-ink-muted">{fmtDate(s.occurredOn)}</div>
            </div>
          ))
        )}
      </div>

      <Link
        href={`/v2/products/company-intelligence?q=${encodeURIComponent(entity.name)}`}
        className="type-label mt-5 inline-block border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
      >
        Open in screener →
      </Link>
    </aside>
  );
}

export function UniverseCanvas({
  heightClass = "h-[90vh]",
  initialCity,
}: {
  heightClass?: string;
  /** Center on a city (city pages); otherwise Europe-wide. */
  initialCity?: { lat: number; lng: number };
}) {
  const reduced = useReducedMotion();
  const [railOpen, setRailOpen] = useState(true);
  const [activeRoles, setActiveRoles] = useState<Set<string>>(
    () => new Set(ROLE_LAYERS.map((r) => r.key)),
  );
  const [activeClasses, setActiveClasses] = useState<Set<string>>(
    () => new Set(V2_CLASSES.map((c) => c.slug)),
  );
  const [country, setCountry] = useState<string>("all");
  const [aumBand, setAumBand] = useState<string>("all");
  const [tiers, setTiers] = useState<Set<string>>(() => new Set(["verified", "register", "monitored"]));
  const [selected, setSelected] = useState<MockEntity | null>(null);

  const filtered = useMemo(() => {
    const roleSet = new Set(ROLE_LAYERS.filter((r) => activeRoles.has(r.key)).flatMap((r) => r.roles));
    const band = AUM_BANDS.find((b) => b.key === aumBand)!;
    return MOCK_ENTITIES.filter((e) => {
      if (!roleSet.has(e.role) || !activeClasses.has(e.assetClass) || !tiers.has(e.tier)) {
        return false;
      }
      if (country !== "all" && e.country !== country) {
        return false;
      }
      if (aumBand !== "all") {
        if (e.aumM === null) {
          return false;
        }
        if (e.aumM <= band.min || e.aumM > band.max) {
          return false;
        }
      }
      return true;
    });
  }, [activeRoles, activeClasses, country, aumBand, tiers]);

  const layers = useMemo(
    () => [
      new ScatterplotLayer<MockEntity>({
        id: "entities",
        data: filtered,
        getPosition: (d) => [d.lng, d.lat],
        getFillColor: (d) => {
          const rgb = CLASS_RGB_DARK[d.assetClass] ?? [160, 160, 160];
          return [rgb[0], rgb[1], rgb[2], 205];
        },
        getRadius: (d) => 4000 + Math.sqrt(d.aumM ?? 100) * 900,
        radiusMinPixels: 3,
        radiusMaxPixels: 22,
        pickable: true,
        stroked: true,
        getLineColor: [18, 18, 18, 255],
        lineWidthMinPixels: 1,
        onClick: (info) => setSelected((info.object as MockEntity) ?? null),
        updateTriggers: { getFillColor: [filtered] },
      }),
    ],
    [filtered],
  );

  const toggle = (set: Set<string>, key: string, apply: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    apply(next);
  };

  return (
    <div className={`relative w-full overflow-hidden border-b border-line bg-[#121212] ${heightClass}`}>
      <DeckGL
        initialViewState={{
          longitude: initialCity?.lng ?? 14,
          latitude: initialCity?.lat ?? 50,
          zoom: initialCity !== undefined ? 10 : 4,
        }}
        controller
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) {
            return null;
          }
          const e = object as MockEntity;
          return {
            text: `${e.name}\n${e.city} · ${e.strategy}${e.aumM !== null ? ` · ${fmtEuroM(e.aumM)}` : ""}`,
            style: {
              backgroundColor: "#181817",
              color: "#edecea",
              fontSize: "12px",
              border: "1px solid #383838",
              borderRadius: "0",
              padding: "6px 8px",
            },
          };
        }}
      >
        <MapGL mapStyle={DARK_STYLE} attributionControl={false} />
      </DeckGL>

      {/* ContextualFilterRail — left drawer */}
      <motion.div
        initial={false}
        animate={{ x: railOpen ? 0 : -268 }}
        transition={reduced === true ? { duration: 0 } : { duration: 0.2 }}
        className="absolute left-0 top-0 z-10 flex h-full"
      >
        <div className="v2-root h-full w-[268px] overflow-y-auto border-r border-[#262626] bg-[#121212] p-4 text-[#edecea]" data-v2-theme="dark">
          <div className="type-label text-[#a5a29b]">Layers · by role</div>
          {ROLE_LAYERS.map((r) => (
            <label key={r.key} className="mt-1.5 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={activeRoles.has(r.key)}
                onChange={() => toggle(activeRoles, r.key, setActiveRoles)}
                className="accent-[#7aa7cd]"
              />
              <span className="type-small">{r.label}</span>
            </label>
          ))}

          <div className="type-label mt-5 text-[#a5a29b]">Layers · by asset class</div>
          {V2_CLASSES.map((c) => {
            const rgb = CLASS_RGB_DARK[c.slug]!;
            return (
              <label key={c.slug} className="mt-1.5 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeClasses.has(c.slug)}
                  onChange={() => toggle(activeClasses, c.slug, setActiveClasses)}
                  className="accent-[#7aa7cd]"
                />
                <span className="inline-block h-2 w-2" style={{ backgroundColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` }} />
                <span className="type-small">{c.label}</span>
              </label>
            );
          })}

          <div className="type-label mt-5 text-[#a5a29b]">Geography</div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="type-small mt-1.5 w-full border border-[#383838] bg-[#181817] px-2 py-1.5 text-[#edecea]"
          >
            <option value="all">All countries ({MOCK_COUNTRIES.length})</option>
            {MOCK_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="type-label mt-5 text-[#a5a29b]">AUM band</div>
          <select
            value={aumBand}
            onChange={(e) => setAumBand(e.target.value)}
            className="type-small mt-1.5 w-full border border-[#383838] bg-[#181817] px-2 py-1.5 text-[#edecea]"
          >
            {AUM_BANDS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>

          <div className="type-label mt-5 text-[#a5a29b]">Verification tier</div>
          {(["verified", "register", "monitored"] as const).map((t) => (
            <label key={t} className="mt-1.5 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={tiers.has(t)}
                onChange={() => toggle(tiers, t, setTiers)}
                className="accent-[#7aa7cd]"
              />
              <span className="type-mono">{t.toUpperCase()}</span>
            </label>
          ))}

          <div className="type-mono mt-6 text-[#716e67]">
            {filtered.length} PINS IN VIEWPORT SET
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRailOpen((v) => !v)}
          className="type-mono h-min cursor-pointer border border-l-0 border-[#383838] bg-[#181817] px-1.5 py-2 text-[#a5a29b] hover:text-[#edecea]"
          aria-label={railOpen ? "Collapse filter rail" : "Expand filter rail"}
        >
          {railOpen ? "◀" : "▶"}
        </button>
      </motion.div>

      {selected !== null ? (
        <div className="v2-root absolute inset-y-0 right-0 z-20 w-full max-w-[380px]" data-v2-theme="dark">
          <EntitySlideOut entity={selected} onClose={() => setSelected(null)} />
        </div>
      ) : null}
    </div>
  );
}
