"use client";

import { useState, type ReactNode } from "react";
import { MOCK_ENTITY_BY_SLUG, buildMockEdges } from "@continuum/shared";
import { fmtEuroM } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * Inline entity reference with a hover-card: AUM-style stats, register
 * badge, relationship-edge count. Used by @mentions in threads, tear-sheet
 * related entities, and feed kickers. Mock-backed; cutover swaps the lookup
 * for the entities API.
 */

let edgeCountCache: Map<string, number> | null = null;
function edgeCount(entityId: string): number {
  if (edgeCountCache === null) {
    edgeCountCache = new Map();
    for (const e of buildMockEdges()) {
      edgeCountCache.set(e.sourceId, (edgeCountCache.get(e.sourceId) ?? 0) + 1);
      edgeCountCache.set(e.targetId, (edgeCountCache.get(e.targetId) ?? 0) + 1);
    }
  }
  return edgeCountCache.get(entityId) ?? 0;
}

const TIER_LABEL: Record<string, string> = {
  verified: "GLEIF VERIFIED",
  register: "REGISTER-LINKED",
  monitored: "MONITORED",
};

export function EntityHoverCard({
  slug,
  name,
  children,
}: {
  slug?: string;
  /** Fallback lookup by exact name when no slug is at hand (@mentions). */
  name?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const entity =
    (slug !== undefined ? MOCK_ENTITY_BY_SLUG.get(slug) : undefined) ??
    (name !== undefined
      ? [...MOCK_ENTITY_BY_SLUG.values()].find((e) => e.name === name)
      : undefined);

  if (entity === undefined) {
    return <span className="text-ink">{children ?? name ?? slug}</span>;
  }
  const cls = v2ClassFor(entity.assetClass);
  const accent = v2Accent(entity.assetClass, entity.strategySlug || null);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        className="cursor-pointer border-b border-dotted border-line-strong text-ink transition-colors hover:border-ink"
      >
        {children ?? entity.name}
      </span>
      {open ? (
        <span className={`absolute left-0 top-full z-50 mt-1 block w-[280px] border border-line-strong bg-popover p-3 ${accent?.top ?? ""}`}>
          <span className="flex items-baseline justify-between gap-2">
            <span className="type-h3 block">{entity.name}</span>
            <span className="type-mono shrink-0 text-ink-muted">{entity.country}</span>
          </span>
          <span className="type-small mt-0.5 block text-ink-secondary">
            {entity.city} · {entity.strategy}
          </span>
          {cls !== null ? (
            <span className={`type-label mt-2 inline-block px-1.5 py-0.5 ${cls.accent.chip}`}>
              {cls.label}
            </span>
          ) : null}
          <span className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
            <span className="type-label">AUM</span>
            <span className="type-data">{fmtEuroM(entity.aumM)}</span>
          </span>
          <span className="mt-1 flex items-baseline justify-between">
            <span className="type-label">Edges</span>
            <span className="type-data">{edgeCount(entity.id)}</span>
          </span>
          <span className="type-mono mt-2 block text-ink-muted">{TIER_LABEL[entity.tier]}</span>
        </span>
      ) : null}
    </span>
  );
}
