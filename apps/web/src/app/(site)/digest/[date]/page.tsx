import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, db, digests, eq } from "@continuum/db";
import { loadDigestSections } from "@continuum/pipeline";
import { Tag } from "@/components/ui/tag";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  distressed: "Distressed",
  private_credit: "Private Credit",
  vc_founders: "VC & Founders",
  pe: "Private Equity",
  lp_institutional: "LPs & Institutions",
  vendors: "Vendors & Mandates",
};

async function loadSentDigest(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  const rows = await db
    .select()
    .from(digests)
    .where(and(eq(digests.digestDate, date), eq(digests.status, "sent")));
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const digest = await loadSentDigest(date);
  if (!digest) {
    return { title: "Digest" };
  }
  const sections = await loadDigestSections(digest.id);
  const topTitles = sections
    .flatMap((section) => section.items.slice(0, 2))
    .slice(0, 3)
    .map((item) => item.title)
    .join(" · ");
  return {
    title: digest.subject ?? `Continuum Brief — ${date}`,
    description: topTitles === "" ? "European alternative-asset events." : topTitles,
  };
}

export default async function DigestIssuePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  // Draft/approved digests 404 publicly — only sent issues are public.
  const digest = await loadSentDigest(date);
  if (!digest) {
    notFound();
  }
  const sections = await loadDigestSections(digest.id);

  return (
    <div className="py-12">
      <h1 className="type-h1">{digest.subject ?? `Continuum Brief — ${date}`}</h1>
      <p className="mt-2 text-ink-secondary">
        European alternative-asset events, from primary sources.
      </p>
      <div className="mt-8 max-w-2xl">
        {sections.map((section) => (
          <section key={section.channel} className="border-t border-line py-6">
            <div className="mb-4 flex items-baseline gap-2">
              <h2 className="type-h2">{CHANNEL_LABELS[section.channel] ?? section.channel}</h2>
              <Tag>{section.channel}</Tag>
            </div>
            <div className="space-y-5">
              {section.items.map((item) => (
                <article key={item.factId} id={`item-${item.factId}`}>
                  <h3 className="type-h3">{item.title}</h3>
                  <p className="type-data mt-1 text-ink-muted">
                    {/* Entity names render as plain text — public entity pages are Phase 14. */}
                    {item.entityName} · {item.occurredOn}
                    {item.sourceName ? ` · ${item.sourceName}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
