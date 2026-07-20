import { index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { memberProfiles } from "./members";

/**
 * Entity briefs (Phase 29D) — the ONE member-facing LLM feature. A brief is
 * cached per entity with a data-version fingerprint (approved facts + edges
 * counts/max-timestamps + enrichment presence); it regenerates only when
 * that fingerprint moves. Cached views are free; FRESH generations count
 * against the member's monthly cap and the global daily dollar guard —
 * both enforced in deterministic code before any model call.
 */
export const entityBriefs = pgTable("entity_briefs", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  /** Zod-validated {summary, key_facts, relationships, watch_points, source_names}. */
  content: jsonb("content").notNull(),
  dataVersion: text("data_version").notNull(),
  model: text("model").notNull(),
  generatedByMemberId: uuid("generated_by_member_id").references(() => memberProfiles.id),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  /** Deterministic price-sheet arithmetic (tokens × rate) — never LLM math. */
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
});

/**
 * One row per FRESH generation attempt that reached the model (cache hits
 * never land here). Powers the 20/month member cap, the $2/day global cost
 * guard, and the admin cost telemetry.
 */
export const briefGenerations = pgTable(
  "brief_generations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").references(() => memberProfiles.id),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    /** 'stored' | 'dropped_guard' | 'dropped_parse' — dropped runs still cost money. */
    outcome: text("outcome").notNull().default("stored"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("brief_generations_member_created_idx").on(t.memberId, t.createdAt),
    index("brief_generations_created_idx").on(t.createdAt),
  ],
);
