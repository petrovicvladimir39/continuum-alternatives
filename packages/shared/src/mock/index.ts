import { MOCK_ENTITY_BY_ID } from "./entities";
import { buildMockFacts, type MockFact, type MockFactType } from "./facts";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING. Central switch + adapters.
 *
 * MOCK_MODE turns data-access functions in @continuum/db into fixture
 * returns so surfaces can be designed AS IF the platform were fully
 * populated. Two ways in:
 *   1. env  NEXT_PUBLIC_MOCK_MODE=true   (whole app, one flag)
 *   2. ?mock=1 on pages that forward it  (per-page preview)
 * The switch lives at the REPO/QUERY layer — pages call the same functions
 * either way, so flipping back to real data is one env change, zero page
 * edits. Mock rows are never written to the database and never render when
 * the flag is off. See README "Design/Build with mock data".
 */

export * from "./entities";
export * from "./facts";
export * from "./graph";
export * from "./extras";

export function mockModeEnabled(override?: boolean): boolean {
  if (override === true) {
    return true;
  }
  // @continuum/shared is environment-agnostic (no node types) — reach for
  // process.env through globalThis where it exists (server / Next inlining).
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env?.NEXT_PUBLIC_MOCK_MODE === "true";
}

// ── Feed adapter (shape mirrors @continuum/db FeedItem/FeedPage) ────────────

export type MockFeedItem = {
  id: string;
  occurredOn: string;
  recordedAt: string;
  title: string;
  factType: string;
  channels: string[];
  contextLine: string | null;
  entityName: string;
  entitySlug: string;
  entityKind: "organization" | "fund_vehicle" | "deal" | "person" | "event";
  entityCountry: string | null;
  entityCity: string | null;
  entityAssetClass: string | null;
  entityHref: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
};

let cachedFacts: MockFact[] | null = null;
let cachedAt = 0;

/** Facts regenerate at most once a minute so "Nh ago" stays honest-fresh. */
function factsNow(): MockFact[] {
  const now = Date.now();
  if (cachedFacts === null || now - cachedAt > 60_000) {
    cachedFacts = buildMockFacts(new Date(now));
    cachedAt = now;
  }
  return cachedFacts;
}

export function mockFeedPage(opts: {
  factTypes?: string[];
  channel?: string;
  country?: string;
  page?: number;
  pageSize?: number;
}): {
  items: MockFeedItem[];
  total: number;
  page: number;
  pageCount: number;
  updatedAt: string;
} {
  const pageSize = opts.pageSize ?? 25;
  const page = Math.max(1, opts.page ?? 1);
  let facts = factsNow();
  if (opts.factTypes !== undefined && opts.factTypes.length > 0) {
    const wanted = new Set(opts.factTypes as MockFactType[]);
    facts = facts.filter((f) => wanted.has(f.factType));
  }
  if (opts.channel) {
    facts = facts.filter((f) => f.channels.includes(opts.channel!));
  }
  if (opts.country) {
    facts = facts.filter((f) => MOCK_ENTITY_BY_ID.get(f.entityId)?.country === opts.country);
  }
  const total = facts.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const items = facts.slice((page - 1) * pageSize, page * pageSize).map((f): MockFeedItem => {
    const e = MOCK_ENTITY_BY_ID.get(f.entityId)!;
    return {
      id: f.id,
      occurredOn: f.occurredOn,
      recordedAt: f.recordedAt,
      title: f.title,
      factType: f.factType,
      channels: f.channels,
      contextLine: f.contextLine,
      entityName: e.name,
      entitySlug: e.slug,
      entityKind: e.kind,
      entityCountry: e.country,
      entityCity: e.city,
      entityAssetClass: e.assetClass,
      // Mock entities have no real profile pages — cards link nowhere rather
      // than 404 (design scaffolding, honest even in preview).
      entityHref: null,
      sourceName: f.sourceName,
      sourceUrl: f.sourceUrl,
    };
  });
  const updatedAt = facts[0]?.recordedAt ?? new Date().toISOString();
  return { items, total, page, pageCount, updatedAt };
}
