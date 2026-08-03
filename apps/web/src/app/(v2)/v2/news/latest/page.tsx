import type { Metadata } from "next";
import { FilteredFeed } from "@/components/v2/news/filtered-feed";

export const metadata: Metadata = { title: "Latest — News" };

export default function LatestPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6">
      <h1 className="type-h1">Latest</h1>
      <p className="type-small mt-1 text-ink-secondary">
        Everything in the record, chronological by recorded-at. Bitemporal: each item shows when it
        happened and when it entered the record.
      </p>
      <div className="mt-5">
        <FilteredFeed />
      </div>
    </div>
  );
}
