import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MOCK_ARTICLES,
  MOCK_ARTICLE_BY_SLUG,
  MOCK_ENTITY_BY_SLUG,
  mockFeedPage,
  mockImage,
} from "@continuum/shared";
import { EntityHoverCard } from "@/components/v2/entity-hover-card";
import { fmtDate } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * /v2/news/[slug] — the tear sheet: verbatim quotes in a sticky citation
 * rail, class rule, inline entity hover-cards, related-signals strip.
 */

export function generateStaticParams() {
  return MOCK_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = MOCK_ARTICLE_BY_SLUG.get(slug);
  return { title: article === undefined ? "News" : article.headline };
}

export default async function TearSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = MOCK_ARTICLE_BY_SLUG.get(slug);
  if (article === undefined) {
    notFound();
  }
  const cls = v2ClassFor(article.assetClass);
  const accent = v2Accent(article.assetClass, article.strategySlug);

  const relatedEntities = article.relatedEntitySlugs
    .map((s) => MOCK_ENTITY_BY_SLUG.get(s))
    .filter((e) => e !== undefined);

  // Related signals: recent facts from the article's entities, then class.
  const all = mockFeedPage({ pageSize: 400 }).items;
  const bySlug = new Set(article.relatedEntitySlugs);
  const related = [
    ...all.filter((i) => bySlug.has(i.entitySlug)),
    ...all.filter((i) => !bySlug.has(i.entitySlug) && i.entityAssetClass === article.assetClass),
  ].slice(0, 6);

  return (
    <article className="mx-auto w-full max-w-[1100px] px-4 py-8">
      {/* Class rule + kicker */}
      <div className={`${accent?.top ?? ""} pt-3`}>
        <div className="flex items-baseline justify-between gap-4">
          <span className={`type-label ${accent?.text ?? "text-ink-muted"}`}>
            {cls?.label ?? "Cross-asset"}
            {article.strategySlug !== null ? ` · ${article.strategySlug.replace(/_/g, " ")}` : ""}
          </span>
          <span className="type-data text-ink-muted">
            {fmtDate(article.publishedOn)} · {article.readMinutes} min read
          </span>
        </div>
        <h1 className="type-display mt-3 max-w-[820px]">{article.headline}</h1>
        <p className="type-h3 mt-3 max-w-[720px] font-normal text-ink-secondary">{article.deck}</p>
        <div className="type-small mt-3 text-ink-muted">
          By {article.byline} · Continuum Alternatives
        </div>
      </div>

      {/* Hero — seeded placeholder; source OG image or typographic cover at cutover. */}
      <img
        src={mockImage(article.imageSeed, 1600, 640)}
        alt=""
        width={1100}
        height={440}
        className="mt-6 aspect-[5/2] w-full border border-line object-cover"
      />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,68fr)_32fr]">
        {/* Body */}
        <div className="max-w-[680px]">
          {article.body.map((para, i) => (
            <p key={i} className="type-body mb-5 text-[15px] leading-[1.65]">
              {para}
            </p>
          ))}

          <div className="mt-8 border-t border-line pt-4">
            <div className="type-label mb-2">Related entities</div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {relatedEntities.map((e) => (
                <span key={e.id} className="type-body">
                  <EntityHoverCard slug={e.slug} />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky citation rail */}
        <aside>
          <div className="sticky top-14">
            <div className="type-label border-b border-line pb-2">Citations</div>
            <ol className="mt-3 space-y-4">
              {article.citations.map((c, i) => (
                <li key={i} className="border-l-2 border-line pl-3">
                  <blockquote className="type-small italic text-ink-secondary">
                    “{c.quote}”
                  </blockquote>
                  <div className="type-mono mt-1 text-ink-muted">
                    {c.url !== null ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-ink">
                        {c.source.toUpperCase()}
                      </a>
                    ) : (
                      c.source.toUpperCase()
                    )}{" "}
                    · [{i + 1}]
                  </div>
                </li>
              ))}
            </ol>
            <div className="type-mono mt-6 border border-line px-3 py-2 text-ink-muted">
              PROVENANCE-FIRST: EVERY CLAIM TRACES TO A SOURCE. CORRECTIONS ARE NEW FACTS, NEVER
              SILENT EDITS.
            </div>
          </div>
        </aside>
      </div>

      {/* Related signals strip */}
      <section className="mt-12">
        <div className="type-label border-b border-line pb-2">Related signals</div>
        <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => {
            const itemAccent = v2Accent(item.entityAssetClass, item.entityStrategySlug);
            return (
              <div key={item.id} className={`bg-surface p-3 ${itemAccent?.left ?? ""}`}>
                <div className="type-small font-medium">{item.title}</div>
                <div className="type-data mt-1 text-ink-muted">
                  {item.entityName} · {fmtDate(item.occurredOn)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-10">
        <Link href="/v2/news" className="type-label text-ink-secondary transition-colors hover:text-ink">
          ← Back to News
        </Link>
      </div>
    </article>
  );
}
