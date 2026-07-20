import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { entities } from "./entities";

/**
 * News Desk articles (reset build Part 6) — the ONLY LLM-composed surface.
 *
 * Doctrine:
 * - Composed exclusively from APPROVED facts (titles + verbatim excerpts +
 *   source names + entity names are the only model inputs).
 * - Mechanical guards drop any draft whose numbers or entity names are not
 *   present in the inputs; length and attribution are enforced in code.
 * - status proposed → published only through human approval in /admin/review.
 *   NO auto-publish; the weekly Inngest trigger ships DISABLED.
 * - The citation footer is assembled at render time from fact_ids /
 *   source_document_ids — never written by the model.
 */

// Phase 27B: 'draft' is the operator-only state before publish.
export const articleStatus = pgEnum("article_status", ["proposed", "published", "rejected", "draft"]);

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  headline: text("headline").notNull(), // ≤90 chars, enforced by compose guards
  deck: text("deck"), // ≤160 chars, enforced by compose guards
  bodyMd: text("body_md").notNull(), // 2–4 paragraphs, 400–1600 chars
  status: articleStatus("status").notNull().default("proposed"),
  channels: text("channels").array().notNull().default([]),
  primaryEntityId: uuid("primary_entity_id").references(() => entities.id),
  factIds: uuid("fact_ids").array().notNull().default([]),
  sourceDocumentIds: uuid("source_document_ids").array().notNull().default([]),
  byline: text("byline").notNull().default("Continuum Desk"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  // Phase 27B — editorial identity. asset_class/strategy drive the class
  // accent slots (null = neutral render, never a default color).
  // authored_by: 'desk_compose' (machine, guards apply) | 'operator' (the
  // operator IS the editor — guards do not apply to their own words).
  assetClass: text("asset_class"),
  strategy: text("strategy"),
  authoredBy: text("authored_by").notNull().default("desk_compose"),
  // Operator-piece citations (rendered into the footer; optional).
  sourceUrls: text("source_urls").array().notNull().default([]),
});
