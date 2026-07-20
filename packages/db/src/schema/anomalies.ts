import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Statistical anomalies over weekly fact series. Populated by the anomaly
 * scanner (deterministic math, no LLM); surfaced read-only in admin. These are
 * NOT facts — Phase 13's digest engine decides how they surface editorially.
 */
export const anomalies = pgTable(
  "anomalies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dimension: text("dimension").notNull(),
    dimensionKey: text("dimension_key").notNull(),
    periodWeek: date("period_week").notNull(),
    observed: integer("observed").notNull(),
    baselineMean: numeric("baseline_mean").notNull(),
    baselineStd: numeric("baseline_std").notNull(),
    z: numeric("z").notNull(),
    status: text("status").default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("anomalies_dimension_key_week_idx").on(t.dimension, t.dimensionKey, t.periodWeek),
  ],
);
