import type { MetadataRoute } from "next";
import { db, desc, digests, eq, listPublicUrls } from "@continuum/db";

const ORIGIN = "https://continuumalternatives.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sent = await db
    .select({ digestDate: digests.digestDate, sentAt: digests.sentAt })
    .from(digests)
    .where(eq(digests.status, "sent"))
    .orderBy(desc(digests.digestDate));

  // Every active public entity, grouped per kind by listPublicUrls ordering
  // (companies, then deals, then funds). Next.js emits a single sitemap file,
  // which is fine up to the protocol's 50k-URL cap; revisit with
  // generateSitemaps() chunking if the entity count approaches that.
  const entityUrls = await listPublicUrls();

  return [
    { url: ORIGIN },
    { url: `${ORIGIN}/digest` },
    { url: `${ORIGIN}/search` },
    { url: `${ORIGIN}/companies` },
    { url: `${ORIGIN}/funds` },
    { url: `${ORIGIN}/deals` },
    ...sent.map((digest) => ({
      url: `${ORIGIN}/digest/${String(digest.digestDate)}`,
      ...(digest.sentAt !== null ? { lastModified: digest.sentAt } : {}),
    })),
    ...entityUrls.map((entry) => ({
      url: `${ORIGIN}${entry.path}`,
      ...(entry.updatedAt !== null ? { lastModified: entry.updatedAt } : {}),
    })),
  ];
}
