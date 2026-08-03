"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MOCK_ARTICLES, mockFeedPage, mockImage } from "@continuum/shared";
import { askPredicate, groundAsk } from "@/lib/v2/ask-bridge";
import { fmtDateShort } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";
import { BitemporalFeed } from "./bitemporal-feed";
import { CommandCanvas } from "./command-canvas";
import { MarketMovers } from "./market-movers";

/** Analysis strip — most recent tear sheets, class-distinct, with imagery. */
function ArticlesStrip({ classFilter }: { classFilter: Set<string> }) {
  const articles = useMemo(() => {
    const sorted = [...MOCK_ARTICLES].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
    const filtered =
      classFilter.size === 0 ? sorted : sorted.filter((a) => classFilter.has(a.assetClass));
    return filtered.slice(0, 4);
  }, [classFilter]);

  if (articles.length === 0) {
    return null;
  }
  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 pt-6">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <span className="type-label">Analysis & tear sheets</span>
        <Link href="/v2/news/latest" className="type-mono text-ink-muted transition-colors hover:text-ink">
          LATEST →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-px border-x border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => {
          const cls = v2ClassFor(a.assetClass);
          const accent = v2Accent(a.assetClass, a.strategySlug);
          return (
            <Link key={a.id} href={`/v2/news/${a.slug}`} className="group bg-surface transition-colors hover:bg-muted/50">
              <img
                src={mockImage(a.imageSeed, 640, 300)}
                alt=""
                width={320}
                height={150}
                loading="lazy"
                className="aspect-[32/15] w-full border-b border-line object-cover"
              />
              <div className={`p-3 ${accent?.left ?? ""}`}>
                <div className={`type-label ${accent?.text ?? "text-ink-muted"}`}>{cls?.label}</div>
                <h3 className="type-h3 mt-1 group-hover:underline group-hover:decoration-dotted">
                  {a.headline}
                </h3>
                <div className="type-data mt-1.5 text-ink-muted">
                  {fmtDateShort(a.publishedOn)} · {a.readMinutes} min
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The News & AI Command Canvas (P1): prompt/chips → parseAsk → live feed
 * filter, with the query mirrored into ?ask= (shareable, no reload).
 * BitemporalFeed 65% / MarketMovers 35%.
 */
export function NewsCanvas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("ask") ?? "");
  const debounce = useRef<number | null>(null);

  // Mirror query → URL (debounced, replace — no history spam, no reload).
  useEffect(() => {
    if (debounce.current !== null) {
      window.clearTimeout(debounce.current);
    }
    debounce.current = window.setTimeout(() => {
      const qs = query.trim() === "" ? "" : `?ask=${encodeURIComponent(query.trim())}`;
      router.replace(`${pathname}${qs}`, { scroll: false });
    }, 250);
    return () => {
      if (debounce.current !== null) {
        window.clearTimeout(debounce.current);
      }
    };
  }, [query, pathname, router]);

  const allItems = useMemo(() => mockFeedPage({ pageSize: 400 }).items, []);
  const filters = useMemo(() => groundAsk(query), [query]);
  const items = useMemo(() => allItems.filter(askPredicate(filters)), [allItems, filters]);

  const classFilter = useMemo(() => {
    const set = new Set<string>();
    if (filters !== null) {
      for (const c of filters.assetClasses) {
        const mapped = v2ClassFor(c);
        if (mapped !== null) {
          set.add(mapped.slug);
        }
      }
      for (const s of filters.strategies) {
        const mapped = v2ClassFor(s.split(":")[0] ?? "");
        if (mapped !== null) {
          set.add(mapped.slug);
        }
      }
    }
    return set;
  }, [filters]);

  return (
    <>
      <CommandCanvas query={query} setQuery={setQuery} filters={filters} resultCount={items.length} />
      <ArticlesStrip classFilter={classFilter} />
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[65fr_35fr]">
        <section className="min-w-0 border border-line">
          <BitemporalFeed items={items} />
        </section>
        <MarketMovers items={allItems} />
      </div>
    </>
  );
}
