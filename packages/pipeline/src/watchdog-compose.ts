import "./env";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import {
  getWatchdogBrief,
  markWatchdogSent,
  resolveMemberTier,
  storeWatchdogBrief,
  watchdogCostThisWeek,
  watchdogOptedMembers,
  watchdogWeekItems,
} from "@continuum/db";
import { digitViolations, nameViolations, type ComposeInputs } from "./articles-guards";

/**
 * Watchdog weekly briefs (Phase 34E) — founding-gated, OPT-IN. Inputs are
 * ONLY the member's own week: titles + excerpts + source names of
 * facts/articles/posts touching their watchlist and universe, last 7 days.
 * The desk-compose guard suite holds the output to those inputs: any
 * digit or entity-like name not present in the inputs drops the brief.
 * NO speculative watch-point language — the prompt forbids it and the
 * name/digit guards make inventing specifics impossible.
 *
 * Caps: per-run member cap + $2/week global guard, both checked in code.
 */

const MODEL = "claude-sonnet-4-6";
export const WATCHDOG_WEEKLY_BUDGET_USD = 2.0;
export const WATCHDOG_MEMBERS_PER_RUN = 200;
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const SYSTEM_PROMPT = `You write a short "Your week" note for one member of a financial-data platform, from the week's items on entities they follow.

Rules:
- Use ONLY the given item titles, excerpts, source names, and entity names. Nothing else exists.
- Every number and every organization name you write must appear in the inputs, spelled exactly.
- 2–3 short paragraphs, 400–900 characters total. Group related items; lead with the most consequential.
- Attribute at least once in prose ("according to <source name>") when source names are given.
- STRICTLY no speculation, no predictions, no "watch for", no "this could signal", no advice. Report what happened; stop there.
- Sober, personal-memo tone. No greetings, no sign-off, no exclamation marks.

Return ONLY the note text, no JSON, no headings.`;

/** Monday of the current UTC week — the brief's idempotency key. */
export function currentWeekStart(now: Date = new Date()): string {
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export type WatchdogComposeResult =
  | { status: "composed"; bodyMd: string; costUsd: number }
  | { status: "empty" }
  | { status: "cached" }
  | { status: "dropped"; reason: string }
  | { status: "budget" };

export async function composeWatchdogBrief(
  memberId: string,
  weekStart: string,
): Promise<WatchdogComposeResult> {
  if ((await getWatchdogBrief(memberId, weekStart)) !== null) {
    return { status: "cached" };
  }
  const items = await watchdogWeekItems(memberId);
  if (items.length === 0) {
    return { status: "empty" }; // skipped with the honest note — no filler
  }
  if ((await watchdogCostThisWeek()) >= WATCHDOG_WEEKLY_BUDGET_USD) {
    return { status: "budget" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "dropped", reason: "no model key" };
  }

  const inputs: ComposeInputs = {
    factTitles: items.map((item) => `${item.title}${item.occurredOn !== null ? ` · ${item.occurredOn}` : ""}`),
    excerpts: items.map((item) => item.excerpt ?? "").filter((excerpt) => excerpt !== ""),
    sourceNames: [...new Set(items.map((item) => item.sourceName ?? "").filter((name) => name !== ""))],
    entityNames: [...new Set(items.map((item) => item.entityName ?? "").filter((name) => name !== ""))],
  };
  const userPrompt = [
    `ENTITIES: ${inputs.entityNames.join("; ") || "(none)"}`,
    `ITEMS (title · date):\n${inputs.factTitles.map((title) => `- ${title}`).join("\n")}`,
    `EXCERPTS:\n${inputs.excerpts.map((excerpt) => `"${excerpt}"`).join("\n") || "(none)"}`,
    `SOURCE NAMES: ${inputs.sourceNames.join("; ") || "(none)"}`,
  ].join("\n\n");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const usage = response.usage;
  const costUsd =
    usage.input_tokens * COST_PER_INPUT_TOKEN + usage.output_tokens * COST_PER_OUTPUT_TOKEN;
  const body = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  // The desk-compose guard suite, applied verbatim.
  if (body.length < 200 || body.length > 1100) {
    return { status: "dropped", reason: `length ${body.length}` };
  }
  const digits = digitViolations(body, inputs);
  if (digits.length > 0) {
    return { status: "dropped", reason: `digits not in inputs: ${digits.join(", ")}` };
  }
  const names = nameViolations(body, inputs);
  if (names.length > 0) {
    return { status: "dropped", reason: `names not in inputs: ${names.join("; ")}` };
  }
  await storeWatchdogBrief({ memberId, weekStart, bodyMd: body, costUsd });
  return { status: "composed", bodyMd: body, costUsd };
}

export type WatchdogRunReport = {
  optedIn: number;
  founding: number;
  composed: number;
  empty: number;
  dropped: number;
  sent: number;
  budgetStopped: boolean;
};

/** One weekly pass — compose + deliver "Your week" per opted founding member. */
export async function runWatchdogWeekly(): Promise<WatchdogRunReport> {
  const weekStart = currentWeekStart();
  const opted = await watchdogOptedMembers();
  const report: WatchdogRunReport = {
    optedIn: opted.length,
    founding: 0,
    composed: 0,
    empty: 0,
    dropped: 0,
    sent: 0,
    budgetStopped: false,
  };
  const batch = opted.slice(0, WATCHDOG_MEMBERS_PER_RUN);
  for (const member of batch) {
    if ((await resolveMemberTier(member.memberId)) !== "founding") {
      continue; // opt-in survives a downgrade; delivery pauses until re-upgrade
    }
    report.founding += 1;
    const result = await composeWatchdogBrief(member.memberId, weekStart);
    if (result.status === "budget") {
      report.budgetStopped = true;
      break;
    }
    if (result.status === "empty") {
      report.empty += 1;
      continue;
    }
    if (result.status === "dropped") {
      report.dropped += 1;
      continue;
    }
    if (result.status === "composed") {
      report.composed += 1;
    }
    // Deliver (composed now or left unsent by an earlier failed send).
    const brief = await getWatchdogBrief(member.memberId, weekStart);
    if (brief !== null && process.env.RESEND_API_KEY && member.email !== null) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const paragraphs = brief.bodyMd
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#141311;margin:0 0 12px;">${paragraph}</p>`)
        .join("");
      await resend.emails.send({
        from: "Continuum Alternatives <brief@continuumalternatives.com>",
        to: member.email,
        subject: "Your week on Continuum",
        html: `<div style="max-width:560px;margin:0 auto;padding:28px 20px;">
          <h1 style="font-family:Georgia,serif;font-weight:500;font-size:22px;color:#141311;margin:0 0 12px;">Your week</h1>
          ${paragraphs}
          <p style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;color:#8a857c;border-top:1px solid #E4E1D8;padding-top:10px;margin-top:20px;">
            Composed from the week's items on entities you follow — sources named in the record.
            Switch off in <a href="https://continuumalternatives.com/account/watchlist" style="color:#1d5a7a;">your watchlist settings</a>.
          </p>
        </div>`,
      });
      await markWatchdogSent(member.memberId, weekStart);
      report.sent += 1;
    }
  }
  return report;
}
