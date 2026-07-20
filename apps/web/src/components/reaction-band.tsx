import { REACTION_PUBLIC_THRESHOLD, REACTIONS, type Reaction, type ReactionCounts, type ReactionTargetKind } from "@continuum/db";
import { toggleReactionAction } from "@/lib/community-actions";

/**
 * Reactions (Phase 30A) — three QUIET text affordances, nothing more.
 * Counts render only at ≥ REACTION_PUBLIC_THRESHOLD; the member's own state
 * is underlined; signed-out readers see counts only (no dead buttons).
 * These are never scores or percentages — see schema/community.ts.
 */

const LABELS: Record<Reaction, string> = {
  credible: "Credible",
  doubtful: "Doubtful",
  watching: "Watching",
};

export function ReactionBand({
  targetKind,
  targetId,
  backPath,
  counts,
  own,
  signedIn,
}: {
  targetKind: ReactionTargetKind;
  targetId: string;
  backPath: string;
  counts: ReactionCounts;
  own: Reaction | null;
  signedIn: boolean;
}) {
  const visible = (reaction: Reaction) =>
    counts[reaction] >= REACTION_PUBLIC_THRESHOLD ? counts[reaction] : null;

  if (!signedIn) {
    const shown = REACTIONS.filter((reaction) => visible(reaction) !== null);
    if (shown.length === 0) {
      return null;
    }
    return (
      <span className="type-small flex items-center gap-2 text-ink-muted">
        {shown.map((reaction, index) => (
          <span key={reaction} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>·</span> : null}
            <span className="tabular-nums">
              {LABELS[reaction]} {visible(reaction)}
            </span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {REACTIONS.map((reaction, index) => (
        <span key={reaction} className="flex items-center gap-2">
          {index > 0 ? (
            <span aria-hidden className="type-small text-ink-muted">
              ·
            </span>
          ) : null}
          <form action={toggleReactionAction} className="inline">
            <input type="hidden" name="targetKind" value={targetKind} />
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="reaction" value={reaction} />
            <input type="hidden" name="backPath" value={backPath} />
            <button
              type="submit"
              className={`type-small tabular-nums hover:text-accent ${
                own === reaction
                  ? "text-ink underline decoration-line-strong underline-offset-2"
                  : "text-ink-muted"
              }`}
            >
              {LABELS[reaction]}
              {visible(reaction) !== null ? ` ${visible(reaction)}` : ""}
            </button>
          </form>
        </span>
      ))}
    </span>
  );
}
