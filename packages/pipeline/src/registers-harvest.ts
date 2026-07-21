import "./env";
import { EUROPE_COUNTRY_NAMES } from "@continuum/shared";
import { RegisterImporter, proposeManagesEdges } from "@continuum/db";
import { unzipFirstMatch } from "./gleif";
import {
  afmAifmSelectRows,
  esmaDocsToRows,
  finFsaSelectRows,
  finmaSelectRows,
  noEntitiesToRows,
  parseAfmCsv,
  parseAmfCsv,
  parseAsfList,
  parseCnmvList,
  parseCssfAifm,
  parseFiEeList,
  parseFiSeList,
  parseHanfaXml,
  parseKnfTfi,
  parseLbCsv,
  parseLvResults,
  parseSharedStrings,
  parseXlsxSheet,
  nbsSelectRows,
  type AdapterResult,
  type EsmaEntityDoc,
  type FinFsaEntity,
  type NbsInstitution,
  type NoLegalEntity,
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

async function fetchBuffer(url: string, headers: Record<string, string> = {}): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { "user-agent": UA, ...headers },
    redirect: "follow",
  });
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

// ── clean-100 Part 2 adapters ───────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FINMA_LISTS: { url: string; label: string }[] = [
  {
    url: "https://www.finma.ch/~/media/finma/dokumente/bewilligungstraeger/xlsx/flvervt.xlsx",
    label: "Fondsleitungen / Verwalter von Kollektivvermögen",
  },
  {
    url: "https://www.finma.ch/~/media/finma/dokumente/bewilligungstraeger/xlsx/beh.xlsx",
    label: "Banken und Wertpapierhäuser",
  },
];

async function finmaAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  const seen = new Set<string>();
  for (const list of FINMA_LISTS) {
    console.log(`FINMA: downloading ${list.url}`);
    const xlsx = await fetchBuffer(list.url);
    const sheet = unzipFirstMatch(xlsx, "xl/worksheets/sheet1.xml");
    let shared: string[] = [];
    try {
      shared = parseSharedStrings(unzipFirstMatch(xlsx, "xl/sharedstrings.xml").data.toString("utf8"));
    } catch {
      // inline-string workbook — no shared strings entry
    }
    const parsed = finmaSelectRows(parseXlsxSheet(sheet.data.toString("utf8"), shared), list.label, cap - rows.length);
    for (const row of parsed) {
      const key = `${row.name}|${row.city ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }
    await sleep(1000);
  }
  return { rows };
}

// ESMA central register of authorised entities (upreg core): AIFMs, UCITS
// management companies, EuVECA/EuSEF managers — the rescue path for NCAs
// whose own portals are JS/WAF-blocked (IT, AT, SI, PT, MT, HU, GR, …).
const ESMA_SOLR =
  "https://registers.esma.europa.eu/solr/esma_registers_upreg/select";
const ESMA_TYPES = ["aif", "uci", "evc", "esf"];

async function esmaAdapter(cap: number): Promise<AdapterResult> {
  // cap applies PER SUB-REGISTER (aifm / ucits manco / euveca / eusef are
  // separate ESMA registers sharing one solr core).
  const rows: AdapterResult["rows"] = [];
  const pageSize = 250;
  for (const typeCode of ESMA_TYPES) {
    let typeCount = 0;
    let start = 0;
    for (;;) {
      if (typeCount >= cap) {
        break;
      }
      const url =
        `${ESMA_SOLR}?q=entity_type:ae%20AND%20ae_entityTypeCode:${typeCode}` +
        `&rows=${pageSize}&start=${start}&wt=json&sort=id%20asc`;
      const response = await fetch(url, { headers: { "user-agent": UA } });
      if (!response.ok) {
        throw new Error(`ESMA ${response.status} for ${typeCode}`);
      }
      const payload = (await response.json()) as {
        response: { numFound: number; docs: EsmaEntityDoc[] };
      };
      const batch = esmaDocsToRows(payload.response.docs, EUROPE_COUNTRY_NAMES, cap - typeCount);
      rows.push(...batch);
      typeCount += batch.length;
      start += pageSize;
      process.stdout.write(`\rESMA ${typeCode}: ${Math.min(start, payload.response.numFound)}/${payload.response.numFound}   `);
      if (start >= payload.response.numFound) {
        break;
      }
      await sleep(600);
    }
    process.stdout.write("\n");
  }
  return { rows };
}

const HANFA_REGISTERS: { path: string; label: string }[] = [
  {
    path: "investicijski-fondovi/drustva-za-upravljanje-alternativnim-investicijskim-fondovima-licencirana",
    label: "AIF management companies (licensed)",
  },
  {
    path: "investicijski-fondovi/drustva-za-upravljanje-alternativnim-investicijskim-fondovima-registrirana",
    label: "AIF management companies (registered)",
  },
  {
    path: "investicijski-fondovi/drustva-za-upravljanje-ucits-fondovima",
    label: "UCITS management companies",
  },
  { path: "investicijska-drustva", label: "Investment firms" },
];

async function hanfaAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const reg of HANFA_REGISTERS) {
    const url = `https://www.hanfa.hr/registri/${reg.path}/?export=xml`;
    console.log(`HANFA: ${url}`);
    const buf = await fetchBuffer(url);
    const text = buf.toString("utf8");
    if (text.trimStart().startsWith("<Registar") === false) {
      console.log(`HANFA: ${reg.path} returned non-register payload — skipped`);
      continue;
    }
    rows.push(...parseHanfaXml(text, reg.label));
    await sleep(1000);
  }
  return { rows: rows.slice(0, cap) };
}

const NO_API = "https://api.finanstilsynet.no/registry/v1/legal-entities/filter";
const NO_LICENCES: { code: string; label: string }[] = [
  { code: "FOAVALIN", label: "Alternative Investment Fund Manager (AIFM)" },
  { code: "FVLTSLSKVP", label: "Management company for securities funds" },
  { code: "FFOR", label: "Investment firm" },
];

async function noAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const licence of NO_LICENCES) {
    let page = 1;
    for (;;) {
      if (rows.length >= cap) {
        return { rows };
      }
      const url = `${NO_API}?licenceTypes=${licence.code}&pageSize=50&page=${page}`;
      const response = await fetch(url, {
        headers: { "user-agent": UA, accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Finanstilsynet NO ${response.status} for ${licence.code}`);
      }
      const payload = (await response.json()) as { total: number; legalEntities: NoLegalEntity[] };
      rows.push(...noEntitiesToRows(payload.legalEntities, licence.label));
      process.stdout.write(`\rNO ${licence.code}: page ${page} (${payload.total} total)   `);
      if (page * 50 >= payload.total || payload.legalEntities.length === 0) {
        break;
      }
      page += 1;
      await sleep(700);
    }
    process.stdout.write("\n");
  }
  return { rows: rows.slice(0, cap) };
}

// AFM: two register CSV exports (root-relative export.aspx GUIDs) + the two
// AIFM spreadsheets (manager×fund rows -> managers, funds, manages links).
const AFM_CSVS: { guid: string; label: string }[] = [
  { guid: "8f59acf7-047b-4009-9fa7-90a264e6f3ef", label: "beleggingsondernemingen" },
  { guid: "883bcff1-0f26-442f-9faf-a39ff911b109", label: "collective investment schemes" },
];
const AFM_XLSX: { url: string; label: string }[] = [
  { url: "https://www.afm.nl/~/profmedia/files/registers/register-aifm.xlsx", label: "AIFM vergunning" },
  { url: "https://www.afm.nl/~/profmedia/files/registers/register-aifmd-light.xlsx", label: "AIFM light regime" },
];

async function afmAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  const manages: NonNullable<AdapterResult["managesByRegistryId"]> = [];
  for (const { url, label } of AFM_XLSX) {
    console.log(`AFM: downloading ${url}`);
    const xlsx = await fetchBuffer(url);
    let shared: string[] = [];
    try {
      shared = parseSharedStrings(unzipFirstMatch(xlsx, "xl/sharedstrings.xml").data.toString("utf8"));
    } catch {
      // inline-string workbook
    }
    const sheet = parseXlsxSheet(unzipFirstMatch(xlsx, "xl/worksheets/sheet1.xml").data.toString("utf8"), shared);
    const result = afmAifmSelectRows(sheet, label, cap - rows.length);
    rows.push(...result.rows);
    manages.push(...(result.managesByRegistryId ?? []));
    await sleep(1200);
  }
  for (const { guid, label } of AFM_CSVS) {
    if (rows.length >= cap) {
      break;
    }
    const url = `https://www.afm.nl/export.aspx?type=${guid}&format=csv`;
    console.log(`AFM: downloading ${label} CSV`);
    const buf = await fetchBuffer(url);
    rows.push(...parseAfmCsv(buf.toString("utf8"), label, cap - rows.length));
    await sleep(1200);
  }
  return { rows, managesByRegistryId: manages };
}

const KNF_URL =
  "https://www.knf.gov.pl/podmioty/Podmioty_rynku_kapitalowego/Fundusze_Inwestycyjne/TFI_i_FI";

async function knfAdapter(cap: number): Promise<AdapterResult> {
  console.log(`KNF: downloading ${KNF_URL}`);
  const buf = await fetchBuffer(KNF_URL);
  return parseKnfTfi(buf.toString("utf8"), cap);
}

const CNMV_LISTS: { url: string; label: string }[] = [
  {
    url: "https://www.cnmv.es/Portal/Consultas/ListadoEntidad?id=2&tipoent=0",
    label: "SGIIC (IIC management companies)",
  },
  {
    url: "https://www.cnmv.es/Portal/Consultas/ListadoEntidad?id=4&tipoent=0",
    label: "SGEIC (closed-ended / private equity managers)",
  },
];

async function cnmvAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const { url, label } of CNMV_LISTS) {
    console.log(`CNMV: downloading ${label}`);
    // CNMV's IIS 500s without an Accept-Language header (probed 2026-07-21).
    const buf = await fetchBuffer(url, {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "es-ES,es;q=0.9,en;q=0.5",
    });
    rows.push(...parseCnmvList(buf.toString("utf8"), label));
    await sleep(1200);
  }
  return { rows: rows.slice(0, cap) };
}

const FISE_URL =
  "https://www.fi.se/en/our-registers/company-register/index?huvudkategori=Fondbolag%2FAIF-f%C3%B6rvaltare";

async function fiseAdapter(cap: number): Promise<AdapterResult> {
  console.log("FI.se: downloading Fondbolag/AIF-förvaltare category");
  const buf = await fetchBuffer(FISE_URL);
  return { rows: parseFiSeList(buf.toString("utf8"), "Fondbolag/AIF-förvaltare").slice(0, cap) };
}

const LV_SEGMENTS: { slug: string; label: string }[] = [
  { slug: "1-ieguldijumu-parvaldes-sabiedribas", label: "UCITS management companies" },
  { slug: "3-alternativo-ieguldijumu-fondu-parvaldnieki", label: "AIFMs" },
];

async function lvAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const { slug, label } of LV_SEGMENTS) {
    const url = `https://www.bank.lv/index.php?option=com_market&view=filter&format=json&lang=lv-LV&limit=500&segments=${slug}`;
    console.log(`Latvijas Banka: segment ${slug}`);
    const buf = await fetchBuffer(url);
    const payload = JSON.parse(buf.toString("utf8")) as { results?: string };
    rows.push(...parseLvResults(payload.results ?? "", label));
    await sleep(1200);
  }
  return { rows: rows.slice(0, cap) };
}

const FIEE_LISTS: { url: string; pathInclude: string; label: string }[] = [
  {
    url: "https://www.fi.ee/en/investment-market/fund-management-companies-0/investment-market/fund-management-companies",
    pathInclude: "fund-management-companies",
    label: "fund management companies (incl. small AIFMs)",
  },
  {
    url: "https://www.fi.ee/en/investment-market/investment-firms-0/investment-market/investment-firms",
    pathInclude: "investment-firms",
    label: "investment firms",
  },
];

async function fieeAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const { url, pathInclude, label } of FIEE_LISTS) {
    console.log(`FI.ee: downloading ${label}`);
    const buf = await fetchBuffer(url);
    // Cross-border providers live under /providers-cross-border-… paths —
    // excluded by requiring the domestic path fragment right after /en/.
    const parsed = parseFiEeList(buf.toString("utf8"), pathInclude, label).filter(
      (row) => row.name.length > 2,
    );
    rows.push(...parsed);
    await sleep(1200);
  }
  return { rows: rows.slice(0, cap) };
}

const ASF_SECTIONS: { sect: string; label: string }[] = [
  { sect: "3501", label: "SAI (fund managers)" },
  { sect: "3801", label: "AFIA authorized" },
  { sect: "3802", label: "AFIA registered" },
  { sect: "3101", label: "SSIF (investment firms)" },
];

async function asfAdapter(cap: number): Promise<AdapterResult> {
  const rows: AdapterResult["rows"] = [];
  for (const { sect, label } of ASF_SECTIONS) {
    const url = `https://data.asfromania.ro/registru/lista.php?sect=${sect}&lng=1`;
    console.log(`ASF RO: section ${sect} (${label})`);
    const buf = await fetchBuffer(url);
    rows.push(...parseAsfList(buf.toString("utf8"), label));
    await sleep(1200);
  }
  return { rows: rows.slice(0, cap) };
}

const FINFSA_URL =
  "https://www.finanssivalvonta.fi/api/supervised-entity-api/v1/all-supervised-entities";

async function finfsaAdapter(cap: number): Promise<AdapterResult> {
  console.log("FIN-FSA: downloading all-supervised-entities JSON");
  const buf = await fetchBuffer(FINFSA_URL);
  const entities = JSON.parse(buf.toString("utf8")) as FinFsaEntity[];
  console.log(`FIN-FSA: ${entities.length} supervised entities in dump`);
  return { rows: finFsaSelectRows(entities, cap) };
}

const ADAPTERS: Record<string, (cap: number) => Promise<AdapterResult>> = {
  cssf: cssfAdapter,
  nbs: nbsAdapter,
  amf: amfAdapter,
  lb: lbAdapter,
  finma: finmaAdapter,
  esma: esmaAdapter,
  hanfa: hanfaAdapter,
  no: noAdapter,
  afm: afmAdapter,
  knf: knfAdapter,
  cnmv: cnmvAdapter,
  fise: fiseAdapter,
  lv: lvAdapter,
  fiee: fieeAdapter,
  asf: asfAdapter,
  finfsa: finfsaAdapter,
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
