import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedArticleBySlug } from "@continuum/db";
import { ArticleView } from "@/components/editorial/article-view";
import { TrackView } from "@/components/track-view";
import { SITE_ORIGIN } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

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
  const { article } = detail;

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
      <p className="mb-4 text-[13px]">
        <Link href="/news" className="text-accent hover:underline">
          ← News
        </Link>
      </p>
      <ArticleView detail={detail} />
    </div>
  );
}
