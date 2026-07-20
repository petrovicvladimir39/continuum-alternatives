import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  memberReactionsFor,
  publishedArticleBySlug,
  reactionCountsFor,
  type Reaction,
} from "@continuum/db";
import { ArticleView } from "@/components/editorial/article-view";
import { DiscussionSection } from "@/components/discussion-section";
import { ReactionBand } from "@/components/reaction-band";
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

  // Phase 30A/C: reactions on the article + the anchored discussion thread.
  const backPath = `/news/${article.slug}`;
  const counts = (await reactionCountsFor("article", [article.id])).get(article.id) ?? {
    credible: 0,
    doubtful: 0,
    watching: 0,
  };
  let own: Reaction | null = null;
  let signedIn = false;
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (userId !== null) {
      const member = await getMemberByClerkId(userId);
      if (member !== null) {
        signedIn = true;
        own = (await memberReactionsFor(member.id, "article", [article.id])).get(article.id) ?? null;
      }
    }
  }

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
      <div className="mt-5 border-t border-line pt-3">
        <ReactionBand
          targetKind="article"
          targetId={article.id}
          backPath={backPath}
          counts={counts}
          own={own}
          signedIn={signedIn}
        />
      </div>
      {/* Discussion sits below the citation footer — the record first. */}
      <DiscussionSection anchorKind="article" anchorId={article.id} backPath={backPath} />
    </div>
  );
}
