import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  db,
  entities,
  eq,
  findIntroIntermediary,
  getMemberAffiliation,
  pathsToEntity,
  universeEntities,
  upsertMemberProfile,
  getMemberByClerkId,
} from "@continuum/db";
import { UniverseMap } from "@/components/map/universe-map";
import { Button } from "@/components/ui/button";
import { countryName } from "@/lib/public-labels";
import { sendIntroRequestAction } from "@/lib/universe-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your universe",
  robots: { index: false, follow: false },
};

const WARMTH_LABELS: Record<string, string> = {
  direct: "direct contact",
  two_hops: "2 hops",
  watched_only: "watched only",
};

const LAYER_LABELS: Record<string, string> = {
  firm: "my firm",
  contact: "contact's firm",
  event: "event org",
  watched: "watched",
};

/**
 * /universe (Phase 32C) — the record, re-centered on the member.
 *
 * PRIVACY LAW: everything on this page is derived from THIS member's own
 * data (affiliation, watchlist, private contacts, consented co-attendance)
 * and rendered server-side per-request. Private hops are marked "(your
 * contact)" and exist for the owner only.
 */
export default async function UniversePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; sort?: string; cr?: string }>;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound(); // middleware redirects first
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  const { focus, sort, cr } = await searchParams;

  const [universe, affiliation] = await Promise.all([
    universeEntities(member.id),
    getMemberAffiliation(member.id),
  ]);

  // Empty-universe starter — instructional, no theatrics.
  if (universe.length === 0) {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">Your universe</h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
          This page becomes the record centered on you. Three quiet steps build it:
        </p>
        <ol className="mt-4 space-y-3 text-[13px] leading-[1.55] text-ink-secondary">
          <li>
            1 ·{" "}
            <Link href="/account" className="text-accent hover:underline">
              Affiliate your firm
            </Link>{" "}
            — "This is my firm" on your account page.
          </li>
          <li>
            2 · Watch entities — the Watch button on any{" "}
            <Link href="/companies" className="text-accent hover:underline">
              company
            </Link>
            , fund, or deal.
          </li>
          <li>
            3 ·{" "}
            <Link href="/account" className="text-accent hover:underline">
              Import your contacts
            </Link>{" "}
            — your own LinkedIn export, stored privately, deletable in one click.
          </li>
        </ol>
      </div>
    );
  }

  // Focused entity: the right-panel card + warm path.
  const focusSlug = (focus ?? "").trim();
  let focusCard: {
    entityId: string;
    name: string;
    slug: string;
    kind: string;
    country: string | null;
    href: string | null;
  } | null = null;
  if (focusSlug !== "") {
    const rows = await db
      .select({
        id: entities.id,
        name: entities.name,
        slug: entities.slug,
        kind: entities.kind,
        country: entities.country,
        status: entities.status,
      })
      .from(entities)
      .where(eq(entities.slug, focusSlug));
    const row = rows[0];
    if (row !== undefined && row.status === "active") {
      focusCard = {
        entityId: row.id,
        name: row.name,
        slug: row.slug,
        kind: row.kind,
        country: row.country,
        href: universe.find((item) => item.entityId === row.id)?.href ?? null,
      };
    }
  }
  const paths = focusCard !== null ? await pathsToEntity(member.id, focusCard.entityId) : [];
  const warmest = paths[0] ?? null;
  // Intro affordance (32D): only when the warmest path's FIRST hop org has
  // an eligible member intermediary — else just the org name, no affordance.
  let intro: { memberName: string; viaOrgEntityId: string; viaOrgName: string } | null = null;
  if (warmest !== null && warmest.segments.length > 0 && focusCard !== null) {
    const firstHopName = warmest.segments[0]!.nodeName;
    const firstHopEntity = universe.find((item) => item.name === firstHopName);
    const firstHopId =
      firstHopEntity?.entityId ??
      (affiliation !== null && affiliation.name === firstHopName ? affiliation.entityId : null);
    if (firstHopId !== null && firstHopId !== focusCard.entityId) {
      const intermediary = await findIntroIntermediary(firstHopId, member.id);
      if (intermediary !== null) {
        intro = {
          memberName: intermediary.displayName,
          viaOrgEntityId: firstHopId,
          viaOrgName: firstHopName,
        };
      }
    }
  }

  // List view, sortable.
  const sortKey = sort === "name" ? "name" : "warmth";
  const warmthRank = { direct: 0, two_hops: 1, watched_only: 2 } as const;
  const listed = [...universe].sort((a, b) =>
    sortKey === "name"
      ? a.name.localeCompare(b.name)
      : warmthRank[a.warmth] - warmthRank[b.warmth] || a.name.localeCompare(b.name),
  );

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-h1">Your universe</h1>
        <p className="type-small text-ink-muted">
          Private to you — contacts and paths are never shown to anyone else.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <div className="min-w-0 flex-1">
          <UniverseMap
            markers={universe.map((item) => ({
              entityId: item.entityId,
              slug: item.slug,
              name: item.name,
              layer: item.layer,
              lat: item.lat,
              lng: item.lng,
            }))}
            focusSlug={focusSlug === "" ? null : focusSlug}
          />
        </div>

        <aside className="w-[320px] shrink-0">
          {focusCard === null ? (
            <p className="border border-line p-4 text-[13px] text-ink-muted">
              Click a dot — or a row below — to see the entity and your warmest path to it.
            </p>
          ) : (
            <div className="border border-line p-4">
              <p className="type-label">{LAYER_LABELS[universe.find((item) => item.entityId === focusCard!.entityId)?.layer ?? ""] ?? focusCard.kind}</p>
              <h2 className="type-h2 mt-1">{focusCard.name}</h2>
              <p className="type-small mt-0.5 text-ink-muted">
                {countryName(focusCard.country) ?? "—"}
              </p>
              {focusCard.href !== null ? (
                <p className="mt-2 text-[13px]">
                  <Link href={focusCard.href} className="text-accent hover:underline">
                    Full profile →
                  </Link>
                </p>
              ) : null}

              <h3 className="type-label mt-5">Path</h3>
              {warmest === null ? (
                <p className="mt-1.5 text-[13px] text-ink-muted">No warm path on record.</p>
              ) : (
                <div className="mt-1.5 text-[13px] leading-[1.6] text-ink">
                  <span className="font-medium">You</span>
                  {warmest.segments.map((segment, index) => (
                    <span key={index}>
                      {" → "}
                      <span className="font-medium">{segment.nodeName}</span>
                      <span className="text-ink-secondary">
                        {" — "}
                        {segment.viaLabel}
                        {segment.isPrivate ? (
                          <span className="text-ink-muted"> (your contact)</span>
                        ) : null}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {cr === "limit" ? (
                <p className="mt-2 text-[12px] text-ink-secondary">
                  Request limit reached — 5 per day, shared with event contact requests.
                </p>
              ) : null}
              {intro !== null ? (
                <form action={sendIntroRequestAction} className="mt-4 border-t border-line pt-3">
                  <p className="text-[13px] text-ink-secondary">
                    Ask <span className="font-medium">{intro.memberName}</span> ({intro.viaOrgName})
                    for an intro toward {focusCard.name}.
                  </p>
                  <input type="hidden" name="viaOrgEntityId" value={intro.viaOrgEntityId} />
                  <input type="hidden" name="targetEntityId" value={focusCard.entityId} />
                  <input type="hidden" name="backPath" value={`/universe?focus=${focusCard.slug}`} />
                  <input
                    name="note"
                    maxLength={280}
                    placeholder="What you're asking (280 chars)"
                    className="mt-2 w-full border border-line bg-surface px-2 py-1 text-[12px] outline-none focus:border-line-strong"
                  />
                  <Button type="submit" variant="ghost" className="mt-2">
                    Request intro
                  </Button>
                  <p className="type-small mt-1 text-ink-muted">
                    They see your name, the target, and your note — never your contact list.
                  </p>
                </form>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      <section className="mt-8">
        <div className="flex items-baseline gap-4">
          <h2 className="type-h2">Everything in your universe</h2>
          <span className="type-small text-ink-muted">
            sort:{" "}
            <Link
              href="/universe?sort=warmth"
              className={sortKey === "warmth" ? "font-medium text-ink" : "text-accent hover:underline"}
            >
              warmth
            </Link>
            {" · "}
            <Link
              href="/universe?sort=name"
              className={sortKey === "name" ? "font-medium text-ink" : "text-accent hover:underline"}
            >
              name
            </Link>
          </span>
        </div>
        <div className="mt-2">
          {listed.map((item) => (
            <div key={item.entityId} className="flex flex-wrap items-baseline gap-x-4 border-t border-line py-2 text-[13px]">
              <Link href={`/universe?focus=${item.slug}`} className="min-w-[220px] font-medium hover:text-accent">
                {item.name}
              </Link>
              <span className="type-small w-[110px] text-ink-muted">{LAYER_LABELS[item.layer]}</span>
              <span className="type-small text-ink-secondary">{WARMTH_LABELS[item.warmth]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
