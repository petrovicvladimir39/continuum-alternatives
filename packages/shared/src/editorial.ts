/**
 * Editorial layer helpers (Phase 27) — pure, fixture-tested.
 */

import { CLASS_LEVEL } from "./alt-taxonomy";

/**
 * Class accent hexes (Phase 27A) — email-safe values mirroring the
 * globals.css tokens; usage outside the three sanctioned slots (kicker,
 * 2px top rule, class chip) is a verify failure.
 */
export const CLASS_ACCENTS: Record<string, string> = {
  private_equity: "#1d7a5f",
  private_credit: "#96690f",
  real_assets: "#5f6b1d",
  hedge_funds: "#5b3684",
  structured: "#106a6e",
  esoteric: "#772f6b",
  collectibles: "#7d3450",
  climate: "#23704a",
  digital: "#3f4178",
};

/** WCAG relative-luminance contrast — verify asserts AA for every accent. */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  };
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * Markdown SUBSET sanitizer (Phase 27C): paragraphs, **bold**, [links](url)
 * ONLY. Headers, lists, images, raw HTML, and non-http(s) link schemes are
 * stripped/neutralized. Output is safe to feed the article renderer.
 */
export function sanitizeArticleMarkdown(input: string): string {
  let text = input.replace(/\r\n/g, "\n");
  // script/style blocks vanish INCLUDING their contents; other raw HTML
  // tags are neutralized (their text content stays).
  text = text.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]*>/g, "");
  // Images stripped BEFORE links ( ![alt](src) ).
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Headers and list markers lose their markers, keep their text.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  // Links: only http(s) targets survive as links; others collapse to text.
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const target = url.trim();
    return /^https?:\/\//i.test(target) ? `[${label}](${target})` : label;
  });
  // Collapse 3+ blank lines to paragraph breaks.
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Guard applicability (Phase 27B): mechanical anti-fabrication guards apply
 * ONLY to machine output. The operator is the editor — their pieces are
 * their own words, gated by their own judgment, not by digit-matching.
 */
export function shouldGuardArticle(authoredBy: string): boolean {
  return authoredBy === "desk_compose";
}

/**
 * Compose classification inference (Phase 27B): majority vote over the
 * input facts' entity classifications; strategy wins only with a majority,
 * else falls back to the majority class (class-level); null when nothing is
 * classified — the article renders neutral, never a fake classification.
 */
export function inferArticleClassification(
  entityClassifications: { assetClass: string; strategy: string }[],
): { assetClass: string; strategy: string | null } | null {
  if (entityClassifications.length === 0) {
    return null;
  }
  const classVotes = new Map<string, number>();
  for (const row of entityClassifications) {
    classVotes.set(row.assetClass, (classVotes.get(row.assetClass) ?? 0) + 1);
  }
  const [topClass, topClassVotes] = [...classVotes.entries()].sort((a, b) => b[1] - a[1])[0]!;
  if (topClassVotes * 2 <= entityClassifications.length) {
    return null; // no majority — neutral
  }
  const strategyVotes = new Map<string, number>();
  const classRows = entityClassifications.filter((row) => row.assetClass === topClass);
  for (const row of classRows) {
    if (row.strategy !== CLASS_LEVEL) {
      strategyVotes.set(row.strategy, (strategyVotes.get(row.strategy) ?? 0) + 1);
    }
  }
  const topStrategy = [...strategyVotes.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topStrategy !== undefined && topStrategy[1] * 2 > classRows.length) {
    return { assetClass: topClass, strategy: topStrategy[0] };
  }
  return { assetClass: topClass, strategy: null };
}

/** Draft → publish state machine (operator pieces may hold 'draft'). */
export function canTransitionArticle(
  from: string,
  to: string,
  authoredBy: string,
): boolean {
  if (from === to) {
    return false;
  }
  const operatorOnly = authoredBy === "operator";
  switch (`${from}→${to}`) {
    case "draft→published":
      return operatorOnly;
    case "draft→rejected":
      return operatorOnly; // discard a draft
    case "proposed→published":
    case "proposed→rejected":
      return true;
    default:
      return false;
  }
}
