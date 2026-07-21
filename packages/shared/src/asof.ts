/**
 * Time-travel (Phase 34A) — the bitemporal payoff, pure part.
 *
 * The record carries TWO time dimensions per fact:
 *   occurred_on  — when the event happened in the world
 *   recorded_at  — when Continuum learned of it
 * An as-of view filters on BOTH: `occurred_on ≤ asof` (the event had
 * happened) AND `recorded_at ≤ asof` (the record knew about it). That is
 * what "the record as of {date}" honestly means — a backfilled fact about
 * 2019 does NOT appear in the 2020 view, because we didn't know it then.
 *
 * Editorial surfaces (articles, discussion threads) are EXCLUDED from
 * time-travel: editorial is commentary about the record, not the record —
 * replaying it would misrepresent what was "published" at a date.
 */

/** Earliest meaningful as-of; the corpus has nothing before this. */
const MIN_ASOF = "2000-01-01";

/** Validate ?asof=YYYY-MM-DD: a real calendar date, not future, not ancient. */
export function parseAsOf(raw: string | undefined, today: string): string | null {
  if (raw === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    return null; // 2026-02-31 style non-dates
  }
  if (raw < MIN_ASOF || raw >= today) {
    return null; // today or future → the live record, no banner
  }
  return raw;
}
