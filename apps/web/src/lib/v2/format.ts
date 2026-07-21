/**
 * FRONTEND-V2 deterministic formatters. Fixed English month names (no
 * locale drift between server and client render); all monetary math is
 * plain code on fixture numbers — LLMs never do arithmetic on amounts.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "3h ago" / "2d ago" — relative to a caller-supplied now for stability. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const h = Math.floor(ms / 3600_000);
  if (h < 1) {
    const m = Math.max(1, Math.floor(ms / 60_000));
    return `${m}m ago`;
  }
  if (h < 24) {
    return `${h}h ago`;
  }
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** €m fixture → display. 2400 → "€2.4bn", 850 → "€850m". */
export function fmtEuroM(aumM: number | null): string {
  if (aumM === null) {
    return "—";
  }
  return aumM >= 1000 ? `€${(aumM / 1000).toFixed(1)}bn` : `€${aumM}m`;
}

/** Tabular integer with thin thousands separators. */
export function fmtInt(n: number): string {
  return n.toLocaleString("en-GB");
}

export function daysUntil(isoDate: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(`${isoDate}T00:00:00Z`).getTime() - now) / 86400_000));
}
