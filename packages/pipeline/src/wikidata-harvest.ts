import "./env";
import { EUROPE_COUNTRIES } from "@continuum/shared";
import {
  createEntity,
  db,
  entities,
  entityTags,
  eq,
  organizations,
  resolveEntity,
} from "@continuum/db";

/**
 * Wikidata SPARQL anchor harvest (reset build Part 3) — $0, no LLM.
 *
 *   pnpm wikidata:harvest [-- --cap 500]
 *
 * European PE / VC / asset-management organizations with a headquarters,
 * plus website and logo where present. Wikidata is CROWD-SOURCED — rows
 * NEVER auto-activate: new entities land status='provisional' with the
 * needs_verification tag and only pass to 'active' through the existing
 * website-verification gate (pnpm universe:verify). Matched entities only
 * get gap-fills (website / city / logo when ours are null) plus the
 * wikidata tag; ambiguous resolutions are skipped and reported.
 */

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

// private equity firm / venture capital firm / asset management company
// + (clean-100 Part 6) hedge fund / startup accelerator. Angel networks have
// no usable Wikidata class (probed 2026-07-21: only individual companies and
// papers carry the phrase) — documented skip.
const CLASSES = ["Q5418962", "Q3487908", "Q4230006", "Q105611", "Q4086495"];

type SparqlBinding = {
  org: { value: string };
  orgLabel?: { value: string };
  country?: { value: string };
  hqLabel?: { value: string };
  website?: { value: string };
  logo?: { value: string };
};

/**
 * WDQS 504s on both the P279* closure and the country→ISO join inside the
 * main query, so: one query per class (direct P31 only, country as a QID),
 * then a single cheap VALUES query mapping the distinct country QIDs to
 * ISO codes; the EUROPE_COUNTRIES filter runs client-side.
 */
function classQuery(classQid: string, cap: number): string {
  return `
SELECT ?org ?orgLabel ?country ?hqLabel ?website ?logo WHERE {
  ?org wdt:P31 wd:${classQid} .
  ?org wdt:P159 ?hq .
  ?org wdt:P17 ?country .
  OPTIONAL { ?org wdt:P856 ?website . }
  OPTIONAL { ?org wdt:P154 ?logo . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,it,es,nl,pl,cs,sv". }
}
LIMIT ${cap}`;
}

async function sparql(query: string): Promise<SparqlBinding[]> {
  const response = await fetch(
    `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`,
    { headers: { "user-agent": UA, accept: "application/sparql-results+json" } },
  );
  if (!response.ok) {
    throw new Error(`SPARQL ${response.status}`);
  }
  const payload = (await response.json()) as { results: { bindings: SparqlBinding[] } };
  return payload.results.bindings;
}

async function countryCodeMap(countryQids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < countryQids.length; i += 100) {
    const values = countryQids.slice(i, i + 100).map((q) => `wd:${q}`).join(" ");
    const rows = (await sparql(
      `SELECT ?country ?cc WHERE { VALUES ?country { ${values} } ?country wdt:P297 ?cc . }`,
    )) as unknown as { country: { value: string }; cc: { value: string } }[];
    for (const row of rows) {
      const qid = row.country.value.split("/").pop() ?? "";
      map.set(qid, row.cc.value.toUpperCase());
    }
  }
  return map;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let cap = 500;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cap" && argv[i + 1]) {
      cap = Number.parseInt(argv[++i]!, 10);
    }
  }

  console.log(`wikidata:harvest — querying SPARQL per class (cap ${cap})…`);
  const seen = new Map<string, SparqlBinding>();
  for (const classQid of CLASSES) {
    const rows = await sparql(classQuery(classQid, cap));
    console.log(`  class ${classQid}: ${rows.length} rows`);
    for (const row of rows) {
      const qid = row.org.value.split("/").pop() ?? "";
      if (!seen.has(qid)) {
        seen.set(qid, row);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const countryQids = [
    ...new Set(
      [...seen.values()]
        .map((b) => b.country?.value.split("/").pop() ?? "")
        .filter((q) => q !== ""),
    ),
  ];
  const isoByQid = await countryCodeMap(countryQids);
  const bindings = [...seen.values()].slice(0, cap);
  console.log(`wikidata:harvest — ${seen.size} distinct orgs, importing up to ${bindings.length}`);

  let created = 0;
  let merged = 0;
  let ambiguous = 0;
  let skipped = 0;

  for (const b of bindings) {
    const qid = b.org.value.split("/").pop() ?? "";
    const name = b.orgLabel?.value?.trim() ?? "";
    const countryQid = b.country?.value.split("/").pop() ?? "";
    const country = isoByQid.get(countryQid) ?? "";
    // Label service falls back to the QID when no label exists — skip those;
    // countries outside EUROPE_COUNTRIES are out of scope.
    if (name === "" || name === qid || !EUROPE_COUNTRIES.includes(country)) {
      skipped += 1;
      continue;
    }
    const city = b.hqLabel?.value?.trim() || null;
    const website = b.website?.value?.trim() || null;
    const logo = b.logo?.value?.trim() || null;

    const resolved = await resolveEntity({ name, country, kindHint: "organization" });
    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      const entityId = resolved.entityId;
      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.entityId, entityId));
      const org = orgRows[0];
      if (org === undefined) {
        await db.insert(organizations).values({
          entityId,
          hqCity: city,
          website,
          logoUrl: logo,
          verificationNote: `Wikidata ${qid} (crowd-sourced gap-fill)`,
        });
      } else {
        const patch: Partial<typeof organizations.$inferInsert> = {};
        if (org.hqCity === null && city !== null) {
          patch.hqCity = city;
        }
        if (org.website === null && website !== null) {
          patch.website = website;
        }
        if (org.logoUrl === null && logo !== null) {
          patch.logoUrl = logo;
        }
        if (Object.keys(patch).length > 0) {
          await db.update(organizations).set(patch).where(eq(organizations.entityId, entityId));
        }
      }
      const tagRows = await db
        .select({ tag: entityTags.tag })
        .from(entityTags)
        .where(eq(entityTags.entityId, entityId));
      if (!tagRows.some((t) => t.tag === "wikidata")) {
        await db.insert(entityTags).values([{ entityId, tag: "wikidata" }]);
      }
      merged += 1;
      continue;
    }
    if (resolved.outcome === "ambiguous") {
      ambiguous += 1;
      console.log(
        `  ambiguous: ${name} ~ ${resolved.candidates.slice(0, 2).map((c) => c.slug).join(", ")}`,
      );
      continue;
    }

    // New — crowd-sourced rows NEVER auto-activate.
    const entity = await createEntity({
      kind: "organization",
      name,
      country,
      tags: ["wikidata", "needs_verification"],
    });
    await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, entity.id));
    await db.insert(organizations).values({
      entityId: entity.id,
      hqCity: city,
      website,
      logoUrl: logo,
      verificationNote: `Wikidata ${qid} (crowd-sourced; awaiting website verification)`,
    });
    created += 1;
  }

  console.log(
    `wikidata:harvest done — created ${created} provisional, merged ${merged}, ambiguous ${ambiguous}, skipped ${skipped}`,
  );
  console.log("activation path: pnpm universe:verify (website-verification gate)");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
