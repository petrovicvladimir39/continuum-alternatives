import Anthropic from "@anthropic-ai/sdk";
import { Langfuse } from "langfuse";
import { CONTENT_CAP, EXTRACTION_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { extractionResultSchema, type ExtractionResult } from "./schema";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4000;

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — required for extraction");
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

export type ExtractionUsage = { inputTokens: number; outputTokens: number };

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

/**
 * Calls claude-sonnet-4-6 (temperature 0) with the extraction contract; on an
 * invalid JSON/schema response, makes exactly one repair attempt feeding back
 * the validation error, then fails.
 */
export async function callExtraction(input: {
  documentId: string;
  title: string | null;
  contentText: string;
  knownEntityHint?: string;
}): Promise<{ result: ExtractionResult; usage: ExtractionUsage; truncated: boolean }> {
  const client = getAnthropicClient();
  const lf = getLangfuse();
  const trace = lf?.trace({
    name: "extract-document",
    metadata: { documentId: input.documentId, model: MODEL },
  });

  const truncated = input.contentText.length > CONTENT_CAP;
  const userPrompt = buildUserPrompt(input);
  const usage: ExtractionUsage = { inputTokens: 0, outputTokens: 0 };

  const ask = async (messages: Anthropic.MessageParam[], name: string): Promise<string> => {
    const generation = trace?.generation({ name, model: MODEL, input: messages });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: EXTRACTION_SYSTEM_PROMPT,
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
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });
    return text;
  };

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  try {
    const first = await ask(messages, "extraction");
    let parsed: unknown;
    let firstError: string;
    try {
      parsed = parseJsonResponse(first);
      const validated = extractionResultSchema.safeParse(parsed);
      if (validated.success) {
        return { result: validated.data, usage, truncated };
      }
      firstError = JSON.stringify(validated.error.issues.slice(0, 5));
    } catch (err) {
      firstError = err instanceof Error ? err.message : String(err);
    }

    const repair = await ask(
      [
        ...messages,
        { role: "assistant", content: first },
        {
          role: "user",
          content: `Your response failed validation: ${firstError}\nReturn the corrected JSON object only, matching the contract exactly.`,
        },
      ],
      "extraction-repair",
    );
    const repaired = extractionResultSchema.safeParse(parseJsonResponse(repair));
    if (!repaired.success) {
      throw new Error(
        `Extraction failed after repair retry: ${JSON.stringify(repaired.error.issues.slice(0, 5))}`,
      );
    }
    return { result: repaired.data, usage, truncated };
  } finally {
    trace?.update({ output: { usage } });
    await lf?.flushAsync().catch(() => undefined);
  }
}
