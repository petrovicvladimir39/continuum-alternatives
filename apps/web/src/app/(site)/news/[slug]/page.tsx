import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedArticleBySlug } from "@continuum/db";
import { EntityLogo } from "@/components/ui/entity-logo";
import { SubscribeBlock } from "@/components/subscribe-block";
import { TrackView } from "@/components/track-view";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, SITE_ORIGIN, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

function entityPath(kind: string, slug: string): string {
  const base = kind === "organization" ? "companies" : kind === "fund_vehicle" ? "funds" : "deals";
  return `/${base}/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await publishedArticleBySlug(slug);
  if (detail === null) {
    return { title: "News" };
  }
  return {
    title: detail.article.headline,
    description: detail.article.deck ?? detail.article.headline,
    alternates: { canonical: `${SITE_ORIGIN}/news/${slug}` },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await publishedArticleBySlug(slug);
  if (detail === null) {
    notFound();
  }
  const { article, entity, citations } = detail;
  const publishedOn = article.publishedAt?.toISOString().slice(0, 10) ?? null;
  const paragraphs = article.bodyMd
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    ...(article.deck !== null ? { description: article.deck } : {}),
    ...(article.publishedAt !== null ? { datePublished: article.publishedAt.toISOString() } : {}),
    author: { "@type": "Organization", name: article.byline },
    publisher: { "@type": "Organization", name: "Continuum Alternatives" },
    mainEntityOfPage: `${SITE_ORIGIN}/news/${article.slug}`,
  };

  return (
    <div className="max-w-3xl py-10">
      <TrackView event="article_read" props={{ slug: article.slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-[13px]">
        <Link href="/news" className="text-accent hover:underline">
          ← News
        </Link>
      </p>
      <h1 className="mt-4 font-serif text-[34px] font-medium leading-[1.15] text-ink">
        {article.headline}
      </h1>
      {article.deck !== null ? (
        <p className="mt-3 text-[16px] leading-[1.5] text-ink-secondary">{article.deck}</p>
      ) : null}
      <p className="type-data mt-3 flex flex-wrap items-center gap-2 border-b border-line pb-4 text-ink-muted">
        <span>{article.byline}</span>
        {publishedOn !== null ? <span>· {publishedOn}</span> : null}
        {article.channels.map((channel) => (
          <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
            {channel}
          </Tag>
        ))}
      </p>

      <div className="mt-6 flex flex-wrap gap-8">
        <div className="min-w-0 max-w-[68ch] flex-1">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="mb-4 text-[15px] leading-[1.65] text-ink">
              {paragraph}
            </p>
          ))}
        </div>
        {entity !== null ? (
          <aside className="w-[220px] shrink-0">
            <Link
              href={entityPath(entity.kind, entity.slug)}
              className="block border border-line p-4 hover:border-line-strong"
            >
              <EntityLogo name={entity.name} logoUrl={entity.logoUrl} size="md" />
              <p className="mt-2.5 text-[14px] font-medium leading-snug">{entity.name}</p>
              {entity.country !== null ? (
                <p className="type-small mt-0.5 text-ink-muted">{countryName(entity.country)}</p>
              ) : null}
              <p className="type-small mt-2 text-accent">Full profile →</p>
            </Link>
          </aside>
        ) : null}
      </div>

      <div className="mt-8 max-w-xl">
        <SubscribeBlock compact />
      </div>

      {citations.length > 0 ? (
        <footer className="mt-8 border-t border-line pt-4">
          <p className="type-label mb-2">Sources</p>
          <ol className="space-y-1.5">
            {citations.map((citation, index) => (
              <li key={citation.factId} className="type-small text-ink-secondary">
                {index + 1}. {citation.factTitle} · {citation.occurredOn}
                {citation.sourceName !== null ? ` · ${citation.sourceName}` : ""}
                {citation.documentUrl !== null ? (
                  <>
                    {" · "}
                    <a
                      href={citation.documentUrl}
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {citation.documentUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </footer>
      ) : null}
    </div>
  );
}
