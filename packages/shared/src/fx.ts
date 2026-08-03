/**
 * EUROPE DEPTH RUN — deterministic ECB reference-rate conversion (house law:
 * all monetary math and all currency conversion happen in code, never in an
 * LLM). Rates are UNITS PER 1 EUR exactly as published by the ECB eurofxref
 * feed; the pipeline caches them in the ecb_rates table (fx-rates.ts).
 *
 * Every stored conversion keeps the ORIGINAL amount + currency + rate_date
 * beside amount_eur (share_capital jsonb shape), so it is auditable and
 * re-runnable.
 *
 * Currencies OUTSIDE the ECB reference list (RSD, MKD, ALL, MDL, UAH…) are
 * NOT converted — amount_eur stays null with the original preserved. The one
 * exception: BAM, pegged to EUR by Bosnia's currency-board law (Official
 * Gazette of BiH 1/97) at exactly 1.95583 per EUR since 1998 — a statutory
 * constant, not an estimate.
 */

export const BAM_PER_EUR = 1.95583;

/** rates: currency (ISO 4217, upper) -> units per 1 EUR, for one rate date. */
export type FxRateTable = {
  rateDate: string; // YYYY-MM-DD, the ECB publication date used
  rates: Record<string, number>;
};

export type EurConversion = {
  amount: number;
  currency: string;
  amountEur: number | null;
  rateDate: string | null;
};

/**
 * Deterministic conversion. EUR passes through; BAM uses the statutory peg;
 * anything absent from the table returns amountEur null (never guessed).
 * Result is rounded to 2 decimals — cents-level precision, no float noise.
 */
export function toEur(amount: number, currency: string, table: FxRateTable): EurConversion {
  const iso = currency.trim().toUpperCase();
  if (!Number.isFinite(amount)) {
    return { amount, currency: iso, amountEur: null, rateDate: null };
  }
  if (iso === "EUR") {
    return { amount, currency: iso, amountEur: round2(amount), rateDate: table.rateDate };
  }
  if (iso === "BAM") {
    return {
      amount,
      currency: iso,
      amountEur: round2(amount / BAM_PER_EUR),
      rateDate: table.rateDate,
    };
  }
  const rate = table.rates[iso];
  if (rate === undefined || rate <= 0) {
    return { amount, currency: iso, amountEur: null, rateDate: null };
  }
  return { amount, currency: iso, amountEur: round2(amount / rate), rateDate: table.rateDate };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Parse the ECB eurofxref XML (daily or 90-day history). Returns one entry
 * per <Cube time="…"> day. Pure string parsing — no XML dependency, the feed
 * shape has been stable for 20+ years.
 */
export function parseEurofxref(xml: string): FxRateTable[] {
  const tables: FxRateTable[] = [];
  const dayRe = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>([\s\S]*?)<\/Cube>/g;
  let day: RegExpExecArray | null;
  while ((day = dayRe.exec(xml)) !== null) {
    const rateDate = day[1];
    const body = day[2];
    if (rateDate === undefined || body === undefined) {
      continue;
    }
    const rates: Record<string, number> = {};
    const rateRe = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = rateRe.exec(body)) !== null) {
      const iso = m[1];
      const value = Number.parseFloat(m[2] ?? "");
      if (iso !== undefined && Number.isFinite(value) && value > 0) {
        rates[iso] = value;
      }
    }
    if (Object.keys(rates).length > 0) {
      tables.push({ rateDate, rates });
    }
  }
  return tables;
}
