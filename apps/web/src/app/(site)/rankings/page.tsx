import type { Metadata } from "next";
import Link from "next/link";
import {
  administratorRanking,
  cityRanking,
  courtRanking,
  degreeRanking,
  type RankingRow,
} from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";

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

export default async function RankingsPage() {
  const [courts, cities, administrators, degree] = await Promise.all([
    courtRanking(),
    cityRanking(),
    administratorRanking(),
    degreeRanking(),
  ]);

  return (
    <div className="py-10">
      <h1 className="type-h1">Rankings</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        League tables computed from the approved record. Each table states its basis; where the
        data is thin, no table is shown.
      </p>

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
