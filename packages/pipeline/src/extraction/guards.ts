import { CHANNELS, normalizeAlias, parseRegionalDate } from "@continuum/shared";
import type { ExtractedItem, ExtractionResult } from "./schema";

export type GuardStats = {
  droppedFabricated: number;
  droppedBadExcerpt: number;
  nulledDates: number;
  strippedChannels: number;
};

export type GuardedResult = {
  items: ExtractedItem[];
  stats: GuardStats;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Documents store stripped HTML that still contains tags and entities; the
 * model quotes the VISIBLE text, so guards compare against a tag-free,
 * entity-decoded rendering of the document.
 */
export function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Mechanical anti-hallucination guards, applied to the model output against the
 * exact document text the model saw:
 *  1. entity names must literally appear in the document (normalized substring)
 *  2. original_excerpt must be a verbatim (whitespace-normalized) substring
 *  3. occurred_on must parse and lie within 1990-01-01 .. today+1y
 *  4. channels filtered to the CHANNELS vocabulary; zero valid channels caps
 *     confidence at 0.5
 */
export function applyGuards(result: ExtractionResult, documentText: string): GuardedResult {
  const stats: GuardStats = {
    droppedFabricated: 0,
    droppedBadExcerpt: 0,
    nulledDates: 0,
    strippedChannels: 0,
  };
  // The model reads the RAW capped text, so verbatim quotes can come from tag
  // attributes (e.g. og:description) as well as from visible text spanning
  // inline tags. Guards accept a match in either rendering.
  const visible = visibleText(documentText);
  const normalizedDocs = [normalizeAlias(documentText), normalizeAlias(visible)];
  const whitespaceDocs = [normalizeWhitespace(documentText), normalizeWhitespace(visible)];

  const minDate = "1990-01-01";
  const maxDate = new Date();
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
  const maxDateIso = maxDate.toISOString().slice(0, 10);

  const items: ExtractedItem[] = [];
  for (const item of result.items) {
    // Guard 2 — excerpt must be verbatim.
    const needles = [
      normalizeWhitespace(item.original_excerpt),
      normalizeWhitespace(visibleText(item.original_excerpt)),
    ];
    if (!needles.some((needle) => whitespaceDocs.some((corpus) => corpus.includes(needle)))) {
      stats.droppedBadExcerpt += 1;
      console.warn(
        `[guard] dropped non-verbatim excerpt: ${JSON.stringify(item.original_excerpt.slice(0, 160))}`,
      );
      continue;
    }

    // Guard 1 — drop fabricated entities and edges referencing them.
    const keptEntities = item.entities.filter((entity) => {
      const normalized = normalizeAlias(entity.name);
      const present =
        normalized !== "" && normalizedDocs.some((corpus) => corpus.includes(normalized));
      if (!present) {
        stats.droppedFabricated += 1;
      }
      return present;
    });
    const keptNames = new Set(keptEntities.map((entity) => entity.name));
    const keptEdges = item.proposedEdges.filter(
      (edge) => keptNames.has(edge.sourceName) && keptNames.has(edge.targetName),
    );

    // Guard 3 — date sanity.
    let occurredOn = item.occurred_on;
    if (occurredOn !== undefined) {
      const parsed = parseRegionalDate(occurredOn);
      if (parsed === null || parsed < minDate || parsed > maxDateIso) {
        occurredOn = undefined;
        stats.nulledDates += 1;
      } else {
        occurredOn = parsed;
      }
    }

    // Guard 4 — channel validity.
    const channels = item.channels.filter((channel) =>
      (CHANNELS as readonly string[]).includes(channel),
    );
    let confidence = item.confidence;
    if (channels.length !== item.channels.length) {
      stats.strippedChannels += 1;
    }
    if (channels.length === 0) {
      confidence = Math.min(confidence, 0.5);
    }

    items.push({
      ...item,
      ...(occurredOn !== undefined ? { occurred_on: occurredOn } : { occurred_on: undefined }),
      channels,
      confidence,
      entities: keptEntities,
      proposedEdges: keptEdges,
    });
  }
  return { items, stats };
}
