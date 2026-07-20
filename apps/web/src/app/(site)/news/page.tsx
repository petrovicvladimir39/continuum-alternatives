import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedArticles } from "@continuum/db";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News",
  description:
    "The Continuum Desk — short, source-cited articles on European alternative assets, composed from the platform's approved record.",
};

export default async function NewsIndexPage() {
  const articles = await listPublishedArticles(60);

  return (
    <div className="max-w-3xl py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="type-h1">News</h1>
        <Link href="/feed" className="text-[13px] text-accent hover:underline">
          All signals →
        </Link>
      </div>
      <p className="mt-2 max-w-xl text-ink-secondary">
        Short articles from the Continuum Desk — every one composed from approved, source-cited
        facts and reviewed before publication.
      </p>
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
    </div>
  );
}
