import type { MetadataRoute } from "next";
import { sitemapChunkPlan } from "@continuum/shared";
import {
  countPublicByKind,
  db,
  desc,
  digests,
  eq,
  listArticleUrls,
  listPublicUrlsPage,
} from "@continuum/db";

const ORIGIN = "https://continuumalternatives.com";
const CHUNK_SIZE = 1000;

/**
 * Chunked sitemap (Phase 23B) — the corpus is 10k+ entities, so Next's
 * generateSitemaps splits it: chunk 0 carries the core surfaces (static
 * pages, news articles, digest issues, reports), chunks 1..n carry ≤1,000
 * entity URLs each in stable slug order. robots.ts lists every chunk URL.
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const counts = await countPublicByKind();
  return sitemapChunkPlan(counts, CHUNK_SIZE).map((chunk) => ({ id: chunk.id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const counts = await countPublicByKind();
  const plan = sitemapChunkPlan(counts, CHUNK_SIZE);
  const chunk = plan.find((c) => c.id === Number(id));
  if (chunk === undefined) {
    return [];
  }

  if (chunk.kind === "core") {
    const [sent, articleUrls] = await Promise.all([
      db
        .select({ digestDate: digests.digestDate, sentAt: digests.sentAt })
        .from(digests)
        .where(eq(digests.status, "sent"))
        .orderBy(desc(digests.digestDate)),
      listArticleUrls(),
    ]);
    return [
      { url: ORIGIN },
      { url: `${ORIGIN}/news` },
      // Market fronts + solutions join prominently (Phase 25).
      { url: `${ORIGIN}/markets/private-equity` },
      { url: `${ORIGIN}/markets/venture-capital` },
      { url: `${ORIGIN}/markets/private-credit` },
      { url: `${ORIGIN}/markets/distressed` },
      { url: `${ORIGIN}/markets/lps-institutions` },
      { url: `${ORIGIN}/markets/service-providers` },
      { url: `${ORIGIN}/solutions/investors` },
      { url: `${ORIGIN}/solutions/lenders-servicers` },
      { url: `${ORIGIN}/solutions/advisors` },
      { url: `${ORIGIN}/solutions/founders` },
      { url: `${ORIGIN}/solutions/institutions` },
      { url: `${ORIGIN}/ecosystem` },
      { url: `${ORIGIN}/methodology` },
      { url: `${ORIGIN}/subscribe` },
      { url: `${ORIGIN}/digest` },
      { url: `${ORIGIN}/search` },
      { url: `${ORIGIN}/companies` },
      { url: `${ORIGIN}/funds` },
      { url: `${ORIGIN}/deals` },
      { url: `${ORIGIN}/reports` },
      { url: `${ORIGIN}/reports/serbian-insolvency-monitor-q3-2026` },
      ...articleUrls.map((article) => ({
        url: `${ORIGIN}/news/${article.slug}`,
        ...(article.publishedAt !== null ? { lastModified: article.publishedAt } : {}),
      })),
      ...sent.map((digest) => ({
        url: `${ORIGIN}/digest/${String(digest.digestDate)}`,
        ...(digest.sentAt !== null ? { lastModified: digest.sentAt } : {}),
      })),
    ];
  }

  const entries = await listPublicUrlsPage(chunk.kind, chunk.offset, CHUNK_SIZE);
  return entries.map((entry) => ({
    url: `${ORIGIN}${entry.path}`,
    ...(entry.updatedAt !== null ? { lastModified: entry.updatedAt } : {}),
  }));
}
