import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { canGenerateBrief } from "@continuum/shared";
import {
  eventBySlug,
  getMemberByClerkId,
  resolveMemberTier,
  resolveOrganizationByName,
  searchPublic,
  visibleAttendees,
} from "@continuum/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meeting prep",
  robots: { index: false, follow: false },
};

/**
 * /events/[slug]/prep (Phase 31D) — founding-gated. Two ways in: the
 * visible attendee list's stated organizations (resolved to the corpus by
 * deterministic name match — unmatched shows an honest "no record"), or a
 * search over the record. ORGANIZATIONS ONLY — never people, never members.
 */
export default async function PrepIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const event = await eventBySlug(slug);
  if (event === null) {
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
        <p className="mt-3 text-[14px] leading-[1.55] text-ink-secondary">
          Prep briefs — cited one-page summaries of the organizations you expect to meet — are a
          founding-member feature.
        </p>
        <p className="mt-4 text-[13px]">
          <Link href="/pricing" className="text-accent hover:underline">
            About membership →
          </Link>
        </p>
      </div>
    );
  }

  const attendees = await visibleAttendees(event.entityId);
  const withOrgs = attendees.filter(
    (attendee) => attendee.organization !== null && attendee.organization !== "",
  );
  const resolved = await Promise.all(
    withOrgs.map(async (attendee) => ({
      attendee,
      match: await resolveOrganizationByName(attendee.organization!),
    })),
  );

  const query = (q ?? "").trim();
  // searchPublic: active + publicly routable only; events/person never surface.
  const searchHits =
    query === ""
      ? []
      : (await searchPublic(query))
          .filter((hit) => ["organization", "fund_vehicle", "deal"].includes(hit.kind))
          .slice(0, 12);

  return (
    <div className="max-w-2xl py-12">
      <p className="mb-4 text-[13px]">
        <Link href={`/events/${slug}`} className="text-accent hover:underline">
          ← {event.name}
        </Link>
      </p>
      <h1 className="type-h1">Meeting prep</h1>
      <p className="mt-2 max-w-xl text-[13px] text-ink-secondary">
        Briefs draw on approved facts, relationships, and sources — organizations on the record
        only, never people. Fresh generations share your monthly brief allowance.
      </p>

      <h2 className="type-h2 mt-8">From the attendee list</h2>
      {withOrgs.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          No visible attendees have stated an organization yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {resolved.map(({ attendee, match }) => (
            <li key={attendee.memberId} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
              <span className="font-medium">{attendee.organization}</span>
              <span className="type-small text-ink-muted">({attendee.name})</span>
              {match !== null ? (
                <Link
                  href={`/events/${slug}/prep/${match.slug}`}
                  className="text-accent hover:underline"
                >
                  Prep brief →
                </Link>
              ) : (
                <span className="type-small text-ink-muted">no record on Continuum</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="type-h2 mt-8">Any entity on the record</h2>
      <form action={`/events/${slug}/prep`} method="get" className="mt-3 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search companies, funds, deals…"
          className="min-w-[240px] flex-1 border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-line-strong"
        />
        <button
          type="submit"
          className="rounded-sm border border-line-strong bg-surface px-4 py-1.5 text-[13px] font-medium hover:border-accent hover:text-accent"
        >
          Search
        </button>
      </form>
      {query !== "" ? (
        searchHits.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">No record on Continuum for “{query}”.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {searchHits.map((hit) => (
              <li key={hit.id} className="text-[13px]">
                <Link href={`/events/${slug}/prep/${hit.slug}`} className="text-accent hover:underline">
                  {hit.name}
                </Link>
                <span className="type-small text-ink-muted"> · {hit.kind.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
