import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  listThreadPosts,
  memberHasPosted,
  type AnchorKind,
} from "@continuum/db";
import { renderArticleBody } from "@/components/editorial/article-view";
import { ThreadComposer } from "@/components/thread-composer";
import { reportPostAction } from "@/lib/community-actions";

/**
 * Discussion section (Phase 30C) — flat, chronological, anchored. Signed-in
 * members post under their real name + stated role; signed-out readers see
 * the thread and a quiet sign-in link. Removed posts stay as continuity
 * stubs. Empty state is ONE quiet line — no "be the first!" theatrics.
 */
export async function DiscussionSection({
  anchorKind,
  anchorId,
  backPath,
}: {
  anchorKind: AnchorKind;
  anchorId: string;
  backPath: string;
}) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  const posts = await listThreadPosts(anchorKind, anchorId);

  let composer = null;
  let signedIn = false;
  if (clerkEnabled) {
    const { userId } = await auth();
    signedIn = userId !== null;
    if (userId === null) {
      composer = (
        <p className="mt-3 text-[13px] text-ink-muted">
          <Link href="/sign-in" className="hover:text-accent">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      );
    } else {
      const member = await getMemberByClerkId(userId);
      const firstPost = member === null ? true : !(await memberHasPosted(member.id));
      composer = (
        <ThreadComposer
          anchorKind={anchorKind}
          anchorId={anchorId}
          backPath={backPath}
          firstPost={firstPost}
        />
      );
    }
  }

  return (
    <section className="mt-10">
      <h2 className="type-h2">Discussion</h2>
      {posts.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">No posts on this record yet.</p>
      ) : (
        <div className="mt-3 max-w-2xl space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border-t border-line pt-3">
              {post.status === "removed" ? (
                // Continuity stub — the thread's shape survives moderation.
                <p className="text-[13px] italic text-ink-muted">Removed by moderators.</p>
              ) : (
                <>
                  <p className="text-[13px]">
                    <span className="font-medium text-ink">{post.authorName}</span>
                    {post.authorLine !== null ? (
                      <span className="text-ink-muted"> · {post.authorLine}</span>
                    ) : null}
                    {post.createdAt !== null ? (
                      <span className="type-data text-ink-muted">
                        {" "}
                        · {post.createdAt.toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 text-[13px] [&>p]:mb-2 [&>p]:text-[13px] [&>p]:leading-[1.55]">
                    {renderArticleBody(post.body)}
                  </div>
                  {signedIn ? (
                    <form action={reportPostAction} className="mt-0.5">
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="backPath" value={backPath} />
                      <button
                        type="submit"
                        className="text-[11px] text-ink-muted hover:text-distressed"
                      >
                        report
                      </button>
                    </form>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {composer}
    </section>
  );
}
