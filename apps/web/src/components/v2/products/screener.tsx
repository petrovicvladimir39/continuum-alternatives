"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  buildMockEdges,
  mockFacts,
  MOCK_COUNTRIES,
  MOCK_ENTITIES,
  MOCK_ENTITY_BY_ID,
  type MockEntity,
} from "@continuum/shared";
import { fmtEuroM, fmtInt } from "@/lib/v2/format";
import { TOTAL_ENTITIES } from "@/lib/v2/coverage";
import { V2_CLASSES, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * P5 — Company Intelligence screener. Dense sortable table over the mock
 * set (the production corpus is 30,500 — the header says so honestly);
 * GLEIF-style tier badges, class filters, a filter drawer, expandable
 * ownership/relationship trees per row, and saved queries in localStorage.
 * Cutover swaps MOCK_ENTITIES for the entities API + real saved queries.
 */

type SortKey = "name" | "aum" | "signals" | "country";
type SavedQuery = { name: string; q: string; classSlug: string; role: string; country: string; tier: string };

const ROLES = ["all", "gp", "fund", "lp", "lender", "servicer", "advisor", "company", "regulator"] as const;
const TIER_BADGE: Record<string, string> = {
  verified: "GLEIF ✓",
  register: "REGISTER",
  monitored: "MONITORED",
};

function signalsCount(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of mockFacts()) {
    counts.set(f.entityId, (counts.get(f.entityId) ?? 0) + 1);
  }
  return counts;
}

function OwnershipTree({ entity }: { entity: MockEntity }) {
  const edges = useMemo(
    () => buildMockEdges().filter((e) => e.sourceId === entity.id || e.targetId === entity.id),
    [entity],
  );
  const outbound = edges.filter((e) => e.sourceId === entity.id);
  const inbound = edges.filter((e) => e.targetId === entity.id);
  const row = (id: string, type: string, dir: "→" | "←") => {
    const other = MOCK_ENTITY_BY_ID.get(id);
    if (other === undefined) {
      return null;
    }
    const cls = v2ClassFor(other.assetClass);
    return (
      <div key={`${dir}${id}${type}`} className="flex items-baseline gap-2 py-1">
        <span className="type-mono text-ink-muted">{dir}</span>
        <span className="type-mono w-[110px] shrink-0 text-ink-muted">{type.replace(/_/g, " ").toUpperCase()}</span>
        <span className="type-small min-w-0 truncate">{other.name}</span>
        {cls !== null ? <span className={`type-label ml-auto shrink-0 ${cls.accent.text}`}>{cls.code}</span> : null}
      </div>
    );
  };
  return (
    <div className="border-t border-dashed border-line bg-muted/30 px-10 py-2">
      {edges.length === 0 ? (
        <div className="type-mono py-1 text-ink-muted">[ 0 EDGES RECORDED ]</div>
      ) : (
        <>
          {outbound.map((e) => row(e.targetId, e.edgeType, "→"))}
          {inbound.map((e) => row(e.sourceId, e.edgeType, "←"))}
        </>
      )}
    </div>
  );
}

export function Screener() {
  const params = useSearchParams();
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [classSlug, setClassSlug] = useState(() => params.get("class") ?? "all");
  const [role, setRole] = useState("all");
  const [country, setCountry] = useState("all");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "aum", dir: -1 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQuery[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(window.localStorage.getItem("v2-saved-queries") ?? "[]") as SavedQuery[]);
    } catch {
      setSaved([]);
    }
  }, []);

  const signals = useMemo(() => signalsCount(), []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = MOCK_ENTITIES.filter((e) => {
      if (classSlug !== "all" && e.assetClass !== classSlug) return false;
      if (role !== "all" && e.role !== role) return false;
      if (country !== "all" && e.country !== country) return false;
      if (tier !== "all" && e.tier !== tier) return false;
      if (needle !== "" && !`${e.name} ${e.city} ${e.strategy}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const dir = sort.dir;
    return filtered.sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "country":
          return a.country.localeCompare(b.country) * dir;
        case "signals":
          return ((signals.get(a.id) ?? 0) - (signals.get(b.id) ?? 0)) * dir;
        default:
          return ((a.aumM ?? -1) - (b.aumM ?? -1)) * dir;
      }
    });
  }, [q, classSlug, role, country, tier, sort, signals]);

  const saveQuery = () => {
    const name = `${classSlug !== "all" ? classSlug : "all"} · ${q || "no text"} (${rows.length})`;
    const next = [...saved, { name, q, classSlug, role, country, tier }].slice(-8);
    setSaved(next);
    try {
      window.localStorage.setItem("v2-saved-queries", JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  };

  const applyQuery = (s: SavedQuery) => {
    setQ(s.q);
    setClassSlug(s.classSlug);
    setRole(s.role);
    setCountry(s.country);
    setTier(s.tier);
  };

  const th = (label: string, key: SortKey, right = false) => (
    <th
      className={`type-label cursor-pointer px-3 py-2 font-medium transition-colors hover:text-ink ${right ? "text-right" : "text-left"}`}
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }))}
    >
      {label}
      {sort.key === key ? <span className="ml-1">{sort.dir === -1 ? "↓" : "↑"}</span> : null}
    </th>
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="type-label">Products</div>
          <h1 className="type-h1 mt-1">Company Intelligence</h1>
          <p className="type-small mt-1 text-ink-secondary">
            {fmtInt(TOTAL_ENTITIES)} entities in the production corpus · this prototype screens the{" "}
            {MOCK_ENTITIES.length}-entity mock set.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="type-label flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
          >
            <SlidersHorizontal size={13} strokeWidth={1.5} /> Filters
          </button>
          <button
            type="button"
            onClick={saveQuery}
            className="type-label cursor-pointer border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
          >
            Save query
          </button>
        </div>
      </div>

      {/* Class chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setClassSlug("all")}
          className={`type-label cursor-pointer px-2 py-0.5 ${classSlug === "all" ? "border border-ink text-ink" : "border border-line text-ink-secondary hover:border-line-strong"}`}
        >
          All classes
        </button>
        {V2_CLASSES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setClassSlug(classSlug === c.slug ? "all" : c.slug)}
            className={`type-label cursor-pointer px-2 py-0.5 transition-colors ${classSlug === c.slug ? c.accent.chip : "border border-line text-ink-secondary hover:border-line-strong"}`}
          >
            {c.code}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, city, strategy…"
          className="type-small ml-auto w-[240px] border border-line bg-surface px-2 py-1 outline-none placeholder:text-ink-muted focus:border-line-strong"
        />
      </div>

      {/* Filter drawer */}
      {drawerOpen ? (
        <div className="mt-3 flex flex-wrap gap-4 border border-line bg-surface p-3">
          <label className="type-small flex items-center gap-2">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)} className="border border-line bg-surface px-2 py-1">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="type-small flex items-center gap-2">
            Country
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="border border-line bg-surface px-2 py-1">
              <option value="all">all</option>
              {MOCK_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="type-small flex items-center gap-2">
            Tier
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="border border-line bg-surface px-2 py-1">
              {["all", "verified", "register", "monitored"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {saved.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-label">Saved:</span>
              {saved.map((s, i) => (
                <button key={i} type="button" onClick={() => applyQuery(s)} className="type-label cursor-pointer border border-dashed border-line-strong px-2 py-0.5 text-ink-secondary hover:text-ink">
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full border-collapse">
          <thead className="sticky top-10 z-10 bg-surface">
            <tr className="border-b border-line-strong">
              <th className="w-8" />
              {th("Entity", "name")}
              <th className="type-label px-3 py-2 text-left font-medium">Class</th>
              <th className="type-label px-3 py-2 text-left font-medium">Strategy</th>
              {th("Country", "country")}
              {th("AUM", "aum", true)}
              {th("Signals", "signals", true)}
              <th className="type-label px-3 py-2 text-right font-medium">Tier</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="terminal-empty m-3">[ 0 MATCHING ENTITIES IN QUERY — CLEAR FILTERS TO RESET ]</div>
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const cls = v2ClassFor(e.assetClass);
                const isOpen = expanded === e.id;
                return (
                  <FragmentRow
                    key={e.id}
                    entity={e}
                    cls={cls}
                    signals={signals.get(e.id) ?? 0}
                    open={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : e.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="type-mono mt-2 text-ink-muted">
        {rows.length} ROWS · CLICK A ROW TO EXPAND ITS OWNERSHIP / RELATIONSHIP TREE
      </div>
    </div>
  );
}

function FragmentRow({
  entity,
  cls,
  signals,
  open,
  onToggle,
}: {
  entity: MockEntity;
  cls: ReturnType<typeof v2ClassFor>;
  signals: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-line transition-colors hover:bg-muted/50 ${cls?.accent.left ?? ""}`}
      >
        <td className="px-2 text-ink-muted">
          {open ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronRight size={13} strokeWidth={1.5} />}
        </td>
        <td className="px-3 py-2">
          <span className="type-body block">{entity.name}</span>
          <span className="type-small text-ink-muted">{entity.city}</span>
        </td>
        <td className="px-3 py-2">
          {cls !== null ? <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>{cls.code}</span> : null}
        </td>
        <td className="type-small px-3 py-2 text-ink-secondary">{entity.strategy}</td>
        <td className="type-data px-3 py-2">{entity.country}</td>
        <td className="type-data px-3 py-2 text-right">{fmtEuroM(entity.aumM)}</td>
        <td className="type-data px-3 py-2 text-right">{signals}</td>
        <td className="type-mono px-3 py-2 text-right text-ink-muted">{TIER_BADGE[entity.tier]}</td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={8} className="p-0">
            <OwnershipTree entity={entity} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
