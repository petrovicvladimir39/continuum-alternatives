import type { Metadata } from "next";
import Link from "next/link";
import { FilteredFeed } from "@/components/v2/news/filtered-feed";

export const metadata: Metadata = { title: "Regulatory Watchdog — News" };

export default function RegulatoryWatchdogPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6">
      <h1 className="type-h1">Regulatory Watchdog</h1>
      <p className="type-small mt-1 text-ink-secondary">
        Supervision, enforcement, consultations, courts and insolvency filings across European
        alternatives. Monthly synthesis in the{" "}
        <Link href="/v2/reports/watchdog-briefs" className="underline decoration-dotted hover:text-ink">
          Watchdog Briefs
        </Link>
        .
      </p>
      <div className="mt-5">
        <FilteredFeed factTypes={["regulatory", "insolvency", "credit_event"]} />
      </div>
    </div>
  );
}
