import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  administratorRanking,
  anomalyNotes,
  auctionStats,
  courtRanking,
  monthlyFilings,
} from "@continuum/db";
import { FilingsChart } from "@/components/reports/filings-chart";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { StatBlock } from "@/components/ui/stat-block";
import { requestReportAccessAction } from "../actions";
import { REPORT_ACCESS_COOKIE } from "../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Serbian Insolvency Monitor — Q3 2026",
  description:
    "Auto-compiled from the Continuum record: 12-month insolvency filing trend, most active courts and administrators, and the bankruptcy auction pipeline in Serbia.",
};

const REPORT_PATH = "/reports/serbian-insolvency-monitor-q3-2026";

function Gate({ error }: { error?: string }) {
  return (
    <div className="max-w-md">
      <div className="rounded-md border border-line bg-surface p-5">
        <h2 className="type-h3">Access the report</h2>
        <p className="type-small mt-1.5 text-ink-secondary">
          Free, compiled live from the record. Tell us who is reading — we use this only to
          understand our readership.
        </p>
        {error !== undefined ? (
          <p className="mt-3 border border-distressed-bg bg-distressed-bg px-3 py-2 text-[13px] text-distressed">
            {error}
          </p>
        ) : null}
        <form action={requestReportAccessAction} className="mt-4 space-y-3">
          <input type="hidden" name="back" value={REPORT_PATH} />
          <label className="block">
            <span className="type-label">Name</span>
            <input
              type="text"
              name="name"
              required
              className="mt-1 w-full rounded-sm border border-line bg-ground px-2.5 py-1.5 text-[13px] focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="type-label">Email</span>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-sm border border-line bg-ground px-2.5 py-1.5 text-[13px] focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="type-label">Role</span>
            <select
              name="role"
              required
              defaultValue=""
              className="mt-1 w-full rounded-sm border border-line bg-ground px-2.5 py-1.5 text-[13px]"
            >
              <option value="" disabled>
                Select…
              </option>
              <option>Investor</option>
              <option>Lender</option>
              <option>Advisor</option>
              <option>Servicer</option>
              <option>Corporate</option>
              <option>Other</option>
            </select>
          </label>
          <label className="flex items-start gap-2 text-[12px] leading-[1.45] text-ink-secondary">
            <input type="checkbox" name="consent" className="mt-0.5" />
            <span>
              I consent to Continuum Alternatives storing this information to provide the report
              and understand I can request deletion at any time (GDPR).
            </span>
          </label>
          <button
            type="submit"
            className="w-full rounded-sm border border-accent bg-accent px-3 py-2 text-[13px] font-medium text-accent-ink hover:opacity-90"
          >
            Open the report
          </button>
        </form>
      </div>
      {/* PDF export is BACKLOG — the report is the live page for now. */}
    </div>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const unlocked = cookieStore.get(REPORT_ACCESS_COOKIE)?.value === "1";

  return (
    <div className="py-10">
      <p className="type-label">Continuum report · Q3 2026</p>
      <h1 className="type-h1 mt-2 max-w-2xl">Serbian Insolvency Monitor</h1>
      <p className="mt-3 max-w-2xl text-ink-secondary">
        Auto-compiled from the Continuum record: filing volumes, court and administrator activity,
        and the bankruptcy asset-sale pipeline, from the ALSU insolvency registry.
      </p>

      {!unlocked ? (
        <div className="mt-8">
          <Gate {...(error !== undefined ? { error } : {})} />
        </div>
      ) : (
        <ReportBody />
      )}
    </div>
  );
}

async function ReportBody() {
  const [monthly, courts, administrators, auctions, anomalies] = await Promise.all([
    monthlyFilings(),
    courtRanking(5),
    administratorRanking(5),
    auctionStats(),
    anomalyNotes(5),
  ]);
  const total12m = monthly.reduce((sum, point) => sum + point.n, 0);

  return (
    <div className="mt-8 max-w-3xl">
      <section>
        <h2 className="type-h2">Filing trend</h2>
        <p className="type-small mt-1 text-ink-muted">
          Insolvency proceedings opened per month, trailing 12 months · {total12m} total
        </p>
        <div className="mt-4 rounded-md border border-line bg-surface p-4">
          <FilingsChart data={monthly} />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="type-h2">Most active courts</h2>
          <DataTable className="mt-3">
            <thead>
              <tr>
                <th>Court</th>
                <th className={numericCell}>Openings</th>
              </tr>
            </thead>
            <tbody>
              {courts.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={numericCell}>{row.n}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
        <div>
          <h2 className="type-h2">Busiest administrators</h2>
          <DataTable className="mt-3">
            <thead>
              <tr>
                <th>Administrator</th>
                <th className={numericCell}>Cases</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={numericCell}>{row.n}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="type-h2">Auction pipeline</h2>
        <div className="mt-3 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
          <StatBlock value={String(auctions.upcoming)} label="Upcoming sales" />
          <StatBlock value={String(auctions.nextSevenDays)} label="Next 7 days" />
          <StatBlock value={String(auctions.totalTracked)} label="Tracked total" />
          <StatBlock value={String(auctions.withValue)} label="With stated value" />
        </div>
        <p className="type-small mt-2 text-ink-muted">
          Live pipeline on the{" "}
          <Link href="/auctions" className="text-accent hover:underline">
            auction tracker
          </Link>
          .
        </p>
      </section>

      {anomalies.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Notable deviations</h2>
          <p className="type-small mt-1 text-ink-muted">
            Weeks where tracked volume deviated sharply from the trailing baseline (z-score).
          </p>
          <ul className="mt-3 space-y-2">
            {anomalies.map((note) => (
              <li
                key={`${note.dimension}-${note.dimensionKey}-${note.periodWeek}`}
                className="border-t border-line pt-2 text-[13px]"
              >
                <span className="type-data text-ink-muted">week of {note.periodWeek}</span>{" "}
                <span className="font-medium">{note.dimensionKey}</span>{" "}
                <span className="text-ink-secondary">
                  — {note.observed} filings ({note.dimension}), z = {note.z.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 border-t border-line pt-5">
        <h2 className="type-h2">Methodology &amp; sources</h2>
        <p className="type-small mt-2 max-w-2xl leading-[1.55] text-ink-secondary">
          Compiled live from the Continuum record at page load. Filing data originates from ALSU
          (Agencija za licenciranje stečajnih upravnika) — the Serbian insolvency administrators
          registry — mapped deterministically (no model in the loop) and reviewed before
          publication. Administrator names are grouped across script variants; amounts are shown
          as filed, in dinars, never converted. Counts reflect what Continuum tracks, not
          necessarily the universe of all proceedings.
        </p>
      </section>
    </div>
  );
}
