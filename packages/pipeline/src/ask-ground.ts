import "./env";
import Anthropic from "@anthropic-ai/sdk";
import {
  ALT_TAXONOMY,
  CHANNELS,
  EUROPE_COUNTRIES,
  EUROPE_COUNTRY_NAMES,
  type AskFilters,
  type AskMatch,
} from "@continuum/shared";
import {
  getCachedGrounding,
  groundingCostToday,
  normalizeQuestion,
  storeGrounding,
  tryConsumeDailyUsage,
} from "@continuum/db";

/**
 * Ask-the-map grounding (Phase 34D) — fills the Phase 25 AskGrounder seam.
 *
 * THE CONTRACT: the model's ONLY output channel is a FORCED tool call
 * whose schema is the Filters object. It can never produce prose that
 * reaches a user; whatever it emits is validated against the closed
 * vocabularies below, unknown values are DROPPED, and the result renders
 * through the exact same chips+rails path as a deterministic parse. The
 * ask bar's UI is unchanged — this is capability, not labels.
 *
 * Invoked ONLY when deterministic parsing came up empty/weak (see
 * shouldInvokeGrounder) — the synonym maps stay the fast path.
 */

const MODEL = "claude-sonnet-4-6";
export const GROUNDED_ASKS_PER_MEMBER_PER_DAY = 20;
export const GROUNDING_DAILY_BUDGET_USD = 1.0;
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const STRATEGY_SLUGS = new Set(
  ALT_TAXONOMY.flatMap((assetClass) => assetClass.strategies.map((strategy) => strategy.slug)),
);
const CLASS_SLUGS = new Set(ALT_TAXONOMY.map((assetClass) => assetClass.slug));
const FACT_TYPE_PATTERN = /^[a-z][a-z_]{2,40}$/;

/**
 * Deterministic parse was empty/weak → the grounder MAY run. Weak = the
 * parser found no structured match (chips), leaving only free text.
 */
export function shouldInvokeGrounder(parsed: AskFilters | null, query: string): boolean {
  if (query.trim().length < 3) {
    return false;
  }
  return parsed === null || parsed.matches.length === 0;
}

/** Closed-vocabulary validation — unknown values are dropped, silently. */
export function sanitizeGroundedFilters(raw: unknown, query: string): AskFilters {
  const record = (raw ?? {}) as Record<string, unknown>;
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  const channels = strings(record.channels).filter((value) =>
    (CHANNELS as readonly string[]).includes(value),
  );
  const countries = strings(record.countries)
    .map((value) => value.toUpperCase())
    .filter((value) => (EUROPE_COUNTRIES as readonly string[]).includes(value));
  const factTypes = strings(record.fact_types).filter((value) => FACT_TYPE_PATTERN.test(value));
  const strategies = strings(record.strategies).filter((value) => STRATEGY_SLUGS.has(value));
  const assetClasses = strings(record.asset_classes).filter((value) => CLASS_SLUGS.has(value));
  const entityTerm = typeof record.entity_term === "string" ? record.entity_term.trim() : "";

  // Chips identical to deterministic parses; tokens = the full query, so
  // removing any grounded chip clears the grounded ask (honest UX — the
  // parts aren't independently attributable to query tokens).
  const tokens = [query];
  const matches: AskMatch[] = [
    ...channels.map<AskMatch>((value) => ({ kind: "channel", value, label: value.replace("_", " "), tokens })),
    ...countries.map<AskMatch>((value) => ({
      kind: "country",
      value,
      label: EUROPE_COUNTRY_NAMES[value] ?? value,
      tokens,
    })),
    ...factTypes.map<AskMatch>((value) => ({ kind: "factType", value, label: value.replaceAll("_", " "), tokens })),
    ...[...strategies, ...assetClasses].map<AskMatch>((value) => ({
      kind: "strategy",
      value,
      label: value.replaceAll("_", " "),
      tokens,
    })),
  ];
  return { channels, countries, factTypes, strategies, assetClasses, freeText: entityTerm, matches };
}

export type GroundResult =
  | { status: "grounded"; filters: AskFilters; cached: boolean }
  | { status: "cap"; message: string }
  | { status: "unavailable" };

export async function llmGroundAsk(query: string, memberId: string): Promise<GroundResult> {
  const normalized = normalizeQuestion(query);
  const cached = await getCachedGrounding(normalized);
  if (cached !== null) {
    return { status: "grounded", filters: sanitizeGroundedFilters(cached, query), cached: true };
  }
  const allowed = await tryConsumeDailyUsage(memberId, "ask_ground", GROUNDED_ASKS_PER_MEMBER_PER_DAY);
  if (!allowed) {
    return {
      status: "cap",
      message: `${GROUNDED_ASKS_PER_MEMBER_PER_DAY} grounded asks a day — the deterministic filters keep working.`,
    };
  }
  if ((await groundingCostToday()) >= GROUNDING_DAILY_BUDGET_USD || !process.env.ANTHROPIC_API_KEY) {
    return { status: "unavailable" };
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    temperature: 0,
    system:
      "You translate a reader's plain-language question about European alternative-asset markets into structured filters for a data platform. Output ONLY via the tool. Choose only values you are confident match the question's intent; leave arrays empty rather than guessing. entity_term is a company/fund name fragment if the question names one.",
    // The FORCED tool call is the entire output surface — no prose exists.
    tools: [
      {
        name: "set_filters",
        description: "Set the ask-bar filters this question translates to.",
        input_schema: {
          type: "object",
          properties: {
            channels: { type: "array", items: { type: "string", enum: [...CHANNELS] } },
            asset_classes: { type: "array", items: { type: "string", enum: [...CLASS_SLUGS] } },
            strategies: { type: "array", items: { type: "string", enum: [...STRATEGY_SLUGS] } },
            countries: { type: "array", items: { type: "string" }, description: "ISO-2 codes" },
            fact_types: {
              type: "array",
              items: { type: "string" },
              description:
                "e.g. insolvency_opened, asset_sale_announced, fund_close, funding_round, acquisition, advisor_mandate",
            },
            entity_term: { type: "string" },
          },
          required: [],
        },
      },
    ],
    tool_choice: { type: "tool", name: "set_filters" },
    messages: [{ role: "user", content: query.slice(0, 300) }],
  });
  const usage = response.usage;
  const costUsd =
    usage.input_tokens * COST_PER_INPUT_TOKEN + usage.output_tokens * COST_PER_OUTPUT_TOKEN;
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  const rawFilters = toolUse?.input ?? {};
  await storeGrounding(normalized, rawFilters, costUsd);
  return { status: "grounded", filters: sanitizeGroundedFilters(rawFilters, query), cached: false };
}
