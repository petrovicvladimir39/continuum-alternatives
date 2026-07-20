import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { CHANNELS } from "@continuum/shared";
import {
  findContactByEmail,
  getMemberByClerkId,
  listSavedViews,
  upsertMemberProfile,
} from "@continuum/db";
import { deleteSavedViewAction } from "@/app/(site)/news/actions";
import { SubscribeBlock } from "@/components/subscribe-block";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/admin/form-styles";
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
export default async function AccountPage() {
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
        <div className="mt-4">
          <span className={labelClass}>Email</span>
          <p className="text-[14px] text-ink">{email ?? "—"}</p>
          <p className="type-small mt-0.5 text-ink-muted">
            Managed by your sign-in identity; change it from the sign-in provider.
          </p>
        </div>
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
