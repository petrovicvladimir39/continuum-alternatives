import "./env";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { slugify } from "@continuum/shared";
import { articles, coveredFactIds, db, entities, eq, sql, timelineFacts } from "@continuum/db";
import { guardArticle, type ComposeInputs } from "./articles-guards";

/**
 * News Desk compose (reset build Part 6) — the ONLY LLM step in the reset
 * build. claude-sonnet-4-6, temperature 0.
 *
 *   pnpm articles:compose -- --limit 10 [--window-days 14]
 *
 * Groups 1–4 related APPROVED facts (same entity, recorded inside the
 * window, not yet covered by a proposed/published article) and composes a
 * short news article from ONLY: fact titles + verbatim excerpts + source
 * names + entity names. Mechanical guards (articles-guards.ts) drop any
 * draft with numbers or entity-like names not present in the inputs, wrong
 * length, missing in-prose attribution, or a model-written citation footer.
 * Every draft lands status='proposed' — publication is a human decision in
 * /admin/review; there is NO auto-publish path.
 *
 * Hard budget: the run aborts if estimated spend exceeds $2.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2000;
const BUDGET_USD = 2.0;
// claude-sonnet pricing ceiling: $3/M input, $15/M output.
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const draftSchema = z.object({
  headline: z.string(),
  deck: z.string(),
  body_md: z.string(),
});

const SYSTEM_PROMPT = `You are the news desk of Continuum Alternatives, a data platform mapping European alternative assets. You write short, sober wire articles from verified facts.

You receive: entity names, fact titles, verbatim source excerpts, and source names. These are your ONLY material. Rules:
- Use ONLY information present in the inputs. No outside knowledge, no context you "remember" about these companies, no speculation.
- Every number you write must appear in the inputs. If unsure, leave the number out.
- Every organization or person name you write must appear in the inputs, spelled exactly the same.
- Attribute in prose: at least one "according to <source name>" (or equivalent with a listed source name) must appear.
- NEVER write a sources/citations section — the platform renders citations itself.
- 2–4 paragraphs, total body STRICTLY between 420 and 1500 characters — drafts under 420 characters are discarded, so COUNT: a compliant body has at least six full sentences. When material is thin, reach the floor honestly: give each fact line its own sentence (what happened, the date from the fact line, who recorded it), quote the verbatim excerpt's substance in prose, name the source in an "according to …" clause, and close with what the record will track next based only on the listed facts. Never pad with outside knowledge or speculation.
- Institutional, factual tone; no marketing language; no exclamation marks.
- Headline ≤ 90 characters, sentence case, no clickbait. Deck ≤ 160 characters expanding the headline.

Return ONLY a JSON object: {"headline": "...", "deck": "...", "body_md": "..."} — body_md paragraphs separated by blank lines, no markdown headings.`;

type FactRow = {
  id: string;
  entityId: string;
  entityName: string;
  title: string;
  occurredOn: string;
  channels: string[] | null;
  sourceDocumentId: string | null;
  excerpt: string | null;
  sourceName: string | null;
};

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

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let limit = 10;
  let windowDays = 14;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i]!, 10);
    } else if (argv[i] === "--window-days" && argv[i + 1]) {
      windowDays = Number.parseInt(argv[++i]!, 10);
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set — compose needs the model.");
    process.exit(1);
  }

  const covered = await coveredFactIds();
  const result = await db.execute(sql`
    SELECT f.id, f.entity_id, e.name AS entity_name, f.title, f.occurred_on,
           f.audience_channels AS channels, f.source_document_id,
           f.data->>'excerpt_original' AS excerpt, s.name AS source_name
    FROM timeline_facts f
    JOIN entities e ON e.id = f.entity_id AND e.status = 'active'
    LEFT JOIN documents d ON d.id = f.source_document_id
    LEFT JOIN sources s ON s.id = d.source_id
    WHERE f.status = 'approved'
      AND coalesce(f.recorded_at, f.occurred_on::timestamptz)
            >= now() - make_interval(days => ${windowDays})
    ORDER BY f.occurred_on DESC, f.recorded_at DESC
  `);
  const facts: FactRow[] = result.rows
    .map((r) => ({
      id: String(r.id),
      entityId: String(r.entity_id),
      entityName: String(r.entity_name),
      title: String(r.title),
      occurredOn: String(r.occurred_on),
      channels: (r.channels as string[] | null) ?? [],
      sourceDocumentId: r.source_document_id === null ? null : String(r.source_document_id),
      excerpt: r.excerpt === null ? null : String(r.excerpt),
      sourceName: r.source_name === null ? null : String(r.source_name),
    }))
    .filter((f) => !covered.has(f.id));

  // Group: shared entity, up to 4 most recent facts each.
  const groups = new Map<string, FactRow[]>();
  for (const fact of facts) {
    const group = groups.get(fact.entityId) ?? [];
    if (group.length < 4) {
      group.push(fact);
    }
    groups.set(fact.entityId, group);
  }
  // Compose only groups that carry at least one VERBATIM excerpt — without
  // source material the model has nothing legitimate to write from (and
  // honestly refuses). Fact-rich, excerpt-rich groups compose first.
  const excerptCount = (group: FactRow[]) =>
    group.filter((f) => f.excerpt !== null && f.excerpt !== "").length;
  const groupList = [...groups.values()]
    .filter((group) => excerptCount(group) > 0)
    .sort((a, b) => excerptCount(b) - excerptCount(a) || b.length - a.length)
    .slice(0, limit);
  console.log(
    `articles:compose — ${facts.length} uncovered approved facts in ${windowDays}-day window → ${groupList.length} group(s), limit ${limit}`,
  );
  if (groupList.length === 0) {
    console.log("nothing to compose.");
    process.exit(0);
  }

  const client = new Anthropic();
  let spent = 0;
  let composed = 0;
  let dropped = 0;
  const report: string[] = [];

  for (const group of groupList) {
    if (spent >= BUDGET_USD) {
      console.error(`HARD BUDGET REACHED ($${spent.toFixed(2)} ≥ $${BUDGET_USD}) — aborting.`);
      break;
    }
    const inputs: ComposeInputs = {
      // Dates travel with titles so the guard accepts what the prompt showed.
      factTitles: group.map((f) => `${f.title} · ${f.occurredOn}`),
      excerpts: group.map((f) => f.excerpt ?? "").filter((e) => e !== ""),
      sourceNames: [...new Set(group.map((f) => f.sourceName ?? "").filter((s) => s !== ""))],
      entityNames: [...new Set(group.map((f) => f.entityName))],
    };
    const userPrompt = [
      `ENTITY NAMES:\n${inputs.entityNames.join("\n")}`,
      `FACTS (title · date):\n${group.map((f) => `- ${f.title} · ${f.occurredOn}`).join("\n")}`,
      `VERBATIM SOURCE EXCERPTS:\n${inputs.excerpts.map((e) => `"${e}"`).join("\n")}`,
      `SOURCE NAMES:\n${inputs.sourceNames.join("\n") || "(none — attribute to the platform record)"}`,
    ].join("\n\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const usage = response.usage;
    spent += usage.input_tokens * COST_PER_INPUT_TOKEN + usage.output_tokens * COST_PER_OUTPUT_TOKEN;
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    let draft: z.infer<typeof draftSchema>;
    try {
      draft = draftSchema.parse(parseJsonObject(text));
    } catch (error) {
      dropped += 1;
      report.push(
        `DROP (${group[0]!.entityName}): unparseable model output — ${String(error)} — raw: ${text.slice(0, 160).replace(/\s+/g, " ")}`,
      );
      continue;
    }
    const verdict = guardArticle(
      { headline: draft.headline, deck: draft.deck, bodyMd: draft.body_md },
      inputs,
    );
    if (!verdict.ok) {
      dropped += 1;
      report.push(`DROP (${group[0]!.entityName}): ${verdict.reason}`);
      continue;
    }

    // Slug: headline + date; suffix on collision.
    const base = `${slugify(draft.headline).slice(0, 70)}`;
    let slug = base;
    for (let suffix = 2; ; suffix++) {
      const clash = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
      if (clash.length === 0) {
        break;
      }
      slug = `${base}-${suffix}`;
    }
    const channels = [...new Set(group.flatMap((f) => f.channels ?? []))];
    const sourceDocumentIds = [
      ...new Set(group.map((f) => f.sourceDocumentId).filter((d): d is string => d !== null)),
    ];
    await db.insert(articles).values({
      slug,
      headline: draft.headline.trim(),
      deck: draft.deck.trim() === "" ? null : draft.deck.trim(),
      bodyMd: draft.body_md.trim(),
      status: "proposed",
      channels,
      primaryEntityId: group[0]!.entityId,
      factIds: group.map((f) => f.id),
      sourceDocumentIds,
      byline: "Continuum Desk",
    });
    composed += 1;
    report.push(`PROPOSED: ${draft.headline} (${group.length} fact(s), ${group[0]!.entityName})`);
  }

  console.log("\n=== compose report ===");
  for (const line of report) {
    console.log(line);
  }
  console.log(
    `\ncomposed ${composed} proposed article(s), dropped ${dropped}, est. cost $${spent.toFixed(4)}`,
  );
  console.log("review queue: /admin/review (Articles) — nothing publishes without approval.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
