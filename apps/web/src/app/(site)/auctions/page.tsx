import type { Metadata } from "next";
import Link from "next/link";
import { auctionStats, listAuctions, type AuctionRow } from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { StatBlock } from "@/components/ui/stat-block";
import { formatAmount } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

type AuctionSearchParams = { tab?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<AuctionSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return {
    // SEO magnet phrasing: this page answers "bankruptcy asset sales Serbia"-class queries.
    title: "Bankruptcy asset sale auctions — Serbia | Auction tracker",
    description:
      "Upcoming bankruptcy asset sales and insolvency auctions in Serbia, tracked from the ALSU registry: sale dates, debtors, methods, estimated values, and courts — updated continuously.",
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Countdown display: computed server-side, never client JS. */
function countdownLabel(days: number): string {
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "in 1 day";
  }
  return `in ${days} days`;
}

function valueCell(row: AuctionRow): string {
  if (row.value.kind === "numeric") {
    // ALSU states amounts in dinars — formatted as RSD, never relabeled as €.
    return formatAmount(String(row.value.value), "RSD");
  }
  if (row.value.kind === "raw") {
    return row.value.text;
  }
  return "—";
}

function AuctionTable({ rows, upcoming }: { rows: AuctionRow[]; upcoming: boolean }) {
  return (
    <DataTable className="mt-4">
      <thead>
        <tr>
          <th>Sale date</th>
          {upcoming ? <th>Countdown</th> : null}
          <th>Debtor</th>
          <th>Method</th>
          <th>Place</th>
          <th className={numericCell}>Est. value</th>
          <th>Court</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.factId}>
            <td className="type-data whitespace-nowrap">{row.saleDate}</td>
            {upcoming ? (
              <td className="type-data whitespace-nowrap">{countdownLabel(row.daysUntil)}</td>
            ) : null}
            <td>
              {row.debtorHref !== null ? (
                <Link href={row.debtorHref} className="font-medium hover:text-accent">
                  {row.debtorName}
                </Link>
              ) : (
                row.debtorName
              )}
            </td>
            <td>{row.method ?? "—"}</td>
            <td>{row.place ?? "—"}</td>
            <td className={numericCell}>{valueCell(row)}</td>
            <td className="max-w-[220px] truncate">{row.court ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<AuctionSearchParams>;
}) {
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [list, stats] = await Promise.all([
    listAuctions(tab, tab === "past" ? { page } : {}),
    auctionStats(),
  ]);

  return (
    <div className="py-10">
      <h1 className="type-h1">Auction tracker</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        Bankruptcy asset sales across the region&apos;s insolvency registries — dates, debtors,
        methods, and values as filed.
      </p>

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
        <StatBlock value={String(stats.upcoming)} label="Upcoming sales" />
        <StatBlock value={String(stats.nextSevenDays)} label="Next 7 days" />
        <StatBlock value={String(stats.totalTracked)} label="Tracked total" />
        <StatBlock value={String(stats.withValue)} label="With stated value" />
      </div>

      <div className="mt-5 flex gap-1 border-b border-line pb-2">
        <Link
          href="/auctions"
          className={`px-2 py-1 text-[13px] ${tab === "upcoming" ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
        >
          Upcoming
        </Link>
        <Link
          href="/auctions?tab=past"
          className={`px-2 py-1 text-[13px] ${tab === "past" ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
        >
          Past
        </Link>
      </div>

      {list.rows.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-secondary">
          {tab === "upcoming"
            ? "No upcoming sales on file right now — the registry feed updates daily."
            : "No past sales recorded."}
        </p>
      ) : (
        <AuctionTable rows={list.rows} upcoming={tab === "upcoming"} />
      )}

      {tab === "past" && list.pageCount > 1 ? (
        <nav className="mt-6 flex items-center gap-4">
          {list.page > 1 ? (
            <Link
              href={`/auctions?tab=past&page=${list.page - 1}`}
              className="type-small hover:text-accent"
            >
              ← Newer
            </Link>
          ) : null}
          <span className="type-data text-ink-muted">
            Page {list.page} of {list.pageCount} · {list.total} sales
          </span>
          {list.page < list.pageCount ? (
            <Link
              href={`/auctions?tab=past&page=${list.page + 1}`}
              className="type-small hover:text-accent"
            >
              Older →
            </Link>
          ) : null}
        </nav>
      ) : null}

      <p className="type-small mt-8 text-ink-muted">
        Source: ALSU (Agencija za licenciranje stečajnih upravnika) — tracked by Continuum.
      </p>
    </div>
  );
}
