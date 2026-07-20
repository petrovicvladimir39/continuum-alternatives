const TRANSLITERATIONS: Record<string, string> = {
  đ: "dj",
  ć: "c",
  č: "c",
  š: "s",
  ž: "z",
  ő: "o",
  ű: "u",
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ț: "t",
  ë: "e",
  ä: "a",
  ö: "o",
  ü: "u",
  // Czech/Slovak (Phase 15, FORWARD-ONLY: existing slugs are never renamed —
  // URL stability wins over slug beauty; only newly created slugs benefit).
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ý: "y",
  ů: "u",
  ř: "r",
  ě: "e",
  ň: "n",
  ť: "t",
  ď: "d",
  ĺ: "l",
  ľ: "l",
  ŕ: "r",
  ô: "o",
  // Polish
  ł: "l",
  ą: "a",
  ę: "e",
  ń: "n",
  ś: "s",
  ź: "z",
  ż: "z",
  // Turkish
  ı: "i",
  ğ: "g",
  // Serbian Cyrillic → Latin (mapped to the same post-diacritic forms as above,
  // so "ЂОРЂЕВИЋ" and "Đorđević" normalize identically).
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "dj",
  е: "e",
  ж: "z",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "c",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "c",
  џ: "dz",
  ш: "s",
};

function transliterate(value: string): string {
  return value.replace(/[đćčšžőűăâîșțëäöüáéíóúýůřěňťďĺľŕôłąęńśźżığа-џ]/g, (ch) => TRANSLITERATIONS[ch] ?? ch);
}

/**
 * Case-preserving transliteration for DISPLAY (the muted line under Cyrillic
 * names on public profiles). Unlike normalizeAlias, keeps capitalization:
 * "ПИК ЗЕМУН" → "PIK ZEMUN", "Ђорђевић" → "Djordjević"-style Latin.
 * An uppercase letter maps to a fully-uppercase replacement when the next
 * character is also uppercase (all-caps words), else to a capitalized one.
 */
export function transliterateDisplay(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    const lower = ch.toLowerCase();
    const mapped = TRANSLITERATIONS[lower];
    if (mapped === undefined) {
      out += ch;
      continue;
    }
    if (ch === lower) {
      out += mapped;
    } else {
      const next = value[i + 1];
      const allCaps = next === undefined || next !== next.toLowerCase() || next === " ";
      out += allCaps
        ? mapped.toUpperCase()
        : (mapped[0]?.toUpperCase() ?? "") + mapped.slice(1);
    }
  }
  return out;
}

/** True when a name contains Cyrillic characters (drives the transliterated subtitle). */
export function hasCyrillic(value: string): boolean {
  return /[Ѐ-ӿ]/.test(value);
}

export function slugify(name: string): string {
  const base = transliterate(name.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base === "" ? "entity" : base;
}

export function normalizeAlias(name: string): string {
  return transliterate(name.toLowerCase())
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Legal-form tokens as they appear AFTER normalizeAlias (punctuation already
 * stripped, so "d.o.o." === "doo", "s.r.l" === "srl", "sp. z o.o." === "sp z oo").
 */
const LEGAL_FORM_TOKENS = new Set([
  "doo",
  "ad",
  "dd",
  "jsc",
  "llc",
  "ltd",
  "gmbh",
  "ag",
  "sa",
  "srl",
  "kft",
  "zrt",
  "nyrt",
  "spolka",
  "ood",
  "eood",
  "ead",
  "sad",
  "se",
  "plc",
  "bv",
  "nv",
  "oy",
  "as",
]);

// Multi-token legal forms, matched against the tail before single tokens.
const LEGAL_FORM_SEQUENCES = [["sp", "z", "oo"]];

/**
 * Matching-only core form of a company name: normalizeAlias, then strip trailing
 * legal-form tokens (one or more), plus trailing city tokens (max two) ONLY when
 * they follow a legal form ("adriatic capital partners doo beograd" →
 * "adriatic capital partners"). Display names stay untouched everywhere.
 */
export function companyNameCore(name: string): string {
  const normalized = normalizeAlias(name);
  const tokens = normalized.split(" ").filter(Boolean);

  const legalStart = (end: number): number => {
    for (const seq of LEGAL_FORM_SEQUENCES) {
      const start = end - seq.length;
      if (start >= 0 && seq.every((token, i) => tokens[start + i] === token)) {
        return start;
      }
    }
    const last = tokens[end - 1];
    return end > 0 && last !== undefined && LEGAL_FORM_TOKENS.has(last) ? end - 1 : end;
  };

  const stripLegalRun = (end: number): number => {
    let cursor = end;
    while (cursor > 1) {
      const next = legalStart(cursor);
      if (next === cursor) {
        break;
      }
      cursor = next;
    }
    return cursor;
  };

  let end = tokens.length;
  let sawLegal = false;

  // First pass: [legal+] at the tail, or [legal+][city tokens (max 2)] after it.
  const direct = stripLegalRun(end);
  if (direct < end) {
    end = direct;
    sawLegal = true;
  } else {
    let probe = end;
    let cities = 0;
    while (probe > 1 && cities < 2 && legalStart(probe) === probe) {
      probe -= 1;
      cities += 1;
    }
    if (cities > 0 && legalStart(probe) < probe) {
      end = stripLegalRun(probe);
      sawLegal = true;
    }
  }

  // Further alternation handles city words that collide with legal tokens
  // ("banka intesa ad novi sad" — "sad" is both). Guarded: the remaining core
  // must keep at least two tokens, so real name words never get eaten.
  while (sawLegal) {
    let probe = end;
    let cities = 0;
    while (probe > 1 && cities < 2 && legalStart(probe) === probe) {
      probe -= 1;
      cities += 1;
    }
    if (cities === 0 || legalStart(probe) === probe) {
      break;
    }
    const after = stripLegalRun(probe);
    if (after < 2) {
      break;
    }
    end = after;
  }

  if (!sawLegal) {
    return normalized;
  }
  const core = tokens.slice(0, end).join(" ");
  return core === "" ? normalized : core;
}
