import { ALT_TAXONOMY, CLASS_LEVEL } from "./alt-taxonomy";
import { EUROPE_COUNTRY_NAMES } from "./countries";

/**
 * The Ask bar's deterministic parser (Phase 25B). NO LLM: tokenizes the
 * query against synonym maps for channels, countries (EN + ISO2 + key local
 * names), and fact types; whatever remains becomes free text for the
 * entity-name fallthrough (performed by the caller against findEntities).
 *
 * ── SEAM ──────────────────────────────────────────────────────────────────
 * `AskGrounder` is the interface a future llmGroundAsk() implements when
 * ask-the-map arrives (a later phase): same input, same AskFilters output,
 * so the news front swaps grounders without touching URL state or chips.
 * parseAsk is the deterministic default grounder and always remains the
 * fallback.
 */

export type AskMatch = {
  kind: "channel" | "country" | "factType" | "strategy";
  value: string;
  label: string;
  /** The query tokens that produced this filter — chip removal deletes them. */
  tokens: string[];
};

export type AskFilters = {
  channels: string[];
  countries: string[];
  factTypes: string[];
  /** Taxonomy strategy slugs (Phase 26C). */
  strategies: string[];
  /** Taxonomy asset-class slugs when a class-level synonym matched. */
  assetClasses: string[];
  freeText: string;
  matches: AskMatch[];
};

export interface AskGrounder {
  ground(query: string): Promise<AskFilters | null>;
}

/** Lowercase + strip diacritics so "Česko" matches "cesko". */
export function normalizeAskToken(token: string): string {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9&]/g, "");
}

const CHANNEL_SYNONYMS: Record<string, string[]> = {
  pe: ["pe", "private equity", "buyout", "buyouts", "lbo", "growth equity"],
  vc_founders: ["vc", "venture", "venture capital", "startup", "startups", "seed", "founders"],
  private_credit: [
    "credit", "lending", "direct lending", "private credit", "private debt", "debt", "lenders",
  ],
  distressed: [
    "distressed", "npl", "npls", "insolvency", "insolvencies", "special situations",
    "bankruptcy", "bankruptcies", "restructuring", "workout",
  ],
  lp_institutional: ["lp", "lps", "institutional", "institutions", "pension", "pensions", "allocators"],
  vendors: ["advisors", "advisor", "advisory", "law", "legal", "vendors", "servicers", "mandates"],
};

const CHANNEL_LABELS: Record<string, string> = {
  pe: "Private equity",
  vc_founders: "Venture capital",
  private_credit: "Private credit",
  distressed: "Distressed",
  lp_institutional: "LPs & institutions",
  vendors: "Service providers",
};

/** Key local-language country names beyond the EN set (normalized form → ISO2). */
const LOCAL_COUNTRY_NAMES: Record<string, string> = {
  polska: "PL",
  cesko: "CZ",
  ceska: "CZ",
  deutschland: "DE",
  espana: "ES",
  italia: "IT",
  srbija: "RS",
  hrvatska: "HR",
  magyarorszag: "HU",
  osterreich: "AT",
  slovensko: "SK",
  slovenija: "SI",
  romania: "RO",
  sverige: "SE",
  norge: "NO",
  suomi: "FI",
  danmark: "DK",
  nederland: "NL",
  belgie: "BE",
  belgique: "BE",
  schweiz: "CH",
  suisse: "CH",
  ellada: "GR",
  shqiperia: "AL",
  bulgaria: "BG",
  ukraina: "UA",
  uk: "GB",
  britain: "GB",
  england: "GB",
};

const FACT_TYPE_SYNONYMS: Record<string, { types: string[]; label: string }> = {
  deals: { types: ["acquisition"], label: "Deals" },
  deal: { types: ["acquisition"], label: "Deals" },
  acquisitions: { types: ["acquisition"], label: "Deals" },
  rounds: { types: ["funding_round"], label: "Rounds" },
  round: { types: ["funding_round"], label: "Rounds" },
  fundraisings: { types: ["funding_round"], label: "Rounds" },
  auctions: { types: ["asset_sale_announced"], label: "Auctions" },
  auction: { types: ["asset_sale_announced"], label: "Auctions" },
  sales: { types: ["asset_sale_announced"], label: "Auctions" },
  // Singular "insolvency" stays a CHANNEL word (distressed); the plural and
  // "filings" mean the fact type.
  insolvencies: { types: ["insolvency_opened"], label: "Insolvencies" },
  filings: { types: ["insolvency_opened"], label: "Insolvencies" },
  "fund closes": { types: ["fund_close"], label: "Fund closes" },
  "fund close": { types: ["fund_close"], label: "Fund closes" },
  closes: { types: ["fund_close"], label: "Fund closes" },
};

type SynonymEntry = {
  kind: "channel" | "country" | "factType" | "strategy";
  value: string;
  label: string;
};

/** Build the phrase table once: normalized phrase (words joined by space) → entry. */
function buildPhraseTable(): Map<string, SynonymEntry> {
  const table = new Map<string, SynonymEntry>();
  for (const [channel, synonyms] of Object.entries(CHANNEL_SYNONYMS)) {
    for (const synonym of synonyms) {
      table.set(
        synonym.split(/\s+/).map(normalizeAskToken).join(" "),
        { kind: "channel", value: channel, label: CHANNEL_LABELS[channel] ?? channel },
      );
    }
  }
  for (const [code, name] of Object.entries(EUROPE_COUNTRY_NAMES)) {
    table.set(name.split(/\s+/).map(normalizeAskToken).join(" "), {
      kind: "country",
      value: code,
      label: name,
    });
    table.set(normalizeAskToken(code), { kind: "country", value: code, label: name });
  }
  for (const [local, code] of Object.entries(LOCAL_COUNTRY_NAMES)) {
    table.set(normalizeAskToken(local), {
      kind: "country",
      value: code,
      label: EUROPE_COUNTRY_NAMES[code] ?? code,
    });
  }
  for (const [phrase, entry] of Object.entries(FACT_TYPE_SYNONYMS)) {
    table.set(phrase.split(/\s+/).map(normalizeAskToken).join(" "), {
      kind: "factType",
      value: entry.types.join(","),
      label: entry.label,
    });
  }
  // Taxonomy synonyms (Phase 26C). Channels/countries/fact-types keep
  // precedence on collisions ("venture capital" stays the channel — the
  // channel front already carries that content); taxonomy fills the rest
  // ("cat bonds", "CLOs", "music royalties", "farmland" …). Strategy match
  // values are "<class>:<strategy>" ('' strategy = class-level); chip labels
  // carry the class prefix ("Climate & Insurance · Cat Bonds & ILS").
  for (const assetClass of ALT_TAXONOMY) {
    for (const synonym of assetClass.synonyms) {
      const key = synonym.split(/\s+/).map(normalizeAskToken).join(" ");
      if (!table.has(key)) {
        table.set(key, {
          kind: "strategy",
          value: `${assetClass.slug}:${CLASS_LEVEL}`,
          label: assetClass.label,
        });
      }
    }
    for (const strategy of assetClass.strategies) {
      for (const synonym of strategy.synonyms) {
        const key = synonym.split(/\s+/).map(normalizeAskToken).join(" ");
        if (!table.has(key)) {
          table.set(key, {
            kind: "strategy",
            value: `${assetClass.slug}:${strategy.slug}`,
            label: `${assetClass.label} · ${strategy.label}`,
          });
        }
      }
    }
  }
  return table;
}

const PHRASE_TABLE = buildPhraseTable();
const STOPWORDS = new Set(["in", "the", "of", "for", "and", "on", "at", "a", "an", "with", "eg", "to"]);

/**
 * Deterministic parse. Greedy longest-phrase-first (3→2→1 words); unmatched
 * non-stopword tokens accumulate into freeText for the entity fallthrough.
 * Returns null for an effectively empty query.
 */
export function parseAsk(query: string): AskFilters | null {
  const rawTokens = query.split(/\s+/).filter((t) => t !== "");
  if (rawTokens.length === 0) {
    return null;
  }
  const normalized = rawTokens.map(normalizeAskToken);

  const filters: AskFilters = {
    channels: [],
    countries: [],
    factTypes: [],
    strategies: [],
    assetClasses: [],
    freeText: "",
    matches: [],
  };
  const freeTokens: string[] = [];
  let i = 0;

  const addMatch = (entry: SynonymEntry, tokens: string[]) => {
    if (entry.kind === "strategy") {
      const [classSlug, strategySlug] = entry.value.split(":");
      if (strategySlug !== undefined && strategySlug !== "") {
        if (!filters.strategies.includes(strategySlug)) {
          filters.strategies.push(strategySlug);
        }
      } else if (classSlug !== undefined && !filters.assetClasses.includes(classSlug)) {
        filters.assetClasses.push(classSlug);
      }
    } else {
      const values = entry.kind === "factType" ? entry.value.split(",") : [entry.value];
      const target =
        entry.kind === "channel"
          ? filters.channels
          : entry.kind === "country"
            ? filters.countries
            : filters.factTypes;
      for (const value of values) {
        if (!target.includes(value)) {
          target.push(value);
        }
      }
    }
    // One chip per distinct filter value; repeated mentions merge tokens.
    const existing = filters.matches.find(
      (m) => m.kind === entry.kind && m.value === entry.value,
    );
    if (existing !== undefined) {
      existing.tokens.push(...tokens);
    } else {
      filters.matches.push({ kind: entry.kind, value: entry.value, label: entry.label, tokens: [...tokens] });
    }
  };

  while (i < rawTokens.length) {
    let consumed = 0;
    for (const length of [3, 2, 1]) {
      if (i + length > rawTokens.length) {
        continue;
      }
      const phrase = normalized.slice(i, i + length).filter((t) => t !== "").join(" ");
      const entry = PHRASE_TABLE.get(phrase);
      if (entry !== undefined && phrase !== "") {
        addMatch(entry, rawTokens.slice(i, i + length));
        consumed = length;
        break;
      }
    }
    if (consumed === 0) {
      if (!STOPWORDS.has(normalized[i] ?? "") && normalized[i] !== "") {
        freeTokens.push(rawTokens[i]!);
      }
      consumed = 1;
    }
    i += consumed;
  }

  filters.freeText = freeTokens.join(" ").trim();
  if (
    filters.channels.length === 0 &&
    filters.countries.length === 0 &&
    filters.factTypes.length === 0 &&
    filters.strategies.length === 0 &&
    filters.assetClasses.length === 0 &&
    filters.freeText === ""
  ) {
    return null;
  }
  return filters;
}

/** Rebuild the shareable ?q= string with one chip's source tokens removed. */
export function removeChipFromQuery(query: string, chipTokens: string[]): string {
  const remaining = [...chipTokens];
  return query
    .split(/\s+/)
    .filter((token) => {
      const index = remaining.indexOf(token);
      if (index >= 0) {
        remaining.splice(index, 1);
        return false;
      }
      return true;
    })
    .join(" ")
    .trim();
}
