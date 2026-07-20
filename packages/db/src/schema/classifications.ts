import { numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { entities } from "./entities";

/**
 * Entity classifications against the full alternatives taxonomy (Phase 26A).
 *
 * Design decision (documented per spec): strategy uses the '' sentinel for
 * CLASS-LEVEL rows (asset class known, strategy not), and the composite pk
 * is (entity_id, asset_class, strategy) so one entity can hold class-level
 * rows in several classes plus strategy rows beneath them.
 *
 * source: 'tag_map' (deterministic tag mapping, approved) | 'keyword'
 * (proposal pass, NEVER auto-approved) | 'operator' | 'register'.
 */
export const entityClassifications = pgTable(
  "entity_classifications",
  {
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    assetClass: text("asset_class").notNull(),
    strategy: text("strategy").notNull().default(""),
    source: text("source").notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("1.00"),
    status: text("status").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.assetClass, t.strategy] })],
);
