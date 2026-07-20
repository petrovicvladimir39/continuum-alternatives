import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { canUseFrequency, ENTITLEMENTS } from "@continuum/shared";
import {
  getAlertPrefs,
  getMemberByClerkId,
  listSavedViews,
  listWatchlist,
  resolveMemberTier,
  upsertMemberProfile,
} from "@continuum/db";
import { EntityLogo } from "@/components/ui/entity-logo";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  setFrequencyAction,
  toggleViewAlertAction,
  unwatchAction,
} from "@/app/(site)/account/watch-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watchlist",
  robots: { index: false, follow: false },
};

/** Watchlist + alert preferences (Phase 28D). Alert opt-out lives HERE —
 * deliberately separate from the newsletter unsubscribe (different consents). */
export default async function WatchlistPage() {
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
  const [watchlist, views, prefs, tier] = await Promise.all([
    listWatchlist(member.id),
    listSavedViews(member.id),
    getAlertPrefs(member.id),
    resolveMemberTier(member.id),
  ]);
  // Phase 29B: quiet inline notes at the limits — enforcement is server-side
  // in watch-actions.ts; over-limit rows (post-downgrade) stay READ-ONLY,
  // never deleted.
  const limits = ENTITLEMENTS[tier];
  const atWatchLimit = limits.watchLimit !== null && watchlist.length >= limits.watchLimit;
  const enabledViews = views.filter((view) => view.alertEnabled).length;
  const atViewLimit = limits.alertViewLimit !== null && enabledViews >= limits.alertViewLimit;

  return (
    <div className="max-w-2xl py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="type-h1">Watchlist</h1>
        <Link href="/account/updates" className="text-[13px] text-accent hover:underline">
          What changed →
        </Link>
      </div>

      <h2 className="type-h2 mt-7">Watched entities</h2>
      {atWatchLimit ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">
          Watching {watchlist.length} of {limits.watchLimit} — Founding members watch unlimited ·{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            Learn more
          </Link>
        </p>
      ) : null}
      {watchlist.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          Nothing yet — use the Watch button on any company, fund, or deal page.
        </p>
      ) : (
        <div className="mt-3">
          <DataTable>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Latest activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((row) => (
                <tr key={row.entityId}>
                  <td>
                    <span className="flex items-center gap-2">
                      <EntityLogo name={row.name} logoUrl={row.logoUrl} size="sm" />
                      {row.href !== null ? (
                        <Link href={row.href} className="font-medium hover:text-accent">
                          {row.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{row.name}</span>
                      )}
                    </span>
                  </td>
                  <td className="type-data">{row.latestActivity ?? "—"}</td>
                  <td className="text-right">
                    <form action={unwatchAction}>
                      <input type="hidden" name="entityId" value={row.entityId} />
                      <button
                        type="submit"
                        className="text-[11px] text-ink-muted hover:text-distressed"
                      >
                        unwatch
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      <h2 className="type-h2 mt-8">Saved-view alerts</h2>
      {atViewLimit ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">
          {enabledViews} of {limits.alertViewLimit} alert-enabled — Founding members alert on
          unlimited views ·{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            Learn more
          </Link>
        </p>
      ) : null}
      {views.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          Save a view from the News ask bar, then enable its daily alert here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {views.map((view) => {
            const stored = view.filters as { q?: string };
            return (
              <li key={view.id} className="flex items-center gap-3 text-[13px]">
                <Link
                  href={`/news?q=${encodeURIComponent(stored.q ?? "")}`}
                  className="text-accent hover:underline"
                >
                  {view.name}
                </Link>
                <form action={toggleViewAlertAction}>
                  <input type="hidden" name="viewId" value={view.id} />
                  <input type="hidden" name="enabled" value={view.alertEnabled ? "0" : "1"} />
                  <button
                    type="submit"
                    className={`rounded-sm border px-2 py-0.5 text-[11px] font-medium ${
                      view.alertEnabled
                        ? "border-line-strong text-ink"
                        : "border-line text-ink-muted hover:text-accent"
                    }`}
                  >
                    {view.alertEnabled ? "Alerts on" : "Alerts off"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="type-h2 mt-8">Alert frequency</h2>
      <form action={setFrequencyAction} className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
        {(
          [
            ["daily", "Daily batch — one email at 07:00"],
            ["instant_important", "Instant for important events, rest daily"],
            ["off", "Off — updates page only, no email"],
          ] as const
        ).map(([value, label]) => {
          const allowed = canUseFrequency(tier, value);
          return (
            <label
              key={value}
              className={`flex items-baseline gap-1.5 ${allowed ? "" : "text-ink-muted"}`}
            >
              <input
                type="radio"
                name="frequency"
                value={value}
                disabled={!allowed}
                defaultChecked={prefs.frequency === value}
              />
              {label}
              {!allowed ? (
                <Link href="/pricing" className="text-[11px] text-accent hover:underline">
                  Founding
                </Link>
              ) : null}
            </label>
          );
        })}
        <Button type="submit" variant="ghost">
          Save
        </Button>
      </form>
    </div>
  );
}
