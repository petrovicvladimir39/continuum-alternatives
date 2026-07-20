import { sanitizeArticleMarkdown } from "./editorial";

/**
 * Community rules (Phase 30) — pure, fixture-tested in verify-engagement.
 * The post pipeline is: raw input → sanitizeArticleMarkdown (the Phase 27
 * subset: paragraphs/bold/https-links only, HTML neutralized) → length and
 * link limits on the SANITIZED text. Deterministic code decides; there is
 * no LLM moderation anywhere.
 */

export const POSTS_PER_MEMBER_PER_DAY = 5;
export const POST_MIN_CHARS = 20;
export const POST_MAX_CHARS = 2000;
export const POST_MAX_LINKS = 2;

export type PostValidation =
  | { ok: true; body: string }
  | { ok: false; reason: "too_short" | "too_long" | "too_many_links" };

export function validatePostBody(raw: string): PostValidation {
  const body = sanitizeArticleMarkdown(raw);
  if (body.length < POST_MIN_CHARS) {
    return { ok: false, reason: "too_short" };
  }
  if (body.length > POST_MAX_CHARS) {
    return { ok: false, reason: "too_long" };
  }
  // Every link form the renderer can produce contains "http(s)://" exactly
  // once — counting occurrences covers markdown links AND bare URLs.
  const linkCount = (body.match(/https?:\/\//gi) ?? []).length;
  if (linkCount > POST_MAX_LINKS) {
    return { ok: false, reason: "too_many_links" };
  }
  return { ok: true, body };
}

/** Posting ban check (Phase 30D). NULL or past = not banned. */
export function isPostingBanned(bannedUntil: Date | null, now: Date = new Date()): boolean {
  return bannedUntil !== null && bannedUntil.getTime() > now.getTime();
}
