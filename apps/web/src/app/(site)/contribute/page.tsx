import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { findEntities, getMemberByClerkId, memberScoutStats, upsertMemberProfile } from "@continuum/db";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { SCOUT_FACT_TYPES, SCOUTS_PER_DAY } from "@/lib/scout-config";
import { submitScoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contribute a signal",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  banned: "Posting from this account is currently suspended.",
  type: "Pick a signal type.",
  date: "The date must be a real past date.",
  url: "A working source URL is required — no source, no signal.",
  entities: "Name at least one entity (pick from matches or describe in free text).",
  limit: `${SCOUTS_PER_DAY} submissions per day — the limit resets at midnight UTC.`,
};

/**
 * /contribute (Phase 34E) — scout submissions. Structured, sourced,
 * review-gated: nothing a member submits touches the record until the
 * operator approves it, and then it publishes as a normally-cited fact
 * with an optional credit line. No rewards system v1 (comment in the
 * action: incentives after volume exists).
 */
export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; submitted?: string; error?: string }>;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound();
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const matches = query.length >= 2 ? (await findEntities(query)).slice(0, 8) : [];
  const stats = await memberScoutStats(member.id);

  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">Contribute a signal</h1>
      <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
        Saw something the record missed — a filing, a sale, a mandate? Submit it with its source.
        The operator reviews every submission; approved signals publish as cited facts
        {stats.approved > 0 ? (
          <> — you have {stats.approved} on the record</>
        ) : null}
        .
      </p>
      {params.submitted !== undefined ? (
        <p className="mt-4 border border-line p-3 text-[13px] text-ink">
          Received — it&apos;s in the review queue. Thank you.
        </p>
      ) : null}
      {params.error !== undefined ? (
        <p className="mt-4 text-[13px] text-distressed">{ERRORS[params.error] ?? "Check the form."}</p>
      ) : null}

      {/* Entity picker: plain GET search, then checkboxes into the main form. */}
      <form action="/contribute" method="get" className="mt-6 flex items-end gap-2">
        <div className="min-w-[220px]">
          <label className={labelClass} htmlFor="scout-q">
            Find the entities involved
          </label>
          <input id="scout-q" name="q" defaultValue={query} placeholder="Company / fund name…" className={inputClass} />
        </div>
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      <form action={submitScoutAction} className="mt-4 space-y-4 border-t border-line pt-4">
        {matches.length > 0 ? (
          <fieldset>
            <legend className={labelClass}>Matches for “{query}”</legend>
            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {matches.map((hit) => (
                <label key={hit.id} className="flex items-baseline gap-1.5 text-[13px]">
                  <input type="checkbox" name="entityIds" value={hit.id} className="translate-y-[1px]" />
                  {hit.name}
                  <span className="type-small text-ink-muted">{hit.kind}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : query.length >= 2 ? (
          <p className="type-small text-ink-muted">No matches — describe the entities below.</p>
        ) : null}

        <label className="block">
          <span className={labelClass}>Entities (free text, if not found above)</span>
          <input name="entitiesFree" maxLength={300} placeholder="e.g. Novi Sad Retail d.o.o." className={inputClass} />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className={labelClass}>Signal type</span>
            <select name="factType" className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
              {SCOUT_FACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Date</span>
            <input type="date" name="occurredOn" className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Source URL (required)</span>
          <input name="sourceUrl" placeholder="https://…" className={inputClass} />
        </label>

        <label className="block">
          <span className={labelClass}>Note (what happened, in a sentence or two)</span>
          <textarea
            name="note"
            rows={3}
            maxLength={1200}
            className="mt-1 w-full border border-line bg-surface px-2.5 py-2 text-[13px] leading-[1.55] outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex items-baseline gap-1.5 text-[13px]">
          <input type="checkbox" name="anonymous" value="1" className="translate-y-[1px]" />
          Contribute anonymously (no credit line on the published fact)
        </label>

        <Button type="submit">Submit for review</Button>
        <p className="type-small text-ink-muted">
          {SCOUTS_PER_DAY}/day · submissions carry your name to the operator either way; anonymity
          applies to the public credit line only.
        </p>
      </form>
    </div>
  );
}
