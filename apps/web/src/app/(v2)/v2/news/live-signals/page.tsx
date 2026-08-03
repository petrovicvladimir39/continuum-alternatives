import type { Metadata } from "next";
import { FilteredFeed } from "@/components/v2/news/filtered-feed";

export const metadata: Metadata = { title: "Live Signals — News" };

export default function LiveSignalsPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6">
      <h1 className="type-h1">Live Signals</h1>
      <p className="type-small mt-1 text-ink-secondary">
        Signals recorded in the last 48 hours — press, filings, gazettes, registers.
      </p>
      <div className="mt-5">
        <FilteredFeed maxAgeHours={48} />
      </div>
    </div>
  );
}
