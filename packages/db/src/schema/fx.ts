import { char, date, numeric, pgTable, primaryKey } from "drizzle-orm/pg-core";

/**
 * EUROPE DEPTH RUN — ECB euro foreign-exchange reference rates, cached daily.
 * Source: ECB eurofxref (official reference rates, ~16:00 CET). One row per
 * (rate_date, currency); rate is UNITS OF CURRENCY PER 1 EUR, verbatim from
 * the ECB feed. All EUR conversion is deterministic code against this table
 * (@continuum/shared fx.ts) — LLMs NEVER convert currency (house law). Every
 * converted value stores original amount + currency + rate_date beside
 * amount_eur, so conversions are auditable and re-runnable.
 */
export const ecbRates = pgTable(
  "ecb_rates",
  {
    rateDate: date("rate_date").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    ratePerEur: numeric("rate_per_eur").notNull(),
  },
  (t) => [primaryKey({ columns: [t.rateDate, t.currency] })],
);
