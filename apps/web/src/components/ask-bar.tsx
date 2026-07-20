import Link from "next/link";
import type { AskFilters } from "@continuum/shared";
import { removeChipFromQuery } from "@continuum/shared";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS } from "@/lib/public-labels";

/**
 * The Ask bar (Phase 25B) — deterministic parsing, URL-driven state
 * (?q= → server-parsed filters), fully server-rendered: the form is a GET,
 * chips are links that rebuild the query minus their tokens, so every ask
 * is shareable and back-button-safe. Never labeled "AI" — it is the ask/
 * search bar; the capability speaks for itself.
 */

export type EntityChip = { term: string; count: number };

export function AskBar({
  query,
  filters,
  entityChip,
  savedViews,
  canSave,
}: {
  query: string;
  filters: AskFilters | null;
  entityChip: EntityChip | null;
  savedViews: { id: string; name: string; q: string }[];
  canSave: boolean;
}) {
  return (
    <div>
      <form action="/news" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search markets, countries, companies — e.g. distressed deals in Poland"
          className="w-full border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </form>

      {filters !== null && filters.matches.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {filters.matches.map((match) => {
            const remaining = removeChipFromQuery(query, match.tokens);
            const href = remaining === "" ? "/news" : `/news?q=${encodeURIComponent(remaining)}`;
            const variant =
              match.kind === "channel"
                ? (CHANNEL_TAG_VARIANTS[match.value] ?? "neutral")
                : "neutral";
            return (
              <Link key={`${match.kind}:${match.value}`} href={href} title="Remove filter">
                <Tag variant={variant}>
                  {match.label} <span className="ml-1 text-ink-muted">×</span>
                </Tag>
              </Link>
            );
          })}
          {entityChip !== null ? (
            <Link href={`/search?q=${encodeURIComponent(entityChip.term)}`}>
              <Tag variant="neutral">
                Companies matching “{entityChip.term}” · {entityChip.count}
              </Tag>
            </Link>
          ) : null}
          {canSave && filters !== null ? (
            <span className="ml-1">{/* server action button rendered by the page */}</span>
          ) : null}
        </div>
      ) : null}

      {savedViews.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="type-label">Saved</span>
          {savedViews.map((view) => (
            <Link key={view.id} href={`/news?q=${encodeURIComponent(view.q)}`}>
              <Tag variant="neutral">{view.name}</Tag>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
