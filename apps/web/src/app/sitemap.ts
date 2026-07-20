import type { MetadataRoute } from "next";
import { db, desc, digests, eq } from "@continuum/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sent = await db
    .select({ digestDate: digests.digestDate, sentAt: digests.sentAt })
    .from(digests)
    .where(eq(digests.status, "sent"))
    .orderBy(desc(digests.digestDate));

  return [
    { url: "https://continuumalternatives.com" },
    { url: "https://continuumalternatives.com/digest" },
    ...sent.map((digest) => ({
      url: `https://continuumalternatives.com/digest/${String(digest.digestDate)}`,
      ...(digest.sentAt !== null ? { lastModified: digest.sentAt } : {}),
    })),
  ];
}
