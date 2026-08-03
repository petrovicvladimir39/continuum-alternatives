"use client";

import { EUROPE_COUNTRIES, EUROPE_COUNTRY_NAMES } from "@continuum/shared";
import type { PinFilters } from "./logo-map-data";

/**
 * Filter rail — taxonomy class, entity kind, country, verification tier.
 * Pure state → the map rebuilds its in-memory GeoJSON; nothing refetches.
 */

const CLASSES: [string, string][] = [
  ["private-equity", "Private equity"],
  ["private-credit", "Private credit"],
  ["real-assets", "Real assets"],
  ["hedge-funds", "Hedge funds"],
  ["structured", "Structured"],
  ["esoteric", "Esoteric"],
  ["collectibles", "Collectibles"],
  ["climate", "Climate"],
  ["digital", "Digital"],
];

const TIERS = ["verified", "register", "monitored"] as const;
const KINDS: [string, string][] = [
  ["organization", "Organizations"],
  ["fund_vehicle", "Fund vehicles"],
  ["deal", "Deals"],
];

function toggle(set: Set<string> | null, value: string, universe: number): Set<string> | null {
  const next = new Set(set ?? []);
  if (set === null) {
    // null = all selected → clicking narrows to everything EXCEPT nothing;
    // start from the full universe minus the clicked value is confusing, so
    // null → {value} (solo-select) reads better in practice.
    return new Set([value]);
  }
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  if (next.size === 0 || next.size === universe) {
    return null;
  }
  return next;
}

export function FilterRail({
  filters,
  onChange,
}: {
  filters: PinFilters;
  onChange: (f: PinFilters) => void;
}) {
  return (
    <aside className="absolute left-2 top-2 z-10 flex max-h-[calc(100%-16px)] w-[210px] flex-col gap-3 overflow-y-auto border border-line bg-ground/95 p-3">
      <div>
        <p className="type-label mb-1.5">Asset class</p>
        <div className="flex flex-col gap-0.5">
          {CLASSES.map(([slug, label]) => {
            const active = filters.classes === null || filters.classes.has(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() =>
                  onChange({ ...filters, classes: toggle(filters.classes, slug, CLASSES.length) })
                }
                className={`text-left text-[12px] leading-[1.6] transition-colors ${active ? "text-ink" : "text-ink-muted line-through"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="type-label mb-1.5">Kind</p>
        {KINDS.map(([slug, label]) => {
          const active = filters.kinds === null || filters.kinds.has(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onChange({ ...filters, kinds: toggle(filters.kinds, slug, KINDS.length) })}
              className={`block text-left text-[12px] leading-[1.6] ${active ? "text-ink" : "text-ink-muted line-through"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div>
        <p className="type-label mb-1.5">Tier</p>
        {TIERS.map((tier) => {
          const active = filters.tiers === null || filters.tiers.has(tier);
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, tier, TIERS.length) })}
              className={`block text-left text-[12px] capitalize leading-[1.6] ${active ? "text-ink" : "text-ink-muted line-through"}`}
            >
              {tier}
            </button>
          );
        })}
      </div>
      <div>
        <p className="type-label mb-1.5">Country</p>
        <select
          value={filters.country ?? ""}
          onChange={(e) =>
            onChange({ ...filters, country: e.target.value === "" ? null : e.target.value })
          }
          className="w-full border border-line bg-surface px-1.5 py-1 text-[12px] text-ink"
        >
          <option value="">All countries</option>
          {EUROPE_COUNTRIES.map((code) => (
            <option key={code} value={code}>
              {EUROPE_COUNTRY_NAMES[code] ?? code}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
