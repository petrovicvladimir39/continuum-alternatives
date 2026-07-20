import type { Metadata } from "next";
import Link from "next/link";
import { ReportCover } from "@/components/reports/report-cover";

export const metadata: Metadata = {
  title: "Reports",
  description:
    "Data-compiled research from the Continuum record: insolvency monitors, market maps, and league tables for Europe's alternative-asset markets.",
};

export default function ReportsPage() {
  return (
    <div className="py-10">
      <h1 className="type-h1">Reports</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        Research compiled directly from the platform&apos;s approved record — every figure
        traceable to a filing or a cited source.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        <Link
          href="/reports/serbian-insolvency-monitor-q3-2026"
          className="group block"
        >
          <ReportCover title="Serbian Insolvency Monitor" date="Q3 2026" />
          <h2 className="type-h3 mt-2.5 group-hover:text-accent">
            Serbian Insolvency Monitor — Q3 2026
          </h2>
          <p className="type-small mt-1 text-ink-muted">
            Filings trend, courts, administrators, and auction pipeline from the ALSU record.
          </p>
        </Link>

        <div className="block opacity-80">
          <ReportCover title="European Private Capital Map" date="In preparation" />
          <h2 className="type-h3 mt-2.5">European Private Capital Map</h2>
          <p className="type-small mt-1 text-ink-muted">
            In preparation — publishing when the regional deal record supports it honestly.
          </p>
        </div>
      </div>
    </div>
  );
}
