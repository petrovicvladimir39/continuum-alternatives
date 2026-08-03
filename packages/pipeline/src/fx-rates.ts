import "./env";
import { parseEurofxref, type FxRateTable } from "@continuum/shared";
import { db, sql } from "@continuum/db";

/**
 * EUROPE DEPTH RUN — ECB reference-rate cache ($0, deterministic).
 *
 *   pnpm fx:rates            # fetch the 90-day eurofxref history, upsert
 *
 * Source: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml
 * (official ECB euro foreign-exchange reference rates). Idempotent upsert
 * into ecb_rates on (rate_date, currency). Conversion itself lives in
 * @continuum/shared toEur() — code, never an LLM (house law).
 */

const ECB_90D_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";

export async function refreshEcbRates(): Promise<{ days: number; rows: number }> {
  const res = await fetch(ECB_90D_URL, {
    headers: { "user-agent": "continuum-alternatives/1.0 (fx reference cache)" },
  });
  if (!res.ok) {
    throw new Error(`ECB eurofxref fetch failed: HTTP ${res.status}`);
  }
  const tables = parseEurofxref(await res.text());
  let rows = 0;
  for (const table of tables) {
    for (const [currency, rate] of Object.entries(table.rates)) {
      await db.execute(sql`
        INSERT INTO ecb_rates (rate_date, currency, rate_per_eur)
        VALUES (${table.rateDate}, ${currency}, ${rate})
        ON CONFLICT (rate_date, currency) DO UPDATE SET rate_per_eur = EXCLUDED.rate_per_eur
      `);
      rows += 1;
    }
  }
  return { days: tables.length, rows };
}

/**
 * Rate table for a given date: the latest cached rate_date <= date, else the
 * earliest cached date (rate_date is always stored beside the converted value,
 * so a substitute date is transparent, never silent).
 */
export async function rateTableFor(date: string): Promise<FxRateTable | null> {
  const pick = await db.execute(sql`
    SELECT rate_date::text AS d FROM ecb_rates WHERE rate_date <= ${date}
    ORDER BY rate_date DESC LIMIT 1
  `);
  let rateDate = (pick.rows[0] as { d: string } | undefined)?.d;
  if (rateDate === undefined) {
    const earliest = await db.execute(
      sql`SELECT rate_date::text AS d FROM ecb_rates ORDER BY rate_date ASC LIMIT 1`,
    );
    rateDate = (earliest.rows[0] as { d: string } | undefined)?.d;
  }
  if (rateDate === undefined) {
    return null;
  }
  const rows = await db.execute(
    sql`SELECT currency, rate_per_eur::float8 AS rate FROM ecb_rates WHERE rate_date = ${rateDate}`,
  );
  const rates: Record<string, number> = {};
  for (const row of rows.rows as { currency: string; rate: number }[]) {
    rates[row.currency] = row.rate;
  }
  return { rateDate, rates };
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("fx-rates.ts") === true;
if (isMain) {
  refreshEcbRates()
    .then(({ days, rows }) => {
      console.log(`fx:rates — cached ${days} ECB rate days (${rows} rows upserted)`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
