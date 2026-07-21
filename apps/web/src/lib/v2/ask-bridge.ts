import { parseAsk, type AskFilters, type MockFeedItem } from "@continuum/shared";
import { v2ClassFor } from "./taxonomy";

/**
 * Bridge between the existing deterministic Ask parser (Phase 25B) and the
 * v2 mock feed: parseAsk grounds the query into AskFilters; this module
 * turns those filters into a predicate over MockFeedItem. At cutover the
 * same AskFilters drive the real feed query — only the predicate swaps for
 * SQL.
 */

/** Real-platform fact types → mock fact types. */
const FACT_TYPE_MAP: Record<string, string[]> = {
  acquisition: ["acquisition"],
  funding_round: ["funding_round"],
  asset_sale_announced: ["npl_sale", "auction_update"],
  insolvency_opened: ["insolvency"],
  fund_close: ["fund_close"],
};

export function groundAsk(query: string): AskFilters | null {
  return parseAsk(query);
}

export function askPredicate(filters: AskFilters | null): (item: MockFeedItem) => boolean {
  if (filters === null) {
    return () => true;
  }
  const factTypes = new Set(filters.factTypes.flatMap((t) => FACT_TYPE_MAP[t] ?? [t]));
  const countries = new Set(filters.countries);
  const channels = new Set(filters.channels);
  // Strategy values are "<class>:<strategy>" ('' = class-level).
  const strategySlugs = new Set<string>();
  const classSlugs = new Set<string>(
    filters.assetClasses.map((c) => v2ClassFor(c)?.slug ?? c),
  );
  for (const value of filters.strategies) {
    const [cls, strat] = value.split(":");
    if (strat === undefined || strat === "") {
      const mapped = v2ClassFor(cls ?? "");
      if (mapped !== null) {
        classSlugs.add(mapped.slug);
      }
    } else {
      strategySlugs.add(strat);
    }
  }
  const freeText = filters.freeText.trim().toLowerCase();

  return (item: MockFeedItem) => {
    if (factTypes.size > 0 && !factTypes.has(item.factType)) {
      return false;
    }
    if (countries.size > 0 && (item.entityCountry === null || !countries.has(item.entityCountry))) {
      return false;
    }
    if (channels.size > 0 && !item.channels.some((c) => channels.has(c))) {
      return false;
    }
    if (classSlugs.size > 0 || strategySlugs.size > 0) {
      const classHit = item.entityAssetClass !== null && classSlugs.has(item.entityAssetClass);
      const strategyHit =
        item.entityStrategySlug !== null && strategySlugs.has(item.entityStrategySlug);
      if (!classHit && !strategyHit) {
        return false;
      }
    }
    if (freeText !== "") {
      const haystack = `${item.title} ${item.entityName}`.toLowerCase();
      if (!haystack.includes(freeText)) {
        return false;
      }
    }
    return true;
  };
}
