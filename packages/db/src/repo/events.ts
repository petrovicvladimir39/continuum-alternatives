import { and, asc, eq, sql } from "drizzle-orm";
import { assetClassBySlug, CLASS_LEVEL, normalizeAlias, slugify } from "@continuum/shared";
import { db } from "../client";
import { entities, entityClassifications, events } from "../schema";

/**
 * Events data layer (Phase 31). Events are ENTITIES (kind 'event') with an
 * events detail row — they ride every existing rail: review queue,
 * discussion anchors, watchlists, sitemap. Imported events land PROPOSED
 * (entity status 'provisional') and render nowhere public until the
 * operator approves; --approve is the registry-precedent operator flag.
 */

export type EventImportRow = {
  name: string;
  startsOn: string; // YYYY-MM-DD
  endsOn: string | null;
  city: string | null;
  country: string | null; // ISO-2
  format: "in_person" | "online" | "hybrid";
  venue: string | null;
  url: string;
  /** Asset-class slugs (class-level classifications). */
  classes: string[];
  /** True when dates are the expected annual pattern, not a confirmed listing. */
  expected: boolean;
};

export type EventImportResult =
  | { outcome: "created"; entityId: string; slug: string }
  | { outcome: "duplicate"; slug: string }
  | { outcome: "invalid"; reason: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shared import path: CSV CLI and site harvesters both land here. */
export async function importEvent(
  row: EventImportRow,
  opts: { approve?: boolean; source?: string } = {},
): Promise<EventImportResult> {
  if (row.name.trim() === "" || !DATE_RE.test(row.startsOn)) {
    return { outcome: "invalid", reason: `name/starts_on invalid (${row.name || "?"})` };
  }
  if (row.endsOn !== null && !DATE_RE.test(row.endsOn)) {
    return { outcome: "invalid", reason: `ends_on invalid (${row.name})` };
  }
  if (!/^https?:\/\//.test(row.url)) {
    return { outcome: "invalid", reason: `official URL required (${row.name})` };
  }
  const badClass = row.classes.find((slug) => assetClassBySlug(slug) === null);
  if (badClass !== undefined) {
    return { outcome: "invalid", reason: `unknown asset class "${badClass}" (${row.name})` };
  }

  // Slug carries the edition year — annual series get one entity per edition.
  const year = row.startsOn.slice(0, 4);
  const base = slugify(row.name);
  const slug = base.endsWith(year) ? base : `${base}-${year}`;
  const clash = await db.select({ id: entities.id }).from(entities).where(eq(entities.slug, slug));
  if (clash.length > 0) {
    return { outcome: "duplicate", slug };
  }

  const inserted = await db
    .insert(entities)
    .values({
      kind: "event",
      name: row.name.trim(),
      slug,
      country: row.country,
      status: opts.approve === true ? "active" : "provisional",
    })
    .returning({ id: entities.id });
  const entityId = inserted[0]!.id;
  await db.insert(events).values({
    entityId,
    eventFormat: row.format,
    startsAt: new Date(`${row.startsOn}T00:00:00Z`),
    endsAt: new Date(`${row.endsOn ?? row.startsOn}T00:00:00Z`),
    venue: row.venue,
    city: row.city,
    eventUrl: row.url,
    expected: row.expected,
  });
  for (const assetClass of [...new Set(row.classes)]) {
    await db.insert(entityClassifications).values({
      entityId,
      assetClass,
      strategy: CLASS_LEVEL,
      source: opts.source ?? "operator",
      status: opts.approve === true ? "approved" : "proposed",
    });
  }
  return { outcome: "created", entityId, slug };
}

export type EventListItem = {
  entityId: string;
  slug: string;
  name: string;
  country: string | null;
  city: string | null;
  venue: string | null;
  format: string;
  url: string | null;
  startsOn: string;
  endsOn: string;
  expected: boolean;
  classes: string[];
};

function mapEventRow(row: Record<string, unknown>): EventListItem {
  return {
    entityId: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    country: row.country === null ? null : String(row.country),
    city: row.city === null ? null : String(row.city),
    venue: row.venue === null ? null : String(row.venue),
    format: String(row.event_format),
    url: row.event_url === null ? null : String(row.event_url),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    expected: row.expected === true,
    classes: (row.classes as string[] | null) ?? [],
  };
}

const EVENT_SELECT = sql`
  SELECT e.id, e.slug, e.name, e.country, ev.city, ev.venue, ev.event_format,
         ev.event_url, ev.expected,
         to_char(ev.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS starts_on,
         to_char(ev.ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS ends_on,
         coalesce((SELECT array_agg(DISTINCT c.asset_class) FROM entity_classifications c
                     WHERE c.entity_id = e.id AND c.status = 'approved'), '{}') AS classes
  FROM entities e
  JOIN events ev ON ev.entity_id = e.id
  WHERE e.kind = 'event' AND e.status = 'active'
`;

export type EventFilters = {
  /** YYYY-MM */
  month?: string;
  country?: string;
  format?: string;
  assetClass?: string;
};

function filterSql(filters: EventFilters) {
  return sql`
    AND (${filters.month ?? null}::text IS NULL
           OR to_char(ev.starts_at AT TIME ZONE 'UTC', 'YYYY-MM') = ${filters.month ?? null})
    AND (${filters.country ?? null}::text IS NULL OR e.country = ${filters.country ?? null})
    AND (${filters.format ?? null}::text IS NULL OR ev.event_format::text = ${filters.format ?? null})
    AND (${filters.assetClass ?? null}::text IS NULL OR EXISTS
           (SELECT 1 FROM entity_classifications c WHERE c.entity_id = e.id
              AND c.status = 'approved' AND c.asset_class = ${filters.assetClass ?? null}))
  `;
}

/** Upcoming = not yet ENDED (a running conference is still upcoming-relevant). */
export async function listUpcomingEvents(filters: EventFilters = {}): Promise<EventListItem[]> {
  const result = await db.execute(sql`
    ${EVENT_SELECT} AND ev.ends_at >= date_trunc('day', now()) ${filterSql(filters)}
    ORDER BY ev.starts_at ASC, e.name ASC
  `);
  return result.rows.map(mapEventRow);
}

export async function listPastEvents(filters: EventFilters = {}): Promise<EventListItem[]> {
  const result = await db.execute(sql`
    ${EVENT_SELECT} AND ev.ends_at < date_trunc('day', now()) ${filterSql(filters)}
    ORDER BY ev.starts_at DESC, e.name ASC
  `);
  return result.rows.map(mapEventRow);
}

export async function eventBySlug(slug: string): Promise<EventListItem | null> {
  const result = await db.execute(sql`
    SELECT * FROM (${EVENT_SELECT}) sub WHERE sub.slug = ${slug}
  `);
  const row = result.rows[0];
  return row === undefined ? null : mapEventRow(row);
}

/** Filter options actually present among approved events. */
export async function eventFilterOptions(): Promise<{
  months: string[];
  countries: string[];
  classes: string[];
}> {
  // array_agg(DISTINCT x ORDER BY x): with DISTINCT, Postgres requires the
  // ORDER BY expression to BE the aggregated expression — never positional.
  const result = await db.execute(sql`
    SELECT
      (SELECT array_agg(DISTINCT month ORDER BY month) FROM
        (SELECT to_char(ev.starts_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month
          FROM entities e JOIN events ev ON ev.entity_id = e.id
          WHERE e.kind = 'event' AND e.status = 'active') m) AS months,
      (SELECT array_agg(DISTINCT e.country ORDER BY e.country)
        FROM entities e JOIN events ev ON ev.entity_id = e.id
        WHERE e.kind = 'event' AND e.status = 'active' AND e.country IS NOT NULL) AS countries,
      (SELECT array_agg(DISTINCT c.asset_class ORDER BY c.asset_class)
        FROM entities e JOIN entity_classifications c ON c.entity_id = e.id AND c.status = 'approved'
        WHERE e.kind = 'event' AND e.status = 'active') AS classes
  `);
  const row = result.rows[0] ?? {};
  return {
    months: (row.months as string[] | null) ?? [],
    countries: (row.countries as string[] | null) ?? [],
    classes: (row.classes as string[] | null) ?? [],
  };
}

/** Review queue: proposed (provisional) imported events. */
export async function listProvisionalEvents(): Promise<EventListItem[]> {
  const result = await db.execute(sql`
    SELECT e.id, e.slug, e.name, e.country, ev.city, ev.venue, ev.event_format,
           ev.event_url, ev.expected,
           to_char(ev.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS starts_on,
           to_char(ev.ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS ends_on,
           coalesce((SELECT array_agg(DISTINCT c.asset_class) FROM entity_classifications c
                       WHERE c.entity_id = e.id), '{}') AS classes
    FROM entities e
    JOIN events ev ON ev.entity_id = e.id
    WHERE e.kind = 'event' AND e.status = 'provisional'
    ORDER BY ev.starts_at ASC
  `);
  return result.rows.map(mapEventRow);
}

/** Approve: entity live + its class rows approved. */
export async function approveEvent(entityId: string): Promise<void> {
  await db.update(entities).set({ status: "active" }).where(eq(entities.id, entityId));
  await db
    .update(entityClassifications)
    .set({ status: "approved" })
    .where(
      and(eq(entityClassifications.entityId, entityId), eq(entityClassifications.status, "proposed")),
    );
}

/** Reject: a provisional import vanishes entirely (it never published). */
export async function rejectEvent(entityId: string): Promise<void> {
  const rows = await db
    .select({ status: entities.status, kind: entities.kind })
    .from(entities)
    .where(eq(entities.id, entityId));
  if (rows[0]?.status !== "provisional" || rows[0]?.kind !== "event") {
    return; // only provisional events are deletable through this path
  }
  await db.delete(entityClassifications).where(eq(entityClassifications.entityId, entityId));
  await db.delete(events).where(eq(events.entityId, entityId));
  await db.delete(entities).where(eq(entities.id, entityId));
}

/**
 * iCal feed rows (Phase 31B): approved upcoming events. UID is the entity
 * id — stable across edits, so subscribers' calendars update in place.
 */
export async function icalEvents(): Promise<EventListItem[]> {
  return listUpcomingEvents();
}

/** Homepage bottom band: next 3 approved events; empty hides the band. */
export async function upcomingEventsForHome(limit = 3): Promise<EventListItem[]> {
  const rows = await listUpcomingEvents();
  return rows.slice(0, limit);
}

/**
 * Meeting prep (Phase 31D): resolve a member's STATED organization text to
 * a corpus entity — deterministic name/alias equality only, no fuzzy
 * guessing. Null = honest "no record on Continuum". Organizations only:
 * briefs are never about people.
 */
export async function resolveOrganizationByName(
  name: string,
): Promise<{ id: string; slug: string; name: string } | null> {
  const trimmed = name.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = normalizeAlias(trimmed);
  const result = await db.execute(sql`
    SELECT e.id, e.slug, e.name FROM entities e
    LEFT JOIN aliases a ON a.entity_id = e.id
    WHERE e.kind = 'organization' AND e.status = 'active'
      AND (lower(e.name) = lower(${trimmed}) OR a.alias_normalized = ${normalized})
    ORDER BY e.name LIMIT 1
  `);
  const row = result.rows[0];
  return row === undefined
    ? null
    : { id: String(row.id), slug: String(row.slug), name: String(row.name) };
}

/** Ordered event-detail rows keyed for sorting (verify + boundary tests). */
export async function eventStartsOn(entityId: string): Promise<string | null> {
  const rows = await db
    .select({ startsAt: events.startsAt })
    .from(events)
    .where(eq(events.entityId, entityId))
    .orderBy(asc(events.startsAt));
  return rows[0]?.startsAt?.toISOString().slice(0, 10) ?? null;
}
