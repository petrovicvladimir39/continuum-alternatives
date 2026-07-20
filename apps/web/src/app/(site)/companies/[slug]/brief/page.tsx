import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { BRIEF_MEMBER_MONTHLY_CAP, canGenerateBrief } from "@continuum/shared";
import {
  computeBriefDataVersion,
  db,
  entities,
  eq,
  getBrief,
  getMemberByClerkId,
  resolveMemberTier,
  type BriefContent,
} from "@continuum/db";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { generateBriefAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entity brief",
  robots: { index: false, follow: false },
};

/**
 * /companies/[slug]/brief (Phase 29D) — the print-clean brief page.
 * Founding-gated: free members and signed-out visitors get a quiet
 * explanation, never a popup. Cached views are free; regeneration appears
 * only when the underlying record has changed.
 */

const ERROR_COPY: Record<string, string> = {
  member_cap: `You have used your ${BRIEF_MEMBER_MONTHLY_CAP} fresh briefs this month — cached briefs stay free to view; the counter resets on the 1st.`,
  daily_budget:
    "The platform-wide brief budget for today is spent — try tomorrow. Cached briefs remain available.",
  no_material:
    "This entity has no approved timeline facts yet — a brief would be invention, so we refuse to write one.",
  dropped_guard:
    "The generated draft failed the mechanical guards (a number or name not present in the record) and was discarded. Nothing was published; you can try again.",
  dropped_parse: "The model returned an unusable draft; it was discarded. You can try again.",
  not_configured: "Brief generation is not configured on this deployment yet.",
  error: "Brief generation failed unexpectedly. Nothing was stored; you can try again.",
};

export default async function EntityBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug } = await params;
  const { e: errorCode } = await searchParams;
  const rows = await db
    .select({ id: entities.id, name: entities.name, kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.slug, slug));
  const entity = rows[0];
  if (entity === undefined || entity.kind !== "organization" || entity.status !== "active") {
    notFound();
  }

  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  let founding = false;
  if (clerkEnabled) {
    const { userId } = await auth();
    const member = userId === null ? null : await getMemberByClerkId(userId);
    founding = member !== null && canGenerateBrief(await resolveMemberTier(member.id));
  }

  if (!founding) {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">Entity brief</h1>
        <p className="mt-3 text-[14px] leading-[1.55] text-ink-secondary">
          Briefs — sourced, cited one-page summaries of an entity&apos;s record — are a
          founding-member feature. The underlying record on{" "}
          <Link href={`/companies/${slug}`} className="text-accent hover:underline">
            {entity.name}
          </Link>{" "}
          is public and stays that way.
        </p>
        <p className="mt-4 text-[13px]">
          <Link href="/pricing" className="text-accent hover:underline">
            About membership →
          </Link>
        </p>
      </div>
    );
  }

  const [brief, dataVersion] = await Promise.all([
    getBrief(entity.id),
    computeBriefDataVersion(entity.id),
  ]);
  const stale = brief !== null && brief.dataVersion !== dataVersion;
  const errorCopy = errorCode !== undefined ? ERROR_COPY[errorCode] : undefined;

  if (brief === null) {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">Entity brief</h1>
        <p className="mt-2 text-[14px] text-ink-secondary">
          No brief exists yet for{" "}
          <Link href={`/companies/${slug}`} className="text-accent hover:underline">
            {entity.name}
          </Link>
          .
        </p>
        {errorCopy !== undefined ? (
          <p className="mt-3 border border-line p-3 text-[13px] text-ink-secondary">{errorCopy}</p>
        ) : null}
        <form action={generateBriefAction} className="mt-5">
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit">Generate brief</Button>
          <p className="type-small mt-2 text-ink-muted">
            Written from approved facts and sources only; drafts failing the mechanical guards are
            discarded. {BRIEF_MEMBER_MONTHLY_CAP} fresh generations per month; cached views are
            free.
          </p>
        </form>
      </div>
    );
  }

  const content = brief.content as BriefContent;
  const generatedAt =
    brief.generatedAt === null ? "—" : brief.generatedAt.toISOString().replace("T", " ").slice(0, 16);

  return (
    <article className="max-w-2xl py-12">
      {/* Print-clean: site chrome disappears; the brief is the page. */}
      <style>{`@media print { header, footer, nav { display: none !important; } }`}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-label">Entity brief</p>
          <h1 className="type-h1 mt-1">{entity.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 print:hidden">
          <PrintButton />
          <Link href={`/companies/${slug}`} className="text-[13px] text-accent hover:underline">
            Profile →
          </Link>
        </div>
      </div>

      {errorCopy !== undefined ? (
        <p className="mt-4 border border-line p-3 text-[13px] text-ink-secondary print:hidden">
          {errorCopy}
        </p>
      ) : null}

      {stale ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-line p-3 print:hidden">
          <p className="text-[13px] text-ink-secondary">
            The record has changed since this brief was written.
          </p>
          <form action={generateBriefAction}>
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className="text-[13px] font-medium text-accent hover:underline">
              Regenerate
            </button>
          </form>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="type-h2">Summary</h2>
        <p className="mt-2 text-[14px] leading-[1.6] text-ink">{content.summary}</p>
      </section>

      <section className="mt-8">
        <h2 className="type-h2">Key facts</h2>
        <ul className="mt-2 space-y-2">
          {content.key_facts.map((fact) => (
            <li key={fact} className="flex gap-2 text-[13px] leading-[1.55] text-ink">
              <span aria-hidden className="text-ink-muted">
                —
              </span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </section>

      {content.relationships.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-h2">Relationships</h2>
          <ul className="mt-2 space-y-1.5">
            {content.relationships.map((line) => (
              <li key={line} className="text-[13px] leading-[1.55] text-ink">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.watch_points.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-h2">Watch points</h2>
          <ul className="mt-2 space-y-1.5">
            {content.watch_points.map((line) => (
              <li key={line} className="text-[13px] leading-[1.55] text-ink">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Citation footer + provenance line — part of the printed page. */}
      <footer className="mt-10 border-t border-line pt-4">
        <p className="type-small text-ink-muted">
          Sources: {content.source_names.length > 0 ? content.source_names.join(" · ") : "platform record"}
        </p>
        <p className="type-small mt-1 text-ink-muted">
          Generated {generatedAt} UTC by {brief.model} from approved platform records only ·
          numbers and names are machine-checked against the cited material ·
          continuumalternatives.com/companies/{slug}
        </p>
      </footer>
    </article>
  );
}
