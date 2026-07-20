import type { MetadataRoute } from "next";
import { sitemapChunkPlan } from "@continuum/shared";
import { countPublicByKind } from "@continuum/db";

const ORIGIN = "https://continuumalternatives.com";

/**
 * Robots (Phase 23B): admin + API + CSV export surfaces excluded; the
 * chunked sitemap files are all listed here (Next emits /sitemap/[id].xml
 * per generateSitemaps id — robots is their index).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const counts = await countPublicByKind();
  const plan = sitemapChunkPlan(counts);
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/universe/export", "/api/", "/confirm/", "/unsubscribe/"],
    },
    sitemap: plan.map((chunk) => `${ORIGIN}/sitemap/${chunk.id}.xml`),
  };
}
