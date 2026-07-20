import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  BRIEF_GLOBAL_DAILY_BUDGET_USD,
  BRIEF_MEMBER_MONTHLY_CAP,
} from "@continuum/shared";
import {
  briefCostTodayUsd,
  computeBriefDataVersion,
  countBriefGenerationsThisMonth,
  db,
  getBrief,
  logBriefGeneration,
  orgEnrichmentOf,
  sql,
  upsertBrief,
  type BriefContent,
} from "@continuum/db";
import type { ComposeInputs } from "./articles-guards";
import { guardBrief, INTERNAL_SOURCE_NAME } from "./brief-guards";

/**
 * Entity brief compose (Phase 29D) — the ONE member-facing LLM feature.
 * claude-sonnet-4-6, temperature 0. Inputs are ONLY: the entity + detail +
 * approved classifications, approved timeline facts with excerpts + source
 * names, approved edges with counterpart names, and the enrichment overview
 * when present. Guards (brief-guards.ts) drop any output with numbers or
 * names not in the inputs, uncited key facts, or broken structure.
 *
 * Deterministic gates run BEFORE the model, in this order:
 *   cache fresh → member monthly cap → global daily budget → material check.
 * Cached views are free and uncounted.
 */

export const BRIEF_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;
// claude-sonnet pricing ceiling: $3/M input, $15/M output.
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const briefSchema = z.object({
  summary: z.string(),
  key_facts: z.array(z.string()).max(6),
  relationships: z.array(z.string()).max(5),
  watch_points: z.array(z.string()).max(3),
});

const SYSTEM_PROMPT = `You are the research desk of Continuum Alternatives, a data platform mapping European alternative assets. You write institutional one-page briefs from verified platform records.

You receive: an entity's profile fields, its approved timeline facts (title · date) with verbatim source excerpts and source names, its approved relationships, and (sometimes) a sourced company overview. This is your ONLY material. Rules:
- Use ONLY information present in the inputs. No outside knowledge, no memory of these companies, no speculation.
- Every number you write must appear in the inputs. If unsure, leave the number out.
- Every organization or person name you write must appear in the inputs, spelled exactly the same.
- summary: 3–5 sentences describing what the record shows about this entity. Sober, factual, no marketing language.
- key_facts: up to 6 bullets, each a single concrete fact from the timeline, each ENDING with the source name in square brackets, e.g. "... [${"${SOURCE}"}]". Use the exact source names listed; for facts listed without a source name use "[${INTERNAL_SOURCE_NAME}]".
- relationships: up to 5 lines, each one relationship from the list given ("<phrase> <counterpart>" with role/date when given). Omit the section (empty array) if no relationships are listed.
- watch_points: up to 3 lines, each strictly derived from facts PRESENT in the inputs (e.g. an announced auction date, an open insolvency, a pending sale). NEVER speculate, forecast, or infer beyond what a listed fact states. Empty array if nothing qualifies.
- Institutional tone; no exclamation marks; no advice; no valuation opinions.

Return ONLY a JSON object: {"summary": "...", "key_facts": ["..."], "relationships": ["..."], "watch_points": ["..."]}`;

function parseJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("no JSON object in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

export type BriefMaterial = {
  inputs: ComposeInputs;
  userPrompt: string;
  sourceNames: string[];
};

/** Everything the model may see, gathered by deterministic SQL. */
export async function gatherBriefMaterial(entityId: string): Promise<BriefMaterial | null> {
  const entityResult = await db.execute(sql`
    SELECT e.name, e.kind, e.country, e.summary, o.hq_city, o.website, o.founded_year, o.enrichment
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    WHERE e.id = ${entityId} AND e.status = 'active'
  `);
  const entity = entityResult.rows[0];
  if (entity === undefined) {
    return null;
  }

  const classificationResult = await db.execute(sql`
    SELECT asset_class, strategy FROM entity_classifications
    WHERE entity_id = ${entityId} AND status = 'approved'
    ORDER BY asset_class, strategy
  `);
  const classifications = classificationResult.rows.map((row) =>
    row.strategy === "" ? String(row.asset_class) : `${String(row.asset_class)} · ${String(row.strategy)}`,
  );

  const factsResult = await db.execute(sql`
    SELECT f.title, f.occurred_on, f.fact_type,
           f.data->>'excerpt_original' AS excerpt, s.name AS source_name
    FROM timeline_facts f
    LEFT JOIN documents d ON d.id = f.source_document_id
    LEFT JOIN sources s ON s.id = d.source_id
    WHERE f.entity_id = ${entityId} AND f.status = 'approved'
    ORDER BY f.occurred_on ASC, f.recorded_at ASC
  `);
  if (factsResult.rows.length === 0) {
    return null; // a brief without facts would be an invention
  }
  const factLines = factsResult.rows.map((row) => {
    const source = row.source_name === null ? INTERNAL_SOURCE_NAME : String(row.source_name);
    return `- ${String(row.title)} · ${String(row.occurred_on)} [${source}]`;
  });
  const excerpts = factsResult.rows
    .map((row) => (row.excerpt === null ? "" : String(row.excerpt)))
    .filter((excerpt) => excerpt !== "");
  const sourceNames = [
    ...new Set(
      factsResult.rows
        .map((row) => (row.source_name === null ? "" : String(row.source_name)))
        .filter((name) => name !== ""),
    ),
  ];

  const edgesResult = await db.execute(sql`
    SELECT x.edge_type, x.role, x.started_on, c.name AS counterpart_name,
           (x.source_entity_id = ${entityId}) AS outgoing
    FROM edges x
    JOIN entities c ON c.id = CASE WHEN x.source_entity_id = ${entityId}
                                   THEN x.target_entity_id ELSE x.source_entity_id END
    WHERE (x.source_entity_id = ${entityId} OR x.target_entity_id = ${entityId})
      AND x.status = 'approved'
    ORDER BY x.edge_type, c.name
  `);
  const edgeLines = edgesResult.rows.map((row) => {
    const direction = row.outgoing === true ? "→" : "←";
    const role = row.role === null ? "" : ` (${String(row.role)})`;
    const since = row.started_on === null ? "" : ` · since ${String(row.started_on)}`;
    return `- ${String(row.edge_type).replaceAll("_", " ")} ${direction} ${String(row.counterpart_name)}${role}${since}`;
  });
  const counterpartNames = [...new Set(edgesResult.rows.map((row) => String(row.counterpart_name)))];

  const enrichment = orgEnrichmentOf(entity.enrichment ?? null);

  const profileLines = [
    `Name: ${String(entity.name)}`,
    entity.country !== null ? `Country: ${String(entity.country)}` : "",
    entity.hq_city !== null ? `City: ${String(entity.hq_city)}` : "",
    entity.founded_year !== null ? `Founded: ${String(entity.founded_year)}` : "",
    entity.summary !== null && entity.summary !== "" ? `Profile summary: ${String(entity.summary)}` : "",
    classifications.length > 0 ? `Classifications: ${classifications.join("; ")}` : "",
  ].filter((line) => line !== "");

  // The model cannot know the date — supply it so past/upcoming reads
  // honestly (and its digits become legitimate guard material).
  const todayLine = `Today's date: ${new Date().toISOString().slice(0, 10)}`;
  const userPrompt = [
    todayLine,
    `ENTITY:\n${profileLines.join("\n")}`,
    `APPROVED TIMELINE FACTS (title · date [source name]):\n${factLines.join("\n")}`,
    excerpts.length > 0
      ? `VERBATIM SOURCE EXCERPTS:\n${excerpts.map((excerpt) => `"${excerpt}"`).join("\n")}`
      : "",
    edgeLines.length > 0 ? `APPROVED RELATIONSHIPS:\n${edgeLines.join("\n")}` : "APPROVED RELATIONSHIPS:\n(none)",
    enrichment !== null ? `COMPANY OVERVIEW (from the company's website):\n${enrichment.overview_en}` : "",
    `SOURCE NAMES YOU MAY CITE:\n${[...sourceNames, INTERNAL_SOURCE_NAME].join("\n")}`,
  ]
    .filter((section) => section !== "")
    .join("\n\n");

  const inputs: ComposeInputs = {
    factTitles: factsResult.rows.map(
      (row) => `${String(row.title)} · ${String(row.occurred_on)}`,
    ),
    // The profile fields + overview + date line feed the guards too — a
    // number or name from them is legitimate material, not a fabrication.
    excerpts: [
      ...excerpts,
      ...profileLines,
      todayLine,
      ...(enrichment === null ? [] : [enrichment.overview_en]),
    ],
    sourceNames,
    entityNames: [String(entity.name), ...counterpartNames],
  };
  return { inputs, userPrompt, sourceNames };
}

export type BriefResult =
  | { ok: true; content: BriefContent; cached: boolean; costUsd: number }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "member_cap"
        | "daily_budget"
        | "no_material"
        | "dropped_guard"
        | "dropped_parse";
      detail?: string;
    };

/**
 * The single entry point for brief generation. `memberId` null = operator
 * path (verify/live report) — still budget-guarded, never member-capped.
 */
export async function generateEntityBrief(input: {
  entityId: string;
  memberId: string | null;
}): Promise<BriefResult> {
  const dataVersion = await computeBriefDataVersion(input.entityId);
  const cached = await getBrief(input.entityId);
  if (cached !== null && cached.dataVersion === dataVersion) {
    return { ok: true, content: cached.content as BriefContent, cached: true, costUsd: 0 };
  }

  if (input.memberId !== null) {
    const used = await countBriefGenerationsThisMonth(input.memberId);
    if (used >= BRIEF_MEMBER_MONTHLY_CAP) {
      return { ok: false, reason: "member_cap" };
    }
  }
  const spentToday = await briefCostTodayUsd();
  if (spentToday >= BRIEF_GLOBAL_DAILY_BUDGET_USD) {
    return { ok: false, reason: "daily_budget" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "not_configured" };
  }
  const material = await gatherBriefMaterial(input.entityId);
  if (material === null) {
    return { ok: false, reason: "no_material" };
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: material.userPrompt }],
  });
  const costUsd =
    response.usage.input_tokens * COST_PER_INPUT_TOKEN +
    response.usage.output_tokens * COST_PER_OUTPUT_TOKEN;
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const logBase = {
    memberId: input.memberId,
    entityId: input.entityId,
    costUsd,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  let draft: z.infer<typeof briefSchema>;
  try {
    draft = briefSchema.parse(parseJsonObject(text));
  } catch (error) {
    await logBriefGeneration({ ...logBase, outcome: "dropped_parse" });
    return { ok: false, reason: "dropped_parse", detail: String(error) };
  }
  const verdict = guardBrief(draft, material.inputs);
  if (!verdict.ok) {
    await logBriefGeneration({ ...logBase, outcome: "dropped_guard" });
    return { ok: false, reason: "dropped_guard", detail: verdict.reason };
  }

  const content: BriefContent = {
    summary: draft.summary.trim(),
    key_facts: draft.key_facts.map((fact) => fact.trim()),
    relationships: draft.relationships.map((line) => line.trim()),
    watch_points: draft.watch_points.map((line) => line.trim()),
    source_names: material.sourceNames,
  };
  await upsertBrief({
    entityId: input.entityId,
    content,
    dataVersion,
    model: BRIEF_MODEL,
    generatedByMemberId: input.memberId,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    costUsd,
  });
  await logBriefGeneration({ ...logBase, outcome: "stored" });
  return { ok: true, content, cached: false, costUsd };
}
