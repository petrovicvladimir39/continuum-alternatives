/**
 * News Desk mechanical guards (reset build Part 6) — pure functions, fixture
 * tested in verify-articles. A composed draft is DROPPED unless every check
 * passes; guards are deterministic code, never the model.
 */

export type ComposeInputs = {
  factTitles: string[];
  excerpts: string[];
  sourceNames: string[];
  entityNames: string[];
};

export type ArticleDraft = {
  headline: string;
  deck: string;
  bodyMd: string;
};

export type GuardResult = { ok: true } | { ok: false; reason: string };

const HEADLINE_MAX = 90;
const DECK_MAX = 160;
const BODY_MIN = 400;
const BODY_MAX = 1600;

/** Sentence-start words that begin a capitalized run without being a name. */
const RUN_STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "by", "for", "from", "with", "after",
  "before", "while", "as", "according", "both", "this", "that", "these",
  "those", "its", "it", "he", "she", "they", "we", "but", "and", "or",
  "however", "meanwhile", "earlier", "later", "under", "over", "since",
  "against", "though", "although", "when", "if", "one", "two", "three",
  "last", "next", "new", "per",
]);

/** Lowercase connectors allowed INSIDE a name run (Bank of America style). */
const RUN_CONNECTORS = new Set(["of", "the", "de", "der", "van", "und", "&", "di", "da", "du", "la", "le"]);

/**
 * Geographic words (countries/demonyms/regions) are not entity fabrications —
 * a run made ONLY of these is never flagged. Firm names that merely contain
 * one ("Serbian Bankruptcy Supervision Agency") still require input presence.
 */
const GEO_WORDS = new Set(
  [
    "europe", "european", "austria", "austrian", "belgium", "belgian", "bulgaria", "bulgarian",
    "croatia", "croatian", "cyprus", "cypriot", "czechia", "czech", "denmark", "danish",
    "estonia", "estonian", "finland", "finnish", "france", "french", "germany", "german",
    "greece", "greek", "hungary", "hungarian", "ireland", "irish", "italy", "italian",
    "latvia", "latvian", "lithuania", "lithuanian", "luxembourg", "malta", "maltese",
    "netherlands", "dutch", "poland", "polish", "portugal", "portuguese", "romania",
    "romanian", "slovakia", "slovak", "slovenia", "slovenian", "spain", "spanish",
    "sweden", "swedish", "kingdom", "united", "britain", "british", "switzerland", "swiss",
    "norway", "norwegian", "iceland", "icelandic", "albania", "albanian", "bosnia",
    "herzegovina", "bosnian", "moldova", "moldovan", "montenegro", "montenegrin",
    "macedonia", "macedonian", "serbia", "serbian", "ukraine", "ukrainian", "kosovo",
  ],
);

function inputText(inputs: ComposeInputs): string {
  return [
    ...inputs.factTitles,
    ...inputs.excerpts,
    ...inputs.sourceNames,
    ...inputs.entityNames,
    // The desk may refer to the platform itself (byline voice) — these are
    // self-references, not fabricated entities.
    "Continuum Alternatives",
    "Continuum Desk",
  ]
    .join("\n")
    .toLowerCase();
}

/** Number tokens (separator-normalized): "4.500.000" and "4,500,000" → "4500000". */
function numberTokens(text: string): string[] {
  const matches = text.match(/\d(?:[\d.,\s]*\d)?/g) ?? [];
  return matches
    .map((token) => token.replace(/\D/g, ""))
    .filter((digits) => digits.length >= 2);
}

/**
 * Every number of 2+ digits in the output must appear in the inputs —
 * compared with thousand/decimal separators stripped, so "EUR 4,500,000"
 * matches an excerpt printed as "4.500.000". A contiguous-substring match
 * is accepted so date reformatting ("04.2026" from "22.04.2026") survives;
 * digits with no contiguous source in any input number are violations.
 */
export function digitViolations(output: string, inputs: ComposeInputs): string[] {
  const known = [...new Set(numberTokens(inputText(inputs)))];
  return [
    ...new Set(
      numberTokens(output).filter(
        (digits) => !known.some((source) => source.includes(digits)),
      ),
    ),
  ];
}

/**
 * Entity-like names: maximal runs of capitalized tokens (connectors allowed
 * inside). After stripping leading sentence-start stopwords, a run of >= 2
 * capitalized tokens must appear (case-insensitive) in the inputs — an
 * invented firm name is a dropped article.
 */
export function nameViolations(output: string, inputs: ComposeInputs): string[] {
  const haystack = inputText(inputs);
  const violations = new Set<string>();
  const tokens = output.split(/\s+/);
  let run: string[] = [];

  const flush = () => {
    // Trim leading stopwords and trailing connectors.
    let start = 0;
    while (start < run.length && RUN_STOPWORDS.has(run[start]!.toLowerCase().replace(/[^\p{L}&]/gu, ""))) {
      start += 1;
    }
    let end = run.length;
    while (end > start && RUN_CONNECTORS.has(run[end - 1]!.toLowerCase())) {
      end -= 1;
    }
    const candidate = run.slice(start, end);
    const capCount = candidate.filter((t) => /^[\p{Lu}]/u.test(t)).length;
    const geoOnly = candidate.every((t) =>
      GEO_WORDS.has(t.toLowerCase().replace(/[^\p{L}]/gu, "")),
    );
    if (capCount >= 2 && !geoOnly) {
      const phrase = candidate
        .join(" ")
        .replace(/[.,;:!?)"'’”]+$/u, "")
        .trim();
      if (phrase !== "" && !haystack.includes(phrase.toLowerCase())) {
        violations.add(phrase);
      }
    }
    run = [];
  };

  for (const rawToken of tokens) {
    const token = rawToken.replace(/^[("'‘“]+/u, "");
    if (/^[\p{Lu}]/u.test(token)) {
      run.push(token);
      // Sentence-ending punctuation stops the run.
      if (/[.!?]["')]*$/.test(token)) {
        flush();
      }
    } else if (run.length > 0 && RUN_CONNECTORS.has(token.toLowerCase())) {
      run.push(token);
    } else if (run.length > 0) {
      flush();
    }
  }
  flush();
  return [...violations];
}

export function guardArticle(draft: ArticleDraft, inputs: ComposeInputs): GuardResult {
  const headline = draft.headline.trim();
  const deck = draft.deck.trim();
  const body = draft.bodyMd.trim();
  if (headline === "" || headline.length > HEADLINE_MAX) {
    return { ok: false, reason: `headline length ${headline.length} (max ${HEADLINE_MAX})` };
  }
  if (deck.length > DECK_MAX) {
    return { ok: false, reason: `deck length ${deck.length} (max ${DECK_MAX})` };
  }
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return { ok: false, reason: `body length ${body.length} (must be ${BODY_MIN}–${BODY_MAX})` };
  }
  if (!/according to/i.test(body)) {
    return { ok: false, reason: "missing in-prose attribution (“according to …”)" };
  }
  if (/^\s*(sources?|citations?)\s*:/im.test(body)) {
    return { ok: false, reason: "model wrote a citation footer (assembled at render only)" };
  }
  const output = `${headline}\n${deck}\n${body}`;
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
