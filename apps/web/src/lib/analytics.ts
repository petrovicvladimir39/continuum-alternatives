/**
 * Plausible custom-event registry (Phase 23C). Events fire ONLY when the
 * Plausible script is present (NEXT_PUBLIC_PLAUSIBLE_DOMAIN set) — no
 * cookies, no extra script, silent no-op otherwise. Every event name used
 * anywhere in the app MUST be listed here (verified by verify-audience).
 */

export const PLAUSIBLE_EVENTS = [
  "subscribe_submitted",
  "subscribe_confirmed",
  "report_unlocked",
  "article_read",
  "map_opened",
  "entity_viewed",
] as const;

export type PlausibleEvent = (typeof PLAUSIBLE_EVENTS)[number];

type PlausibleFn = (event: string, options?: { props?: Record<string, string> }) => void;

export function trackEvent(event: PlausibleEvent, props?: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }
  const plausible = (window as { plausible?: PlausibleFn }).plausible;
  if (typeof plausible !== "function") {
    return;
  }
  plausible(event, props ? { props } : undefined);
}
