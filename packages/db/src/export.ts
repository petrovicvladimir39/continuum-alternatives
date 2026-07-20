import { sql } from "drizzle-orm";
import { db } from "./client";
import { listAskFeed } from "./repo/ask";

/**
 * CSV export layer (reset build Part 5) — "everything structured before AI".
 * Shared by the CLI (pnpm export:*, writes /exports/*.csv) and the
 * /admin/universe download buttons (streams the same CSV). Pure SELECTs,
 * deterministic ordering, no LLM anywhere. Callers add the UTF-8 BOM.
 */

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

export type EntitiesExportFilter = {
  country?: string;
  tag?: string;
  kind?: string;
  status?: string;
  /** Taxonomy strategy or asset-class slug (approved classifications) — Phase 29B. */
  strategy?: string;
};

export async function exportEntitiesCsv(filter: EntitiesExportFilter = {}): Promise<string> {
  const result = await db.execute(sql`
    SELECT e.slug, e.kind, e.name, e.country, e.status,
           o.hq_city, o.website, o.registry_id,
           coalesce((SELECT string_agg(t.tag, ';' ORDER BY t.tag)
                       FROM entity_tags t WHERE t.entity_id = e.id), '') AS tags,
           coalesce(e.summary, '') AS summary,
           to_char(e.created_at, 'YYYY-MM-DD') AS created_on
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    WHERE (${filter.country ?? null}::text IS NULL OR e.country = ${filter.country ?? null})
      AND (${filter.kind ?? null}::text IS NULL OR e.kind::text = ${filter.kind ?? null})
      AND (${filter.status ?? null}::text IS NULL OR e.status = ${filter.status ?? null})
      AND (${filter.tag ?? null}::text IS NULL OR EXISTS
             (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = ${filter.tag ?? null}))
      AND (${filter.strategy ?? null}::text IS NULL OR EXISTS
             (SELECT 1 FROM entity_classifications c
               WHERE c.entity_id = e.id AND c.status = 'approved'
                 AND (c.strategy = ${filter.strategy ?? null} OR c.asset_class = ${filter.strategy ?? null})))
    ORDER BY e.country NULLS LAST, e.name
  `);
  return toCsv(
    ["slug", "kind", "name", "country", "status", "city", "website", "registry_id", "tags", "summary", "created_on"],
    result.rows.map((r) => [
      r.slug, r.kind, r.name, r.country, r.status, r.hq_city, r.website, r.registry_id, r.tags, r.summary, r.created_on,
    ]),
  );
}

export async function exportEdgesCsv(): Promise<string> {
  const result = await db.execute(sql`
    SELECT ed.edge_type, s.slug AS source_slug, s.name AS source_name,
           t.slug AS target_slug, t.name AS target_name,
           ed.status, coalesce(ed.role, '') AS role,
           coalesce(ed.amount::text, '') AS amount, coalesce(ed.currency, '') AS currency,
           ed.confidence, coalesce(ed.started_on::text, '') AS started_on,
           to_char(ed.created_at, 'YYYY-MM-DD') AS created_on
    FROM edges ed
    JOIN entities s ON s.id = ed.source_entity_id
    JOIN entities t ON t.id = ed.target_entity_id
    ORDER BY ed.created_at DESC NULLS LAST, ed.edge_type
  `);
  return toCsv(
    ["edge_type", "source_slug", "source_name", "target_slug", "target_name", "status", "role", "amount", "currency", "confidence", "started_on", "created_on"],
    result.rows.map((r) => [
      r.edge_type, r.source_slug, r.source_name, r.target_slug, r.target_name, r.status, r.role, r.amount, r.currency, r.confidence, r.started_on, r.created_on,
    ]),
  );
}

export type FactsExportFilter = { channel?: string; since?: string };

export async function exportFactsCsv(filter: FactsExportFilter = {}): Promise<string> {
  const result = await db.execute(sql`
    SELECT e.slug AS entity_slug, e.name AS entity_name, f.fact_type,
           f.occurred_on, to_char(f.recorded_at, 'YYYY-MM-DD') AS recorded_on,
           f.title, array_to_string(coalesce(f.audience_channels, '{}'), ';') AS channels,
           f.confidence, f.status,
           coalesce(f.source_document_id::text, '') AS source_document_id
    FROM timeline_facts f
    JOIN entities e ON e.id = f.entity_id
    WHERE (${filter.channel ?? null}::text IS NULL
             OR ${filter.channel ?? null} = ANY(coalesce(f.audience_channels, '{}')))
      AND (${filter.since ?? null}::date IS NULL OR f.occurred_on >= ${filter.since ?? null}::date)
    ORDER BY f.occurred_on DESC, f.recorded_at DESC
  `);
  return toCsv(
    ["entity_slug", "entity_name", "fact_type", "occurred_on", "recorded_on", "title", "channels", "confidence", "status", "source_document_id"],
    result.rows.map((r) => [
      r.entity_slug, r.entity_name, r.fact_type, r.occurred_on, r.recorded_on, r.title, r.channels, r.confidence, r.status, r.source_document_id,
    ]),
  );
}

/** Saved-view export cap — stated in the download, never silent. */
export const VIEW_EXPORT_MAX_ROWS = 5000;

/**
 * Member CSV export of a saved ask view (Phase 29B): the view's stored
 * filters replayed through the SAME feed query the News front uses, rows
 * capped at VIEW_EXPORT_MAX_ROWS (most recent first).
 */
export async function exportViewFactsCsv(filters: {
  channels?: string[];
  countries?: string[];
  factTypes?: string[];
  strategies?: string[];
  assetClasses?: string[];
  entityQuery?: string;
}): Promise<{ csv: string; rows: number; total: number }> {
  const feed = await listAskFeed({ ...filters, limit: VIEW_EXPORT_MAX_ROWS });
  const csv = toCsv(
    ["occurred_on", "title", "fact_type", "entity_name", "entity_slug", "country", "channels", "source_name", "source_url"],
    feed.items.map((item) => [
      item.occurredOn, item.title, item.factType, item.entityName, item.entitySlug,
      item.entityCountry, (item.channels ?? []).join(";"), item.sourceName, item.sourceUrl,
    ]),
  );
  return { csv, rows: feed.items.length, total: feed.total };
}

export type DocumentsExportFilter = { source?: string; since?: string };

export async function exportDocumentsCsv(filter: DocumentsExportFilter = {}): Promise<string> {
  const result = await db.execute(sql`
    SELECT d.id, coalesce(s.name, '') AS source_name, coalesce(d.url, '') AS url,
           coalesce(d.title, '') AS title, coalesce(d.language, '') AS language,
           coalesce(d.doc_type, '') AS doc_type,
           to_char(d.fetched_at, 'YYYY-MM-DD') AS fetched_on,
           length(coalesce(d.content_text, '')) AS text_chars,
           left(coalesce(d.content_text, ''), 500) AS excerpt
    FROM documents d
    LEFT JOIN sources s ON s.id = d.source_id
    WHERE (${filter.source ?? null}::text IS NULL OR s.name ILIKE '%' || ${filter.source ?? null} || '%')
      AND (${filter.since ?? null}::date IS NULL OR d.fetched_at >= ${filter.since ?? null}::date)
    ORDER BY d.fetched_at DESC NULLS LAST
  `);
  return toCsv(
    ["id", "source_name", "url", "title", "language", "doc_type", "fetched_on", "text_chars", "excerpt"],
    result.rows.map((r) => [
      r.id, r.source_name, r.url, r.title, r.language, r.doc_type, r.fetched_on, r.text_chars, r.excerpt,
    ]),
  );
}
