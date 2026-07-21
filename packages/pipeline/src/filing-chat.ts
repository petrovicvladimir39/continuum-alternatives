import "./env";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  docChatCostToday,
  getCachedDocChat,
  getDocumentForChat,
  normalizeQuestion,
  storeDocChat,
  tryConsumeDailyUsage,
  type DocChatAnswer,
} from "@continuum/db";
import { guardFilingAnswer, NO_ANSWER_FALLBACK } from "./filing-guards";

/**
 * Chat-with-filing (Phase 34C) — grounded, SINGLE-document Q&A.
 * claude-sonnet-4-6, temperature 0; the model sees ONLY this document's
 * text (≤30k chars) + meta + the question. No cross-document synthesis in
 * v1 — corpus-wide RAG invites confident blends the substring guard
 * cannot catch; it returns only with per-quote provenance.
 *
 * Caps (all deterministic, checked BEFORE the model):
 *   free members    3 questions/day   (founding unlimited)
 *   global          $1/day            (honest "try tomorrow" state)
 */

const MODEL = "claude-sonnet-4-6";
const DOC_TEXT_MAX = 30_000;
export const DOC_CHAT_FREE_PER_DAY = 3;
export const DOC_CHAT_DAILY_BUDGET_USD = 1.0;
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const answerSchema = z.object({
  answer: z.string(),
  quotes: z.array(z.object({ verbatim: z.string(), note: z.string() })).max(6),
});

const SYSTEM_PROMPT = `You answer questions about ONE document for a financial-data platform. You receive the document's text and metadata, and a question.

Rules:
- Use ONLY the document. No outside knowledge, no assumptions, no arithmetic beyond what the text states.
- answer: at most 120 words, sober and direct.
- quotes: 1–6 VERBATIM excerpts copied character-for-character from the document that ground your answer, each with a short note saying what it shows. Do not paraphrase inside "verbatim".
- If the document does not clearly answer the question, say exactly: "${NO_ANSWER_FALLBACK}" and return zero quotes.

Return ONLY JSON: {"answer": "...", "quotes": [{"verbatim": "...", "note": "..."}]}`;

export type FilingChatResult =
  | { status: "answered"; answer: DocChatAnswer; cached: boolean }
  | { status: "cap_member"; message: string }
  | { status: "cap_global"; message: string }
  | { status: "error"; message: string };

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

export async function askFiling(input: {
  documentId: string;
  question: string;
  memberId: string;
  founding: boolean;
}): Promise<FilingChatResult> {
  const question = normalizeQuestion(input.question);
  if (question.length < 5) {
    return { status: "error", message: "Ask a real question (5+ characters)." };
  }
  const document = await getDocumentForChat(input.documentId);
  if (document === null) {
    return { status: "error", message: "This document has no readable text." };
  }

  // Cache first — cached views are free and never count against caps.
  const cached = await getCachedDocChat(input.documentId, question);
  if (cached !== null) {
    return { status: "answered", answer: cached, cached: true };
  }

  // Deterministic caps BEFORE any model call.
  if (!input.founding) {
    const allowed = await tryConsumeDailyUsage(input.memberId, "doc_chat", DOC_CHAT_FREE_PER_DAY);
    if (!allowed) {
      return {
        status: "cap_member",
        message: `Free members ask ${DOC_CHAT_FREE_PER_DAY} questions a day — founding members ask without limits.`,
      };
    }
  }
  if ((await docChatCostToday()) >= DOC_CHAT_DAILY_BUDGET_USD) {
    return {
      status: "cap_global",
      message: "Today's document-Q&A budget is spent — try tomorrow. Cached answers stay free.",
    };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: "error", message: "Document Q&A opens soon." }; // pre-config honesty
  }

  const documentText = document.contentText.slice(0, DOC_TEXT_MAX);
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `DOCUMENT META: title: ${document.title ?? "—"} · source: ${document.sourceName ?? "—"} · fetched: ${document.fetchedAt?.toISOString().slice(0, 10) ?? "—"}`,
          `DOCUMENT TEXT:\n${documentText}`,
          `QUESTION: ${question}`,
        ].join("\n\n"),
      },
    ],
  });
  const usage = response.usage;
  const costUsd =
    usage.input_tokens * COST_PER_INPUT_TOKEN + usage.output_tokens * COST_PER_OUTPUT_TOKEN;
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let answer: DocChatAnswer;
  try {
    const draft = answerSchema.parse(parseJsonObject(text));
    // THE guard: verbatim-substring check against the exact text the model saw.
    answer = guardFilingAnswer(draft, documentText);
  } catch {
    answer = { answer: NO_ANSWER_FALLBACK, quotes: [] };
  }
  await storeDocChat({
    documentId: input.documentId,
    memberId: input.memberId,
    questionNormalized: question,
    answer,
    costUsd,
  });
  return { status: "answered", answer, cached: false };
}
