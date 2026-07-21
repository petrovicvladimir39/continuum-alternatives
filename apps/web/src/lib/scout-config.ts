/** Scout submission vocabulary + limits (Phase 34E) — shared by the form
 * and its server action ("use server" modules may export only functions). */

export const SCOUT_FACT_TYPES = [
  "insolvency_opened",
  "asset_sale_announced",
  "acquisition",
  "funding_round",
  "fund_close",
  "advisor_mandate",
  "servicing_mandate",
  "people_move",
  "signal",
] as const;

export const SCOUTS_PER_DAY = 5;
