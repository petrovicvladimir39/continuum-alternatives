import { digitViolations, nameViolations, type ComposeInputs } from "./articles-guards";

/**
 * Entity-brief mechanical guards (Phase 29D) — pure functions, fixture
 * tested in verify-payments. Same doctrine as articles-guards: the model
 * writes, deterministic code decides whether the output may exist. A brief
 * failing ANY check is dropped (and the spend still logged).
 */

export type BriefDraft = {
  summary: string;
  key_facts: string[];
  relationships: string[];
  watch_points: string[];
};

export type BriefGuardResult = { ok: true } | { ok: false; reason: string };

/** Bullet citation: every key fact ends "[<source name>]" with a KNOWN name. */
const CITE_RE = /\[([^\]]+)\]\s*$/;
/** Facts without a source document cite the platform record itself. */
export const INTERNAL_SOURCE_NAME = "Continuum record";

export function guardBrief(draft: BriefDraft, inputs: ComposeInputs): BriefGuardResult {
  const summary = draft.summary.trim();
  if (summary === "" || summary.length > 1200) {
    return { ok: false, reason: `summary length ${summary.length} (must be 1–1200 chars)` };
  }
  // 3–5 sentences, counted mechanically (terminal punctuation runs).
  // Multi-dot abbreviations ("d.o.o.", "a.d.", "e.g.") are collapsed first —
  // regional legal forms must not read as sentence boundaries.
  const collapsed = summary.replace(/\b(?:\p{L}{1,3}\.){2,}/gu, "co");
  const sentences = collapsed.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim() !== "").length;
  if (sentences < 3 || sentences > 5) {
    return { ok: false, reason: `summary has ${sentences} sentences (must be 3–5)` };
  }
  if (draft.key_facts.length === 0 || draft.key_facts.length > 6) {
    return { ok: false, reason: `${draft.key_facts.length} key facts (must be 1–6)` };
  }
  if (draft.relationships.length > 5) {
    return { ok: false, reason: `${draft.relationships.length} relationship lines (max 5)` };
  }
  if (draft.watch_points.length > 3) {
    return { ok: false, reason: `${draft.watch_points.length} watch points (max 3)` };
  }

  const knownSources = new Set(
    [...inputs.sourceNames, INTERNAL_SOURCE_NAME].map((name) => name.toLowerCase()),
  );
  for (const bullet of draft.key_facts) {
    const match = CITE_RE.exec(bullet.trim());
    if (match === null) {
      return { ok: false, reason: `key fact missing [source name]: "${bullet.slice(0, 60)}"` };
    }
    if (!knownSources.has(match[1]!.trim().toLowerCase())) {
      return { ok: false, reason: `key fact cites unknown source "${match[1]}"` };
    }
  }

  // Digit/name guards as in compose — over the WHOLE brief.
  const output = [
    summary,
    ...draft.key_facts,
    ...draft.relationships,
    ...draft.watch_points,
  ].join("\n");
  const digits = digitViolations(output, inputs);
  if (digits.length > 0) {
    return { ok: false, reason: `number(s) not present in inputs: ${digits.join(", ")}` };
  }
  const names = nameViolations(output, inputs);
  if (names.length > 0) {
    return { ok: false, reason: `entity-like name(s) not present in inputs: ${names.join("; ")}` };
  }
  return { ok: true };
}
