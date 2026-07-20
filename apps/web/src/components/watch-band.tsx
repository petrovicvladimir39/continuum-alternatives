import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getMemberByClerkId, isWatching, watcherCount } from "@continuum/db";
import { toggleWatchAction } from "@/app/(site)/account/watch-actions";

/**
 * Watch affordance for entity/fund/deal profile headers (Phase 28D).
 * Signed-out → a quiet inline "Sign in to watch" link (no modal); Clerk
 * unconfigured → nothing (no dead affordance). Server action + refresh —
 * no optimistic UI. The "watched by N" line is AGGREGATE ONLY and appears
 * only at N ≥ 3 — watcher identities are never exposed, to anyone.
 */
export async function WatchBand({
  entityId,
  backPath,
}: {
  entityId: string;
  backPath: string;
}) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  const watchers = await watcherCount(entityId);

  let control = null;
  if (clerkEnabled) {
    const { userId } = await auth();
    if (userId === null) {
      control = (
        <Link href="/sign-in" className="text-[13px] text-ink-muted hover:text-accent">
          Sign in to watch
        </Link>
      );
    } else {
      const member = await getMemberByClerkId(userId);
      const watching = member !== null && (await isWatching(member.id, entityId));
      control = (
        <form action={toggleWatchAction}>
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="backPath" value={backPath} />
          <button
            type="submit"
            className={`rounded-sm border px-2.5 py-1 text-[12px] font-medium ${
              watching
                ? "border-line text-ink-secondary hover:text-distressed"
                : "border-line-strong text-ink hover:border-accent hover:text-accent"
            }`}
          >
            {watching ? "Watching — unwatch" : "Watch"}
          </button>
        </form>
      );
    }
  }

  if (control === null && watchers === null) {
    return null;
  }
  return (
    <span className="flex items-center gap-3">
      {control}
      {watchers !== null ? (
        <span className="type-small text-ink-muted">Watched by {watchers} members</span>
      ) : null}
    </span>
  );
}
