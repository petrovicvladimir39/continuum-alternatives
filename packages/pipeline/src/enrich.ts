import Anthropic from "@anthropic-ai/sdk";
import { Langfuse } from "langfuse";
import { z } from "zod";
import { db, entities, eq, organizations } from "@continuum/db";
import { normalizeAlias } from "@continuum/shared";
import { stripHtml, USER_AGENT } from "./crawl-shared";
import { scrapePage } from "./firecrawl";

/**
 * AI company enrichment (Phase 17) — extraction and synthesis only, grounded
 * in the company's OWN website text. Phase 10 discipline applies: the one
 * generated field (overview_en) publishes directly because it is labeled and
 * sourced; every factual field passes MECHANICAL guards (must appear in the
 * fetched text) and then lands as a PROPOSED review-queue item — a human thumb
 * before anything reaches the org detail. entities.summary is never touched.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1200;
const TEXT_CAP = 15_000;
const FETCH_TIMEOUT_MS = 15_000;
const ABOUT_PATHS = ["/about", "/about-us", "/o-nama", "/despre"];

export const enrichmentSchema = z.object({
  overview_en: z.string().min(40),
  founded_year: z.number().int().min(1200).max(2100).optional(),
  hq_address: z.string().min(4).optional(),
  team_size_text: z.string().min(1).optional(),
  strategy_focus: z.array(z.string().min(2)).max(8).optional(),
  aum_text: z.string().min(1).optional(),
  source_urls: z.array(z.string().url()).min(1),
});

export type EnrichmentRaw = z.infer<typeof enrichmentSchema>;

export type EnrichmentGuardStats = {
  droppedFoundedYear: number;
  droppedHqAddress: number;
  droppedTeamSize: number;
  droppedAum: number;
};

export type GuardedEnrichment = {
  overview_en: string;
  strategy_focus: string[];
  source_urls: string[];
  proposed: {
    founded_year?: number;
    hq_address?: string;
    team_size_text?: string;
    aum_text?: string;
  };
  guardStats: EnrichmentGuardStats;
};

/**
 * MECHANICAL GUARDS, pure and exported for verification:
 *   founded_year    must appear as a 4-digit string in the fetched text
 *   hq_address      must appear substring-normalized (normalizeAlias both sides)
 *   team_size_text  VERBATIM substring of the fetched text
 *   aum_text        VERBATIM substring of the fetched text
 * Anything failing its guard is dropped and counted — never proposed.
 */
export function applyEnrichmentGuards(raw: EnrichmentRaw, fetchedText: string): GuardedEnrichment {
  const guardStats: EnrichmentGuardStats = {
    droppedFoundedYear: 0,
    droppedHqAddress: 0,
    droppedTeamSize: 0,
    droppedAum: 0,
  };
  const normalizedText = normalizeAlias(fetchedText);
  const proposed: GuardedEnrichment["proposed"] = {};

  if (raw.founded_year !== undefined) {
    if (fetchedText.includes(String(raw.founded_year))) {
      proposed.founded_year = raw.founded_year;
    } else {
      guardStats.droppedFoundedYear += 1;
    }
  }
  if (raw.hq_address !== undefined) {
    if (normalizedText.includes(normalizeAlias(raw.hq_address))) {
      proposed.hq_address = raw.hq_address;
    } else {
      guardStats.droppedHqAddress += 1;
    }
  }
  if (raw.team_size_text !== undefined) {
    if (fetchedText.includes(raw.team_size_text)) {
      proposed.team_size_text = raw.team_size_text;
    } else {
      guardStats.droppedTeamSize += 1;
    }
  }
  if (raw.aum_text !== undefined) {
    if (fetchedText.includes(raw.aum_text)) {
      proposed.aum_text = raw.aum_text;
    } else {
      guardStats.droppedAum += 1;
    }
  }

  return {
    overview_en: raw.overview_en,
    strategy_focus: raw.strategy_focus ?? [],
    source_urls: raw.source_urls,
    proposed,
    guardStats,
  };
}

/** One grouped review item per org: which proposed fields await a decision. */
export function proposedFieldsOf(enrichment: unknown): string[] {
  if (enrichment === null || typeof enrichment !== "object") {
    return [];
  }
  const proposed = (enrichment as { proposed?: Record<string, unknown> }).proposed;
  if (proposed === undefined || proposed === null) {
    return [];
  }
  return Object.keys(proposed).filter((key) => proposed[key] !== undefined && proposed[key] !== null);
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

export type FetchedSite = {
  text: string;
  urls: string[];
  firecrawlUsed: boolean;
};

/**
 * Homepage + the first about-page variant that responds 200 — max 2 pages,
 * plain fetch. Firecrawl fallback ONLY when both come back empty (counted).
 */
export async function fetchCompanyText(website: string): Promise<FetchedSite> {
  const base = website.replace(/\/+$/, "");
  const urls: string[] = [];
  let combined = "";
  let firecrawlUsed = false;

  const home = await fetchPage(base);
  if (home !== null && stripHtml(home).trim() !== "") {
    combined += stripHtml(home);
    urls.push(base);
  }
  for (const path of ABOUT_PATHS) {
    if (urls.length >= 2) {
      break;
    }
    const about = await fetchPage(`${base}${path}`);
    if (about !== null && stripHtml(about).trim() !== "") {
      combined += `\n\n${stripHtml(about)}`;
      urls.push(`${base}${path}`);
      break; // first that 200s — max 2 pages total
    }
  }

  if (combined.trim() === "") {
    try {
      const scraped = await scrapePage(base);
      if (scraped.markdown.trim() !== "") {
        combined = scraped.markdown;
        urls.push(base);
        firecrawlUsed = true;
      }
    } catch {
      // Firecrawl unavailable or blocked — enrichment simply skips this org.
    }
  }

  return { text: combined.slice(0, TEXT_CAP), urls, firecrawlUsed };
}

const SYSTEM_PROMPT = `You write structured company enrichment records for an institutional data platform covering alternative investments in emerging Europe.

You are given text fetched from a company's own website. Return ONLY a JSON object with this exact shape:

{
  "overview_en": string,        // REQUIRED. 2–4 sentences in neutral, institutional English describing what the firm does, grounded STRICTLY in the provided site text. No marketing superlatives. No information that is not in the text.
  "founded_year": number,       // OPTIONAL. Only if a founding year appears in the text.
  "hq_address": string,         // OPTIONAL. Only if a street address appears in the text, verbatim as printed.
  "team_size_text": string,     // OPTIONAL. VERBATIM fragment from the text stating team size (e.g. "a team of 25 professionals"). Never paraphrase.
  "strategy_focus": string[],   // OPTIONAL. Up to 8 short lowercase strategy/sector keywords grounded in the text (e.g. "buyouts", "growth equity", "npl portfolios").
  "aum_text": string,           // OPTIONAL. VERBATIM fragment stating assets under management / fund size as printed. Never compute or normalize numbers.
  "source_urls": string[]       // REQUIRED. Exactly the URLs you were told the text came from.
}

Omit every optional field you cannot ground in the text. Transcribe amounts and sizes as raw text; NEVER do arithmetic or unit conversion.`;

let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — required for enrichment");
  }
  anthropic ??= new Anthropic();
  return anthropic;
}

let langfuse: Langfuse | null | undefined;
function getLangfuse(): Langfuse | null {
  if (langfuse === undefined) {
    langfuse =
      process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY ? new Langfuse() : null;
  }
  return langfuse;
}

function parseJsonResponse(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

export type EnrichUsage = { inputTokens: number; outputTokens: number };

export type EnrichResult = {
  status: "done" | "skipped" | "empty";
  message?: string;
  usage: EnrichUsage;
  firecrawlUsed: boolean;
  guardStats?: EnrichmentGuardStats;
  proposedFields?: string[];
};

/** Full enrichment pass for one active organization with a website. */
export async function enrichOrganization(entityId: string): Promise<EnrichResult> {
  const usage: EnrichUsage = { inputTokens: 0, outputTokens: 0 };
  const rows = await db
    .select({
      id: entities.id,
      name: entities.name,
      status: entities.status,
      website: organizations.website,
    })
    .from(entities)
    .innerJoin(organizations, eq(organizations.entityId, entities.id))
    .where(eq(entities.id, entityId));
  const org = rows[0];
  if (org === undefined || org.status !== "active" || org.website === null) {
    return { status: "skipped", message: "not an active org with website", usage, firecrawlUsed: false };
  }

  const site = await fetchCompanyText(org.website);
  if (site.text.trim() === "") {
    return { status: "empty", message: "no fetchable site text", usage, firecrawlUsed: site.firecrawlUsed };
  }

  const client = getAnthropicClient();
  const lf = getLangfuse();
  const trace = lf?.trace({ name: "enrich-organization", metadata: { entityId, model: MODEL } });

  const userPrompt = `Company: ${org.name}\nSource URLs: ${site.urls.join(", ")}\n\nWebsite text:\n"""\n${site.text}\n"""`;

  const ask = async (messages: Anthropic.MessageParam[], name: string): Promise<string> => {
    const generation = trace?.generation({ name, model: MODEL, input: messages });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages,
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
    generation?.end({
      output: text,
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
    return text;
  };

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  let raw: EnrichmentRaw;
  try {
    const first = await ask(messages, "enrich");
    const validated = enrichmentSchema.safeParse(parseJsonResponse(first));
    if (validated.success) {
      raw = validated.data;
    } else {
      const repair = await ask(
        [
          ...messages,
          { role: "assistant", content: first },
          {
            role: "user",
            content: `Your response failed validation: ${JSON.stringify(validated.error.issues.slice(0, 5))}\nReturn the corrected JSON object only.`,
          },
        ],
        "enrich-repair",
      );
      const repaired = enrichmentSchema.safeParse(parseJsonResponse(repair));
      if (!repaired.success) {
        throw new Error(
          `Enrichment failed after repair: ${JSON.stringify(repaired.error.issues.slice(0, 5))}`,
        );
      }
      raw = repaired.data;
    }
  } finally {
    trace?.update({ output: { usage } });
    await lf?.flushAsync().catch(() => undefined);
  }

  const guarded = applyEnrichmentGuards(raw, site.text);

  // overview_en publishes directly (labeled + sourced on the profile); the
  // guarded factual fields land under `proposed` for the review queue.
  await db
    .update(organizations)
    .set({
      enrichment: {
        overview_en: guarded.overview_en,
        strategy_focus: guarded.strategy_focus,
        source_urls: site.urls,
        proposed: guarded.proposed,
        guard_stats: guarded.guardStats,
        model: MODEL,
        firecrawl_used: site.firecrawlUsed,
      },
      enrichedAt: new Date(),
    })
    .where(eq(organizations.entityId, entityId));

  return {
    status: "done",
    usage,
    firecrawlUsed: site.firecrawlUsed,
    guardStats: guarded.guardStats,
    proposedFields: proposedFieldsOf({ proposed: guarded.proposed }),
  };
}
