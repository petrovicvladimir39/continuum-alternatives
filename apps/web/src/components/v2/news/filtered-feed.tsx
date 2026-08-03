"use client";

import { useMemo } from "react";
import { mockFeedPage } from "@continuum/shared";
import { BitemporalFeed } from "./bitemporal-feed";

/** Thin client wrapper for the news subroutes — a pre-filtered feed. */
export function FilteredFeed({
  factTypes,
  channel,
  maxAgeHours,
}: {
  factTypes?: string[];
  channel?: string;
  maxAgeHours?: number;
}) {
  const items = useMemo(() => {
    const opts: Parameters<typeof mockFeedPage>[0] = { pageSize: 400 };
    if (factTypes !== undefined) {
      opts.factTypes = factTypes;
    }
    if (channel !== undefined) {
      opts.channel = channel;
    }
    let list = mockFeedPage(opts).items;
    if (maxAgeHours !== undefined) {
      const cutoff = Date.now() - maxAgeHours * 3600_000;
      list = list.filter((i) => new Date(i.recordedAt).getTime() >= cutoff);
    }
    return list;
  }, [factTypes, channel, maxAgeHours]);
  return (
    <section className="border border-line">
      <BitemporalFeed items={items} />
    </section>
  );
}
