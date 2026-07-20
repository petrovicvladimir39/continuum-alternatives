import "./env";
import { RegisterImporter, proposeManagesEdges } from "@continuum/db";
import { unzipFirstMatch } from "./gleif";
import {
  parseAmfCsv,
  parseCssfAifm,
  parseLbCsv,
  nbsSelectRows,
  type AdapterResult,
  type NbsInstitution,
} from "./registers";

/**
 * National-regulator register harvest (reset build Part 2b/2c) — $0
 * deterministic code, no LLM. All registers flow through the shared
 * RegisterImporter path (deterministic registryId key, batch inserts,
 * direct activation, ambiguous rows skipped and reported).
 *
 *   pnpm registers:harvest -- --register cssf|nbs|amf|lb --cap 1500
 *
 * Probed access routes (2026-07-20): docs/register-catalog.md.
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const CSSF_AIFM_ZIP = "https://www.cssf.lu/wp-content/uploads/IDENTIFIANTS_AIFM.zip";

async function cssfAdapter(cap: number): Promise<AdapterResult> {
  console.log(`CSSF: downloading ${CSSF_AIFM_ZIP}`);
  const zip = await fetchBuffer(CSSF_AIFM_ZIP);
  const { data } = unzipFirstMatch(zip, ".csv");
  // CSSF bulk files are UTF-16LE, tab-delimited, space-padded fixed width.
  return parseCssfAifm(data.toString("utf16le"), cap);
}

const NBS_JSON = "https://subjekty.nbs.sk/api/json";

async function nbsAdapter(cap: number): Promise<AdapterResult> {
  console.log(`NBS: downloading ${NBS_JSON}`);
  const zip = await fetchBuffer(NBS_JSON);
  const { data } = unzipFirstMatch(zip, ".json");
  const parsed = JSON.parse(data.toString("utf8")) as { institutions: NbsInstitution[] };
  console.log(`NBS: ${parsed.institutions.length} institutions in full register`);
  return { rows: nbsSelectRows(parsed.institutions, cap) };
}

// Stable data.gouv.fr resource URL for "Liste des sociétés de gestion de
// portefeuille (SGP) agréées par l'AMF" — redirects to the current CSV.
const AMF_CSV = "https://www.data.gouv.fr/api/1/datasets/r/2220f808-8908-4afc-98e3-cf74a25678e2";

async function amfAdapter(cap: number): Promise<AdapterResult> {
  console.log(`AMF: downloading ${AMF_CSV}`);
  const buf = await fetchBuffer(AMF_CSV);
  return { rows: parseAmfCsv(buf.toString("utf8"), cap) };
}

const LB_EXPORT = "https://www.lb.lt/en/sfi-financial-market-participants?export=csv&market=";
const LB_MARKETS = ["1", "2", "3"];

async function lbAdapter(cap: number): Promise<AdapterResult> {
  const all: AdapterResult["rows"] = [];
  const seen = new Set<string>();
  for (const market of LB_MARKETS) {
    const url = `${LB_EXPORT}${market}`;
    console.log(`LB: downloading market ${market}`);
    const buf = await fetchBuffer(url);
    const text = buf.toString("utf8");
    if (text.trimStart().startsWith("<")) {
      console.log(`LB: market ${market} returned HTML (no export) — skipped`);
      continue;
    }
    let parsed: ReturnType<typeof parseLbCsv>;
    try {
      parsed = parseLbCsv(text);
    } catch (error) {
      console.log(`LB: market ${market} parse failed (${String(error)}) — skipped`);
      continue;
    }
    for (const row of parsed) {
      const key = row.registryId ?? `${row.name}|${row.note}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(row);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { rows: all.slice(0, cap) };
}

const ADAPTERS: Record<string, (cap: number) => Promise<AdapterResult>> = {
  cssf: cssfAdapter,
  nbs: nbsAdapter,
  amf: amfAdapter,
  lb: lbAdapter,
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let register = "";
  let cap = 1500;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--register" && argv[i + 1]) {
      register = argv[++i]!.toLowerCase();
    } else if (argv[i] === "--cap" && argv[i + 1]) {
      cap = Number.parseInt(argv[++i]!, 10);
    }
  }
  const adapter = ADAPTERS[register];
  if (adapter === undefined || !Number.isFinite(cap) || cap <= 0) {
    console.error(
      `usage: pnpm registers:harvest -- --register ${Object.keys(ADAPTERS).join("|")} --cap 1500`,
    );
    process.exit(1);
  }

  const { rows, managesByRegistryId } = await adapter(cap);
  console.log(`${register}: ${rows.length} candidate rows (cap ${cap})`);

  const importer = new RegisterImporter();
  await importer.init();
  let processed = 0;
  for (const row of rows) {
    await importer.importRow(row);
    processed += 1;
    if (processed % 100 === 0) {
      process.stdout.write(`\r${processed}/${rows.length}   `);
    }
  }
  await importer.flush();
  process.stdout.write("\n");

  if (managesByRegistryId !== undefined && managesByRegistryId.length > 0) {
    const pairs = managesByRegistryId
      .map((p) => ({
        managerEntityId: importer.entityIdFor(p.managerKey),
        fundEntityId: importer.entityIdFor(p.fundKey),
      }))
      .filter(
        (p): p is { managerEntityId: string; fundEntityId: string } =>
          p.managerEntityId !== undefined &&
          p.fundEntityId !== undefined &&
          p.managerEntityId !== p.fundEntityId,
      );
    const inserted = await proposeManagesEdges(pairs);
    console.log(`edges: ${inserted} PROPOSED manages edges inserted`);
  }

  const c = importer.counts;
  console.log(
    `${register} report: created ${c.created}, merged ${c.merged}, registry-known ${c.merged_registry}, ambiguous ${c.ambiguous}, skipped ${c.skipped}`,
  );
  if (importer.ambiguousRows.length > 0) {
    console.log("ambiguous (skipped):");
    for (const line of importer.ambiguousRows.slice(0, 30)) {
      console.log(`  ${line}`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
