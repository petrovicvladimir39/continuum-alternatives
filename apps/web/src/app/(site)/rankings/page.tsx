import type { Metadata } from "next";
import Link from "next/link";
import { parseAsOf } from "@continuum/shared";
import {
  administratorRanking,
  cityRanking,
  courtRanking,
  db,
  degreeRanking,
  sql,
  type RankingRow,
} from "@continuum/db";
import { AsOfBanner, AsOfControl } from "@/components/asof-control";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rankings",
  description:
    "League tables from Europe's insolvency and alternative-asset record: most active courts, cities, insolvency administrators, and most connected organizations.",
};

/**
 * Data-supported tables only. NO deal-value league tables yet — deal density
 * is insufficient (a single tracked deal would make a fake table); they arrive
 * with regional deal flow. Live queries are nightly-fresh at current scale;
 * materialize once timeline_facts passes ~50k rows.
 */

function RankingTable({
  title,
  basis,
  rows,
  countLabel,
}: {
  title: string;
  basis: string;
  rows: RankingRow[];
  countLabel: string;
}) {
  return (
    <section>
      <h2 className="type-h2">{title}</h2>
      <p className="type-small mt-1 text-ink-muted">{basis}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-secondary">
          Not enough data yet for an honest table.
        </p>
      ) : (
        <DataTable className="mt-3">
          <thead>
            <tr>
              <th className="w-[36px]">#</th>
              <th>Name</th>
              <th className={numericCell}>{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.label}>
                <td className="type-data">{index + 1}</td>
                <td>
                  {row.href != null ? (
                    <Link href={row.href} className="font-medium hover:text-accent">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </td>
                <td className={numericCell}>{row.n}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </section>
  );
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; asof?: string }>;
}) {
  // Default "All countries" (anti-skew) — the selector narrows honestly;
  // thin slices show their empty state rather than a fake table.
  const params = await searchParams;
  const rawCountry = params.country?.toUpperCase() ?? "";
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
  // Phase 34A: time-travel — the trailing-12-month windows end at asof and
  // count only facts RECORDED by then (a backfill never rewrites history).
  const asof = parseAsOf(params.asof, new Date().toISOString().slice(0, 10)) ?? undefined;

  const [courts, cities, administrators, degree, countryRows] = await Promise.all([
    courtRanking(10, country, asof),
    cityRanking(10, country, asof),
    administratorRanking(10, country, asof),
    degreeRanking(20, country, asof),
    db.execute(sql`
      select distinct e.country from entities e
      where e.status = 'active' and e.country is not null
      order by e.country
    `),
  ]);
  const countries = countryRows.rows.map((row) => String(row.country));

  return (
    <div className="py-10">
      {asof !== undefined ? (
        <div className="mb-6">
          <AsOfBanner asof={asof} basePath="/rankings" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-h1">Rankings</h1>
        <AsOfControl basePath="/rankings" asof={asof ?? null} />
      </div>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        League tables computed from the approved record. Each table states its basis; where the
        data is thin, no table is shown.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-line pb-2 text-[13px]">
        <Link
          href="/rankings"
          className={`px-2 py-1 ${country === undefined ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
        >
          All countries
        </Link>
        {countries.map((code) => (
          <Link
            key={code}
            href={`/rankings?country=${code}`}
            className={`px-2 py-1 ${country === code ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
          >
            {countryName(code)}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <RankingTable
          title="Most active courts"
          basis="By insolvency openings tracked on Continuum, trailing 12 months."
          rows={courts}
          countLabel="Openings"
        />
        <RankingTable
          title="Most active cities"
          basis="By filings of all types tracked on Continuum, trailing 12 months."
          rows={cities}
          countLabel="Filings"
        />
        <RankingTable
          title="Busiest administrators"
          basis="By insolvency cases tracked on Continuum, trailing 12 months; minimum two cases."
          rows={administrators}
          countLabel="Cases"
        />
        <RankingTable
          title="Most connected organizations"
          basis="By approved relationship records on Continuum, all time."
          rows={degree}
          countLabel="Connections"
        />
      </div>
    </div>
  );
}
