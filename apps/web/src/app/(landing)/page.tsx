import { MOCK_ARTICLES, mockFeedPage, mockImage } from "@continuum/shared";
import { LandingHero, type WireItem } from "@/components/landing/hero";
import { LandingJournal, type JournalPost } from "@/components/landing/journal";
import { LandingFeatures } from "@/components/landing/features";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingCta } from "@/components/landing/cta";

/**
 * "/" — the Aceternity landing (2026-08-03 cutover). Runs entirely on the
 * MOCK DATA design-scaffolding layer (fictional entities); the product it
 * fronts is the /v2 terminal. No database access on this page.
 */

export const dynamic = "force-dynamic";

/** Upbeat deal flow only — the landing sells coverage, not distress. */
const LANDING_FACT_TYPES = [
  "fund_close",
  "funding_round",
  "acquisition",
  "exit",
  "hf_launch",
  "mandate",
  "climate_issue",
  "digital_issue",
];

function timeAgoShort(recordedAt: string, now: Date): string {
  const ms = now.getTime() - new Date(recordedAt).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  const now = new Date();
  const { items } = mockFeedPage({ factTypes: LANDING_FACT_TYPES, pageSize: 12 });
  const wire: WireItem[] = items.map((item) => ({
    id: item.id,
    when: timeAgoShort(item.recordedAt, now),
    title: item.title,
    meta: [item.entityName, item.entityCountry].filter(Boolean).join(" · "),
  }));

  // News section: latest mock editorial pieces, cover story first.
  const posts: JournalPost[] = [...MOCK_ARTICLES]
    .sort((a, b) => (a.publishedOn < b.publishedOn ? 1 : -1))
    .slice(0, 13)
    .map((article) => ({
      title: article.headline,
      description: article.deck,
      date: article.publishedOn,
      slug: article.slug,
      image: mockImage(article.imageSeed, 1280, 640),
      author: article.byline,
      readMinutes: article.readMinutes,
    }));

  return (
    <>
      <LandingHero items={wire.slice(0, 7)} />
      <LandingJournal posts={posts} />
      <LandingFeatures items={wire.slice(7, 12)} />
      <LandingPricing />
      <LandingCta />
    </>
  );
}
