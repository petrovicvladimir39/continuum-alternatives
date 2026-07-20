import { CHANNELS } from "@continuum/shared";
import { edgeType, entityKind } from "@continuum/db";
import { z } from "zod";

export const FACT_TYPES = [
  "insolvency_opened",
  "asset_sale_announced",
  "funding_round",
  "acquisition",
  "fund_close",
  "credit_event",
  "servicing_mandate",
  "advisor_mandate",
  "people_move",
  "regulatory",
  "other",
] as const;

export const extractedEntitySchema = z.object({
  name: z.string().min(1),
  kindHint: z.enum(entityKind.enumValues),
  country: z.string().length(2).optional(),
  registryId: z.string().optional(),
  roleInFact: z.string(),
});

export const proposedEdgeSchema = z.object({
  edgeType: z.enum(edgeType.enumValues),
  sourceName: z.string().min(1),
  targetName: z.string().min(1),
  role: z.string().optional(),
  date: z.string().optional(),
  // Amounts are RAW TEXT ONLY — the model transcribes, never computes.
  amountText: z.string().optional(),
  currencyHint: z.string().optional(),
});

export const extractedItemSchema = z.object({
  fact_type: z.enum(FACT_TYPES),
  title_en: z.string().min(1),
  title_original: z.string().optional(),
  body_en: z.string(),
  original_excerpt: z.string().min(1).max(400),
  occurred_on: z.string().optional(),
  channels: z.array(z.enum(CHANNELS)),
  confidence: z.number().min(0).max(1),
  entities: z.array(extractedEntitySchema),
  proposedEdges: z.array(proposedEdgeSchema),
});

export const extractionResultSchema = z.object({
  relevant: z.boolean(),
  language: z.string().length(2),
  summary_en: z.string(),
  items: z.array(extractedItemSchema),
});

export type ExtractedEntity = z.infer<typeof extractedEntitySchema>;
export type ProposedEdge = z.infer<typeof proposedEdgeSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
