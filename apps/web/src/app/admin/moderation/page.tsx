import Link from "next/link";
import { isPostingBanned } from "@continuum/shared";
import { listModerationPosts } from "@continuum/db";
import { removePostAction, restorePostAction, toggleBanAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * /admin/moderation (Phase 30D) — reported posts first, then recent.
 * The admin sees poster identity and history; the public never does beyond
 * the real-name line. Removal renders a continuity stub, never deletion.
 */
export default async function ModerationPage() {
  const posts = await listModerationPosts();
  const reported = posts.filter((post) => post.reportCount > 0);
  const recent = posts.filter((post) => post.reportCount === 0);

  const renderPost = (post: (typeof posts)[number]) => {
    const banned = isPostingBanned(post.bannedUntil);
    return (
      <div key={post.id} className="border border-line p-3">
        <p className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
          <span className="font-medium">{post.authorName}</span>
          {post.authorEmail !== null ? (
            <span className="text-ink-muted">{post.authorEmail}</span>
          ) : null}
          <span className="type-data text-ink-muted">
            {post.authorPostCount} post{post.authorPostCount === 1 ? "" : "s"} total
          </span>
          {banned ? (
            <span className="type-data text-distressed">
              banned until {post.bannedUntil?.toISOString().slice(0, 10)}
            </span>
          ) : null}
        </p>
        <p className="type-small mt-0.5 text-ink-muted">
          {post.createdAt?.toISOString().replace("T", " ").slice(0, 16) ?? "—"} · on{" "}
          {post.anchorHref !== null ? (
            <Link href={post.anchorHref} className="text-accent hover:underline">
              {post.anchorLabel}
            </Link>
          ) : (
            post.anchorLabel
          )}
          {post.status === "removed" ? " · REMOVED" : ""}
          {post.reportCount > 0
            ? ` · ${post.reportCount} report${post.reportCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {post.reportReasons.length > 0 ? (
          <p className="type-small mt-1 text-ink-secondary">
            Reasons: {post.reportReasons.join(" · ")}
          </p>
        ) : null}
        <p className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-[13px] leading-[1.55] text-ink">
          {post.body}
        </p>
        <div className="mt-2 flex gap-4">
          {post.status === "published" ? (
            <form action={removePostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button type="submit" className="text-[12px] font-medium text-distressed hover:underline">
                Remove
              </button>
            </form>
          ) : (
            <form action={restorePostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button type="submit" className="text-[12px] font-medium text-accent hover:underline">
                Restore
              </button>
            </form>
          )}
          <form action={toggleBanAction}>
            <input type="hidden" name="memberId" value={post.memberId} />
            <button type="submit" className="text-[12px] text-ink-secondary hover:text-distressed">
              {banned ? "Lift posting ban" : "Ban posting (30 days)"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="type-h2">Moderation</h1>
      <p className="mt-2 max-w-xl text-[13px] text-ink-secondary">
        Reported posts first, then everything recent. Removing keeps a &ldquo;Removed by
        moderators&rdquo; stub in the thread; nothing is deleted.
      </p>

      <h2 className="type-label mt-6">Reported</h2>
      {reported.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">No open reports.</p>
      ) : (
        <div className="mt-2 space-y-3">{reported.map(renderPost)}</div>
      )}

      <h2 className="type-label mt-8">Recent posts</h2>
      {recent.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">No posts yet.</p>
      ) : (
        <div className="mt-2 space-y-3">{recent.map(renderPost)}</div>
      )}
    </div>
  );
}
