import "./env";
import { db, eq, isNull, and, organizations, entities, resolveEntity, sql } from "@continuum/db";

/**
 * EUROPE DEPTH RUN (DE Step 4) — website-derived deterministic enrichment
 * from BAI member DETAIL pages ($0, polite). The member list carries a
 * detail link per member; the detail page exposes the firm's website (and
 * sometimes address). We only FILL EMPTY organizations.website on entities
 * that resolve deterministically by exact name; nothing is overwritten,
 * nothing is guessed.
 *
 *   tsx src/bai-detail-enrich.ts [--cap 400]
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  return response.text();
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)))
    .replace(/\s+/g, " ")
    .trim();
}

async function main(): Promise<void> {
  const capIdx = process.argv.indexOf("--cap");
  const cap = capIdx >= 0 ? Number.parseInt(process.argv[capIdx + 1] ?? "400", 10) : 400;

  // Walk the paginated list, keep name -> detail URL.
  const detail = new Map<string, string>();
  for (let page = 1; page <= 30; page++) {
    const url =
      page === 1
        ? "https://www.bvai.de/en/bai-members"
        : `https://www.bvai.de/en/bai-members?tx_solr%5Bpage%5D=${page}`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      break;
    }
    let added = 0;
    for (const block of html.split('class="member"').slice(1)) {
      const href = /href="(\/en\/bai-members\/detail\?[^"]+)"/.exec(block);
      const nameM = /<h3 class="results-topic">\s*([^<]{3,140}?)\s*<\/h3>/.exec(block);
      if (href === null || nameM === null) {
        continue;
      }
      const name = decode(nameM[1] ?? "");
      if (!detail.has(name)) {
        detail.set(name, "https://www.bvai.de" + (href[1] ?? "").replace(/&amp;/g, "&"));
        added += 1;
      }
    }
    if (added === 0) {
      break;
    }
    await sleep(1200);
  }
  console.log(`bai-detail-enrich: ${detail.size} member detail links`);

  let filled = 0;
  let skippedHasWebsite = 0;
  let noWebsiteOnPage = 0;
  let unresolved = 0;
  let processed = 0;
  for (const [name, url] of detail) {
    if (processed >= cap) {
      break;
    }
    processed += 1;
    const resolved = await resolveEntity({ name, country: "DE", kindHint: "organization" });
    if (resolved.outcome !== "matched" || resolved.entityId === undefined) {
      unresolved += 1;
      continue;
    }
    const org = await db
      .select({ website: organizations.website })
      .from(organizations)
      .where(eq(organizations.entityId, resolved.entityId));
    if (org.length === 0 || org[0]?.website !== null) {
      skippedHasWebsite += 1;
      continue;
    }
    let html: string;
    try {
      html = await fetchText(url);
    } catch {
      continue;
    }
    // The detail page renders the member's own site as an external link.
    const site = /<a[^>]+href="(https?:\/\/(?!www\.bvai\.de)[^"]+)"[^>]*>(?:\s*(?:Website|Webseite|zur Website)|\s*https?:\/\/)/i.exec(html)
      ?? /Website:?\s*<[^>]*>\s*<a[^>]+href="(https?:\/\/[^"]+)"/i.exec(html)
      ?? /<a[^>]+href="(https?:\/\/(?!www\.bvai\.de|twitter|linkedin|xing|youtube|facebook)[^"]+)"[^>]*target="_blank"/i.exec(html);
    if (site === null) {
      noWebsiteOnPage += 1;
      await sleep(1000);
      continue;
    }
    const website = (site[1] ?? "").split("?")[0] ?? "";
    if (website === "") {
      noWebsiteOnPage += 1;
      await sleep(1000);
      continue;
    }
    await db
      .update(organizations)
      .set({ website })
      .where(and(eq(organizations.entityId, resolved.entityId), isNull(organizations.website)));
    filled += 1;
    await sleep(1000);
  }
  console.log(
    `bai-detail-enrich: ${filled} websites filled · ${skippedHasWebsite} already had one · ${noWebsiteOnPage} pages without a site link · ${unresolved} names not deterministically resolved (skipped)`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
