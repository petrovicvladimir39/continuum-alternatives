import "./env";
import { normalizeAlias } from "@continuum/shared";
import { db, desc, documents, eq, sql, timelineFacts } from "@continuum/db";
import { extractDocument } from "./extraction/extract";

/**
 * LIVE benchmark — costs real API tokens; deliberately NOT part of pnpm verify.
 * Runs extraction over 5 stored documents, preferring press articles over ALSU
 * filings (filings already carry structured meta from the Phase 9 handlers, so
 * LLM extraction on them is low-value during testing): 4 articles + at most 1
 * filing to prove the filing path.
 */
async function pickDocuments() {
  const articles = await db
    .select()
    .from(documents)
    .where(
      sql`${documents.docType} = 'article' AND coalesce(${documents.meta}->'extraction'->>'status', '') <> 'done' AND length(coalesce(${documents.contentText}, '')) > 500`,
    )
    .orderBy(desc(documents.fetchedAt))
    .limit(4);
  const filings = await db
    .select()
    .from(documents)
    .where(
      sql`${documents.docType} = 'filing' AND coalesce(${documents.meta}->'extraction'->>'status', '') <> 'done' AND length(coalesce(${documents.contentText}, '')) > 500`,
    )
    .orderBy(desc(documents.fetchedAt))
    .limit(1);
  return [...articles, ...filings];
}

async function main() {
  const docs = await pickDocuments();
  if (docs.length === 0) {
    console.log("no un-extracted documents available");
    process.exit(1);
  }
  console.log(
    `benchmark over ${docs.length} documents (${docs.filter((d) => d.docType === "article").length} articles, ${docs.filter((d) => d.docType === "filing").length} filings)\n`,
  );

  let totalInput = 0;
  let totalOutput = 0;
  let leakedFabrications = 0;
  const rows: string[][] = [];

  for (const doc of docs) {
    const label = `${doc.docType}/${(doc.title ?? "untitled").slice(0, 44)}`;
    try {
      const result = await extractDocument(doc.id);
      totalInput += result.usage?.inputTokens ?? 0;
      totalOutput += result.usage?.outputTokens ?? 0;

      // Hard bar: every persisted entity name must be traceable to its document.
      const facts = await db
        .select({ data: timelineFacts.data, title: timelineFacts.title })
        .from(timelineFacts)
        .where(eq(timelineFacts.sourceDocumentId, doc.id));
      const normalizedDoc = normalizeAlias(doc.contentText ?? "");
      for (const fact of facts) {
        const data = (fact.data ?? {}) as { entities?: string[] };
        for (const entityId of data.entities ?? []) {
          const entityRows = await db.execute(
            sql`SELECT name FROM entities WHERE id = ${entityId}`,
          );
          const name = String(entityRows.rows[0]?.name ?? "");
          if (name !== "" && !normalizedDoc.includes(normalizeAlias(name))) {
            leakedFabrications += 1;
            console.error(`LEAK: entity "${name}" not traceable in document ${doc.id}`);
          }
        }
      }

      rows.push([
        label,
        String(result.relevant ?? ""),
        result.language ?? "",
        String(result.items),
        `${result.factsStored}/${result.edgesStored}`,
        `${result.entitiesMatched}/${result.entitiesProvisional}/${result.entitiesAmbiguous}`,
        JSON.stringify(result.guardStats ?? {}),
        `${result.usage?.inputTokens ?? 0}+${result.usage?.outputTokens ?? 0}`,
      ]);
      console.log(
        `${label}\n  relevant=${result.relevant} lang=${result.language} items=${result.items} facts=${result.factsStored} edges=${result.edgesStored} entities m/p/a=${result.entitiesMatched}/${result.entitiesProvisional}/${result.entitiesAmbiguous} dropped=${JSON.stringify(result.guardStats ?? {})} tokens=${result.usage?.inputTokens}+${result.usage?.outputTokens}\n`,
      );
    } catch (err) {
      rows.push([
        label,
        "ERROR",
        "",
        "",
        "",
        "",
        err instanceof Error ? err.message.slice(0, 60) : "",
        "",
      ]);
      console.error(`${label}\n  ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  const headers = [
    "document",
    "relevant",
    "lang",
    "items",
    "facts/edges",
    "m/p/a",
    "dropped",
    "tokens",
  ];
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (c ?? "").padEnd(widths[i] ?? 0)).join("  ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) {
    console.log(line(row));
  }
  console.log(
    `\ntotal tokens: input ${totalInput}, output ${totalOutput} · leaked fabrications: ${leakedFabrications} (hard bar: 0)`,
  );
  process.exit(leakedFabrications > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
