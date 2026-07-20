"use client";

import { useActionState } from "react";
import { createPostAction, type PostState } from "@/lib/community-actions";
import { Button } from "@/components/ui/button";

/**
 * Thread composer (Phase 30B) — quiet, honest, no engagement bait. Limits
 * are stated up front; the server enforces them regardless. The first-post
 * notice states the professional-conduct policy exactly once.
 */

const initialState: PostState = { status: "idle" };

export function ThreadComposer({
  anchorKind,
  anchorId,
  backPath,
  firstPost,
}: {
  anchorKind: string;
  anchorId: string;
  backPath: string;
  /** True until the member has posted anywhere — shows the one-time notice. */
  firstPost: boolean;
}) {
  const [state, formAction] = useActionState(createPostAction, initialState);

  return (
    <form action={formAction} className="mt-4 max-w-xl">
      {firstPost && state.status !== "posted" ? (
        <p className="mb-2 border border-line p-2.5 text-[12px] leading-[1.5] text-ink-secondary">
          First post: you write under your real name and your stated role. Professional conduct,
          no confidential information, no market manipulation — the{" "}
          <a href="/community-guidelines" className="text-accent hover:underline">
            community guidelines
          </a>{" "}
          apply to everything posted here.
        </p>
      ) : null}
      <input type="hidden" name="anchorKind" value={anchorKind} />
      <input type="hidden" name="anchorId" value={anchorId} />
      <input type="hidden" name="backPath" value={backPath} />
      <textarea
        name="body"
        rows={3}
        maxLength={4000}
        placeholder="Add to the record’s discussion…"
        className="w-full border border-line bg-surface px-2.5 py-2 text-[13px] leading-[1.55] text-ink outline-none focus:border-line-strong"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="ghost">
          Post
        </Button>
        <span className="type-small text-ink-muted">
          20–2,000 characters · up to 2 links · 5 posts/day ·{" "}
          <a href="/community-guidelines" className="hover:text-accent">
            guidelines
          </a>
        </span>
      </div>
      {state.status === "error" ? (
        <p className="mt-1.5 text-[12px] text-distressed">{state.message}</p>
      ) : null}
      {state.status === "posted" ? (
        <p className="mt-1.5 text-[12px] text-ink-secondary">Posted.</p>
      ) : null}
    </form>
  );
}
