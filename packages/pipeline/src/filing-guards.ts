/**
 * Chat-with-filing guards (Phase 34C) — pure, fixture-tested. The answer
 * contract is enforced HERE, not by prompting: every quote must be a
 * VERBATIM substring of the single source document; violators are dropped;
 * an answer left with zero surviving quotes is replaced by the honest
 * fallback. Grounding by construction, not by trust.
 */

export type FilingAnswer = {
  answer: string;
  quotes: { verbatim: string; note: string }[];
};

export const NO_ANSWER_FALLBACK = "The document does not clearly state this.";
export const ANSWER_MAX_WORDS = 120;

export function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

/**
 * Drop quotes that are not verbatim substrings of the document; enforce
 * the ≤120-word answer; zero surviving quotes → the fallback line with no
 * prose (an ungrounded answer is not an answer).
 */
export function guardFilingAnswer(draft: FilingAnswer, documentText: string): FilingAnswer {
  const surviving = draft.quotes.filter(
    (quote) =>
      quote.verbatim.trim().length >= 10 && documentText.includes(quote.verbatim.trim()),
  );
  if (surviving.length === 0) {
    return { answer: NO_ANSWER_FALLBACK, quotes: [] };
  }
  const words = draft.answer.trim().split(/\s+/);
  const answer =
    words.length > ANSWER_MAX_WORDS ? `${words.slice(0, ANSWER_MAX_WORDS).join(" ")}…` : draft.answer.trim();
  return {
    answer: answer === "" ? NO_ANSWER_FALLBACK : answer,
    quotes: surviving.map((quote) => ({
      verbatim: quote.verbatim.trim(),
      note: quote.note.trim().slice(0, 200),
    })),
  };
}
