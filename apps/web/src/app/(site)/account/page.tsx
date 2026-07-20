import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { canExport, CHANNELS } from "@continuum/shared";
import {
  countPrivateEdges,
  findContactByEmail,
  getMemberAffiliation,
  getMemberByClerkId,
  getSubscription,
  listSavedViews,
  resolveMemberTier,
  searchPublic,
  upsertMemberProfile,
} from "@continuum/db";
import { deleteSavedViewAction } from "@/app/(site)/news/actions";
import { openPortalAction } from "@/app/(site)/pricing/actions";
import { updateProfessionalLineAction } from "@/lib/community-actions";
import {
  clearAffiliationAction,
  deleteContactsAction,
  importLinkedInAction,
  setAffiliationAction,
} from "@/lib/universe-actions";
import { SubscribeBlock } from "@/components/subscribe-block";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { stripeConfigured } from "@/lib/billing";
import { updateDisplayNameAction, updateNewsletterChannelsAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

/**
 * /account (Phase 24D) — minimal and honest: display name (editable), email
 * (Clerk, read-only), and the Newsletter block that quietly unifies member
 * identity with the subscriber list by email — no concept migration.
 * The upsert below is the webhook-resilience fallback: the first
 * authenticated visit guarantees a member_profiles row exists.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string; import?: string; n?: string; m?: string; d?: string; capped?: string }>;
}) {
  const params = await searchParams;
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound(); // middleware normally redirects first
  }
  const email = user.primaryEmailAddress?.emailAddress ?? null;

  let profile = await getMemberByClerkId(user.id);
  if (profile === null || profile.deletedAt !== null) {
    profile = await upsertMemberProfile({
      clerkUserId: user.id,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || null,
      email,
    });
  }

  const contact = email !== null ? await findContactByEmail(email) : null;
  const savedViews = await listSavedViews(profile.id);
  const [tier, subscription, affiliation, contactCounts] = await Promise.all([
    resolveMemberTier(profile.id),
    getSubscription(profile.id),
    getMemberAffiliation(profile.id),
    countPrivateEdges(profile.id),
  ]);
  // "This is my firm" candidates — plain GET search, member picks explicitly.
  const firmQuery = (params.firm ?? "").trim();
  const firmCandidates =
    firmQuery === ""
      ? []
      : (await searchPublic(firmQuery)).filter((hit) => hit.kind === "organization").slice(0, 8);
  const renewalDate =
    tier === "founding" && subscription?.currentPeriodEnd != null
      ? subscription.currentPeriodEnd.toISOString().slice(0, 10)
      : null;

  return (
    <div className="max-w-xl py-12">
      <h1 className="type-h1">Account</h1>
      <p className="mt-2 flex gap-4 text-[13px]">
        <a href="/account/watchlist" className="text-accent hover:underline">
          Watchlist →
        </a>
        <a href="/account/updates" className="text-accent hover:underline">
          What changed →
        </a>
      </p>

      <div className="mt-6 border border-line p-4">
        <form action={updateDisplayNameAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className={labelClass} htmlFor="account-name">
              Display name
            </label>
            <input
              id="account-name"
              name="displayName"
              maxLength={120}
              className={inputClass}
              defaultValue={profile.displayName ?? ""}
            />
          </div>
          <Button type="submit" variant="ghost">
            Save
          </Button>
        </form>
        {/* Phase 30B — the professional line shown next to your name on
            discussion posts. Optional; you state it, we never infer it. */}
        <form
          action={updateProfessionalLineAction}
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          <div className="min-w-[160px] flex-1">
            <label className={labelClass} htmlFor="account-role">
              Role
            </label>
            <input
              id="account-role"
              name="roleTitle"
              maxLength={80}
              placeholder="e.g. Partner"
              className={inputClass}
              defaultValue={profile.roleTitle ?? ""}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={labelClass} htmlFor="account-org">
              Organization
            </label>
            <input
              id="account-org"
              name="organization"
              maxLength={120}
              placeholder="e.g. Adria Capital"
              className={inputClass}
              defaultValue={profile.organization ?? ""}
            />
          </div>
          <Button type="submit" variant="ghost">
            Save
          </Button>
          <p className="type-small w-full text-ink-muted">
            Shown beside your name on discussion posts (optional).
          </p>
        </form>
        <div className="mt-4">
          <span className={labelClass}>Email</span>
          <p className="text-[14px] text-ink">{email ?? "—"}</p>
          <p className="type-small mt-0.5 text-ink-muted">
            Managed by your sign-in identity; change it from the sign-in provider.
          </p>
        </div>
      </div>

      {/* ── Membership (Phase 29C) — member-facing only; no public badges. */}
      <h2 className="type-h2 mt-8">Membership</h2>
      <div className="mt-3 border border-line p-4">
        {tier === "founding" ? (
          <>
            <p className="text-[13px] font-medium text-ink">Founding member</p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Founding tier
              {renewalDate !== null ? (
                <>
                  {" · renews "}
                  <span className="type-data">{renewalDate}</span>
                </>
              ) : null}
              {subscription?.status === "past_due"
                ? " · payment issue — update your card in the billing portal"
                : ""}
            </p>
            <form action={openPortalAction} className="mt-2">
              <button type="submit" className="text-[13px] text-accent hover:underline">
                Manage billing →
              </button>
            </form>
          </>
        ) : (
          <p className="text-[13px] text-ink-secondary">
            Free tier.{" "}
            {stripeConfigured() ? (
              <a href="/pricing" className="text-accent hover:underline">
                Founding membership →
              </a>
            ) : (
              "Memberships open soon."
            )}
          </p>
        )}
      </div>

      {/* ── Your firm (Phase 32A) — ONE confirmed affiliation, member-set,
          changeable, never auto-inferred. The start node of /universe. */}
      <h2 className="type-h2 mt-8">Your firm</h2>
      <div className="mt-3 border border-line p-4">
        {affiliation !== null ? (
          <div className="flex flex-wrap items-baseline gap-3 text-[13px]">
            <a href={`/companies/${affiliation.slug}`} className="font-medium text-accent hover:underline">
              {affiliation.name}
            </a>
            <span className="type-small text-ink-muted">confirmed affiliation</span>
            <form action={clearAffiliationAction}>
              <button type="submit" className="text-[11px] text-ink-muted hover:text-distressed">
                remove
              </button>
            </form>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-ink-secondary">
              Link your firm on the record — it anchors your universe and warm paths. Only you set
              this; we never infer it.
            </p>
            <form action="/account" method="get" className="mt-2 flex flex-wrap gap-2">
              <input
                name="firm"
                defaultValue={firmQuery}
                placeholder="Search companies…"
                className={`${inputClass} min-w-[220px] flex-1`}
              />
              <Button type="submit" variant="ghost">
                Search
              </Button>
            </form>
            {firmQuery !== "" ? (
              firmCandidates.length === 0 ? (
                <p className="type-small mt-2 text-ink-muted">No record for “{firmQuery}”.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {firmCandidates.map((hit) => (
                    <li key={hit.id} className="flex items-baseline gap-3 text-[13px]">
                      <span className="font-medium">{hit.name}</span>
                      <form action={setAffiliationAction}>
                        <input type="hidden" name="entityId" value={hit.id} />
                        <button type="submit" className="text-[12px] text-accent hover:underline">
                          This is my firm
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </>
        )}
      </div>

      {/* ── Imported contacts (Phase 32A) — consent-first LinkedIn import.
          PRIVACY LAW: private to THIS member only; emails dropped at parse;
          one click deletes everything. */}
      <h2 className="type-h2 mt-8">Imported contacts</h2>
      <div className="mt-3 border border-line p-4">
        {params.import === "ok" ? (
          <p className="mb-3 text-[13px] text-ink-secondary">
            Imported {params.n ?? 0} contact{params.n === "1" ? "" : "s"} · {params.m ?? 0} matched
            to the record
            {params.d !== undefined && params.d !== "0" ? ` · ${params.d} duplicate(s) skipped` : ""}
            {params.capped === "1" ? " · file truncated at 2,000 rows" : ""}.
          </p>
        ) : params.import === "consent" ? (
          <p className="mb-3 text-[13px] text-distressed">Nothing was parsed — consent unchecked.</p>
        ) : params.import === "unparseable" ? (
          <p className="mb-3 text-[13px] text-distressed">
            That file does not look like a LinkedIn Connections.csv — no First/Last Name columns.
          </p>
        ) : params.import === "nofile" || params.import === "toolarge" ? (
          <p className="mb-3 text-[13px] text-distressed">
            {params.import === "nofile" ? "No file selected." : "File too large (5 MB limit)."}
          </p>
        ) : null}

        {contactCounts.total > 0 ? (
          <div className="flex flex-wrap items-baseline gap-3 text-[13px]">
            <span>
              <span className="type-data font-medium">{contactCounts.total}</span> private contacts
              · <span className="type-data">{contactCounts.matched}</span> matched to the record
            </span>
            <a href="/universe" className="text-accent hover:underline">
              Your universe →
            </a>
            <form action={deleteContactsAction}>
              <button type="submit" className="text-[12px] text-ink-muted hover:text-distressed">
                Delete all imported contacts
              </button>
            </form>
          </div>
        ) : null}

        {/* Consent BEFORE parse: the statement and checkbox gate the upload;
            the server refuses without it. */}
        <form action={importLinkedInAction} className="mt-3">
          <p className="text-[13px] leading-[1.55] text-ink-secondary">
            Upload your own LinkedIn data-export <span className="type-data">Connections.csv</span>.
            What we store, privately and visibly only to you: names, companies, positions, and
            connection dates. What we never store: email addresses or phone numbers — the email
            column is dropped before anything is saved. Delete everything with one click, any time.
            Your contacts are never shown to anyone else, never aggregated, and never used for
            suggestions to other members.
          </p>
          <label className="mt-2 flex items-baseline gap-1.5 text-[12px] text-ink-secondary">
            <input type="checkbox" name="consent" required className="translate-y-[1px]" />
            I understand and consent to importing my connections on these terms.
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input type="file" name="connections" accept=".csv,text/csv" className="text-[12px]" />
            <Button type="submit" variant="ghost">
              Import
            </Button>
          </div>
        </form>
      </div>

      <h2 className="type-h2 mt-8">Saved views</h2>
      {savedViews.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          None yet — filter the News front with the ask bar and press “Save this view”.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {savedViews.map((view) => {
            const stored = view.filters as { q?: string };
            return (
              <li key={view.id} className="flex items-center gap-3 text-[13px]">
                <a
                  href={`/news?q=${encodeURIComponent(stored.q ?? "")}`}
                  className="text-accent hover:underline"
                >
                  {view.name}
                </a>
                {canExport(tier) ? (
                  <a
                    href={`/api/export/view?viewId=${view.id}`}
                    className="text-[11px] text-ink-muted hover:text-accent"
                  >
                    export CSV
                  </a>
                ) : null}
                <form action={deleteSavedViewAction}>
                  <input type="hidden" name="viewId" value={view.id} />
                  <button type="submit" className="text-[11px] text-ink-muted hover:text-distressed">
                    remove
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="type-h2 mt-8">Newsletter</h2>
      {contact !== null ? (
        <div className="mt-3 border border-line p-4">
          <p className="text-[13px] text-ink-secondary">
            Subscription status:{" "}
            <span className="type-data font-medium">{contact.status.replace("_", " ")}</span>
            {contact.status === "pending_confirmation"
              ? " — confirm from your inbox to start receiving issues."
              : contact.status === "unsubscribed"
                ? " — you receive nothing; re-subscribe below any time."
                : ""}
          </p>
          {contact.status !== "unsubscribed" ? (
            <form action={updateNewsletterChannelsAction} className="mt-3">
              <span className={labelClass}>Channels</span>
              <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-baseline gap-1.5 text-[13px]">
                    <input
                      type="checkbox"
                      name="channels"
                      value={channel}
                      defaultChecked={(contact.channels ?? []).includes(channel)}
                      className="translate-y-[1px]"
                    />
                    {channel.replace("_", " ")}
                  </label>
                ))}
              </div>
              <Button type="submit" variant="ghost" className="mt-3">
                Save channels
              </Button>
            </form>
          ) : (
            <div className="mt-3">
              <SubscribeBlock compact defaultEmail={email ?? ""} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <SubscribeBlock defaultEmail={email ?? ""} />
        </div>
      )}
    </div>
  );
}
