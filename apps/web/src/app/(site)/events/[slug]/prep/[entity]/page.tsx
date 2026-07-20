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
  eventBySlug,
  getBrief,
  getMemberByClerkId,
  publicPathFor,
  resolveMemberTier,
  type EntityKind,
} from "@continuum/db";
import { BriefView } from "@/components/brief-view";
import { Button } from "@/components/ui/button";
import { generatePrepBriefAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meeting prep brief",
  robots: { index: false, follow: false },
};

const ERROR_COPY: Record<string, string> = {
  member_cap: `You have used your ${BRIEF_MEMBER_MONTHLY_CAP} fresh briefs this month — the allowance is shared between company briefs and meeting prep. Cached briefs stay free; the counter resets on the 1st.`,
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

/**
 * /events/[slug]/prep/[entity] (Phase 31D) — the Phase 29 brief, framed for
 * the meeting: same composer, guards, cache, and shared monthly cap; the
 * ONLY addition is the "Prepared for {event}, {date}" header line.
 */
export default async function PrepBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; entity: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug, entity: entitySlug } = await params;
  const { e: errorCode } = await searchParams;
  const event = await eventBySlug(slug);
  if (event === null) {
    notFound();
  }
  const rows = await db
    .select({ id: entities.id, name: entities.name, kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.slug, entitySlug));
  const entity = rows[0];
  if (
    entity === undefined ||
    entity.status !== "active" ||
    !["organization", "fund_vehicle", "deal"].includes(entity.kind)
  ) {
    notFound();
  }

  let founding = false;
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    const member = userId === null ? null : await getMemberByClerkId(userId);
    founding = member !== null && canGenerateBrief(await resolveMemberTier(member.id));
  }
  if (!founding) {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">Meeting prep</h1>
        <p className="mt-3 text-[14px] text-ink-secondary">
          Prep briefs are a founding-member feature.{" "}
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
  const headerLine = `Prepared for ${event.name}, ${event.startsOn}${event.expected ? " (dates expected)" : ""}`;
  const profileHref = publicPathFor(entity.kind as EntityKind, entitySlug) ?? `/companies/${entitySlug}`;

  return (
    <div className="max-w-2xl py-12">
      <p className="mb-4 text-[13px] print:hidden">
        <Link href={`/events/${slug}/prep`} className="text-accent hover:underline">
          ← Meeting prep
        </Link>
      </p>

      {errorCopy !== undefined ? (
        <p className="mb-4 border border-line p-3 text-[13px] text-ink-secondary print:hidden">
          {errorCopy}
        </p>
      ) : null}

      {brief === null ? (
        <div>
          <h1 className="type-h1">{entity.name}</h1>
          <p className="mt-2 text-[14px] text-ink-secondary">
            No brief exists yet for this entity.
          </p>
          <form action={generatePrepBriefAction} className="mt-5">
            <input type="hidden" name="eventSlug" value={slug} />
            <input type="hidden" name="entitySlug" value={entitySlug} />
            <Button type="submit">Generate prep brief</Button>
            <p className="type-small mt-2 text-ink-muted">
              Approved facts and sources only; guarded drafts are discarded. Shares your{" "}
              {BRIEF_MEMBER_MONTHLY_CAP}/month brief allowance; cached views are free.
            </p>
          </form>
        </div>
      ) : (
        <>
          {stale ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 border border-line p-3 print:hidden">
              <p className="text-[13px] text-ink-secondary">
                The record has changed since this brief was written.
              </p>
              <form action={generatePrepBriefAction}>
                <input type="hidden" name="eventSlug" value={slug} />
                <input type="hidden" name="entitySlug" value={entitySlug} />
                <button type="submit" className="text-[13px] font-medium text-accent hover:underline">
                  Regenerate
                </button>
              </form>
            </div>
          ) : null}
          <BriefView
            entityName={entity.name}
            brief={brief}
            headerLine={headerLine}
            profileHref={profileHref}
          />
        </>
      )}
    </div>
  );
}
