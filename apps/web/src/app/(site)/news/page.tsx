import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { composeTodayStrip, parseAsk, type AskFilters } from "@continuum/shared";
import {
  findEntities,
  getMemberByClerkId,
  listAskFeed,
  listPublishedArticles,
  listSavedViews,
  todayStripCounts,
  type ArticleListItem,
  type FeedItem,
} from "@continuum/db";
import { AskBar, type EntityChip } from "@/components/ask-bar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";
import { saveAskViewAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description:
    "The Continuum Desk — short, source-cited articles on European alternative assets, with an askable live record underneath.",
};

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

function describeFilters(filters: AskFilters, total: number): string {
  const parts = filters.matches.map((m) => m.label);
  if (filters.freeText !== "") {
    parts.push(`“${filters.freeText}”`);
  }
  return `Showing ${parts.join(" · ")} — ${total} item${total === 1 ? "" : "s"}`;
}

function articleMatchesFilters(article: ArticleListItem, filters: AskFilters): boolean {
  if (filters.channels.length > 0 && !article.channels.some((c) => filters.channels.includes(c))) {
    return false;
  }
  if (
    filters.countries.length > 0 &&
    (article.entityCountry === null || !filters.countries.includes(article.entityCountry))
  ) {
    return false;
  }
  if (
    filters.freeText !== "" &&
    !article.headline.toLowerCase().includes(filters.freeText.toLowerCase()) &&
    !(article.entityName ?? "").toLowerCase().includes(filters.freeText.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function WireRow({ item }: { item: FeedItem }) {
  return (
    <div className="border-t border-line py-2.5">
      <span className="type-data text-ink-muted">{item.occurredOn}</span>{" "}
      {item.entityHref !== null ? (
        <Link href={item.entityHref} className="text-[13px] font-medium leading-[1.4] hover:text-accent">
          {item.title}
        </Link>
      ) : (
        <span className="text-[13px] font-medium leading-[1.4]">{item.title}</span>
      )}
      <p className="type-small mt-0.5 text-ink-muted">
        {item.entityName}
        {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
        {item.sourceName !== null ? ` · ${item.sourceName}` : ""}
      </p>
    </div>
  );
}

export default async function NewsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const filters = query === "" ? null : parseAsk(query);

  // Signed-in saved views (Clerk-off environments skip identity entirely).
  let savedViews: { id: string; name: string; q: string }[] = [];
  let signedIn = false;
  if (clerkEnabled) {
    const { userId } = await auth();
    if (userId !== null) {
      signedIn = true;
      const member = await getMemberByClerkId(userId);
      if (member !== null) {
        savedViews = (await listSavedViews(member.id)).map((view) => {
          const stored = view.filters as { q?: string };
          return { id: view.id, name: view.name, q: stored.q ?? "" };
        });
      }
    }
  }

  const [todayCounts, allArticles] = await Promise.all([todayStripCounts(), listPublishedArticles(60)]);
  const weekday = new Date().toLocaleDateString("en-GB", { weekday: "long" });
  const today = composeTodayStrip({ weekday, ...todayCounts });

  // Filtered mode: articles narrowed in JS (small set), the live record via SQL.
  let feed: { items: FeedItem[]; total: number } | null = null;
  let entityChip: EntityChip | null = null;
  let articles = allArticles;
  if (filters !== null) {
    feed = await listAskFeed({
      channels: filters.channels,
      countries: filters.countries,
      factTypes: filters.factTypes,
      ...(filters.freeText !== "" ? { entityQuery: filters.freeText } : {}),
      limit: 30,
    });
    articles = allArticles.filter((article) => articleMatchesFilters(article, filters));
    if (filters.freeText !== "") {
      const entityHits = await findEntities(filters.freeText);
      if (entityHits.length >= 1) {
        entityChip = { term: filters.freeText, count: entityHits.length };
      }
    }
  }

  return (
    <div className="max-w-3xl py-10">
      {today !== null ? (
        <p className="type-data mb-4 border-b border-line pb-2.5 text-[12px] uppercase tracking-wide text-ink-secondary">
          {today}
        </p>
      ) : null}

      <div className="flex items-baseline justify-between">
        <h1 className="type-h1">News</h1>
        <Link href="/feed" className="text-[13px] text-accent hover:underline">
          All signals →
        </Link>
      </div>

      <div className="mt-5">
        <AskBar
          query={query}
          filters={filters}
          entityChip={entityChip}
          savedViews={savedViews}
          canSave={signedIn && filters !== null}
        />
        {signedIn && filters !== null ? (
          <form action={saveAskViewAction} className="mt-2">
            <input type="hidden" name="q" value={query} />
            <Button type="submit" variant="ghost">
              Save this view
            </Button>
          </form>
        ) : null}
      </div>

      {filters !== null && feed !== null ? (
        <div className="mt-6">
          <p className="text-[13px] tabular-nums text-ink-secondary">
            {describeFilters(filters, feed.total)}
          </p>
          {feed.total === 0 && articles.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-muted">
              Nothing in the record for this combination yet. Remove a chip above to widen the
              ask — the record grows daily.
            </p>
          ) : null}

          {articles.length > 0 ? (
            <div className="mt-4 space-y-5">
              {articles.map((article) => (
                <article key={article.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                  <Link
                    href={`/news/${article.slug}`}
                    className="font-serif text-[20px] font-medium leading-[1.25] text-ink hover:text-accent"
                  >
                    {article.headline}
                  </Link>
                  <p className="type-data mt-1 text-ink-muted">
                    {article.byline}
                    {article.publishedAt !== null
                      ? ` · ${article.publishedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {feed.items.length > 0 ? (
            <div className="mt-5">
              <h2 className="type-label">From the live record</h2>
              <div className="mt-1">
                {feed.items.map((item) => (
                  <WireRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 space-y-7">
          {articles.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No articles published yet.</p>
          ) : (
            articles.map((article) => (
              <article key={article.id} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
                <Link
                  href={`/news/${article.slug}`}
                  className="font-serif text-[24px] font-medium leading-[1.2] text-ink hover:text-accent"
                >
                  {article.headline}
                </Link>
                {article.deck !== null ? (
                  <p className="mt-1.5 text-[14px] leading-[1.5] text-ink-secondary">{article.deck}</p>
                ) : null}
                <p className="type-data mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
                  <span>{article.byline}</span>
                  {article.publishedAt !== null ? (
                    <span>· {article.publishedAt.toISOString().slice(0, 10)}</span>
                  ) : null}
                  {article.channels.map((channel) => (
                    <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                      {channel}
                    </Tag>
                  ))}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
