import "./env";
import { createInterface } from "node:readline";
import { createReadStream, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, entityClassifications, RegisterImporter, type RegisterRow } from "@continuum/db";
import { splitLine } from "./registers";

/**
 * EUROPE DEPTH RUN — Step-2 register adapters ($0 deterministic), one file
 * for the run's national-register harvesters. Doctrine identical to
 * registers-harvest.ts: RegisterImporter dedup law, register rows ACTIVATE,
 * every schema field the source exposes is captured (RegisterRow.depth),
 * mechanical relevance filters only, 3,000-row cap per source.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/europe-registers.ts --register gbch
 *
 * gbch — Companies House Free Company Data (monthly bulk CSV, ~5.7M rows).
 *   Extract first:  data/europe-depth/downloads/ch-bulk/*.csv
 *   Mechanical SIC-code buckets (UK SIC 2007), per-bucket caps totalling
 *   3,000. 64205 (financial holdcos) deliberately EXCLUDED: six-figure count
 *   of shelf/holding vehicles, no alternatives signal — recorded honestly.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type SicBucket = {
  sic: string;
  cap: number;
  l1: string;
  l2?: string;
  l3?: string;
  role?: string;
};

// Priority-ordered buckets; caps sum to 3,000.
const GB_SIC_BUCKETS: SicBucket[] = [
  { sic: "64303", cap: 600, l1: "pe_growth", l2: "venture_capital", role: "GP" }, // venture & development capital
  { sic: "66300", cap: 600, l1: "liquid_alts", role: "ManCo" }, // fund management
  { sic: "64301", cap: 200, l1: "liquid_alts", role: "Fund Vehicle" }, // investment trusts
  { sic: "64302", cap: 150, l1: "liquid_alts", role: "Fund Vehicle" }, // unit trusts
  { sic: "64304", cap: 150, l1: "liquid_alts", role: "Fund Vehicle" }, // OEICs
  { sic: "64305", cap: 150, l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" }, // property unit trusts
  { sic: "64306", cap: 150, l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" }, // REITs
  { sic: "82911", cap: 300, l1: "private_debt", l2: "npl", role: "Servicer" }, // collection agencies
  { sic: "64921", cap: 200, l1: "private_debt", l2: "direct_lending", role: "GP" }, // non-deposit credit
  { sic: "64922", cap: 100, l1: "private_debt", l2: "asset_backed_lending", l3: "real_estate_debt", role: "GP" }, // mortgage finance
  { sic: "64991", cap: 100, l1: "liquid_alts", role: "ManCo" }, // security dealing on own account
  { sic: "66110", cap: 100, l1: "service_graph", role: "Vendor" }, // administration of financial markets
  { sic: "66190", cap: 200, l1: "service_graph", role: "Vendor" }, // auxiliary to financial intermediation
];

const GB_LEGAL_FORM_STD: [RegExp, string][] = [
  [/limited liability partnership/i, "partnership"],
  [/limited partnership/i, "partnership"],
  [/plc|public limited/i, "corp"],
  [/private limited|ltd/i, "corp"],
  [/community interest/i, "other"],
  [/royal charter|registered society|industrial/i, "other"],
];

function gbLegalFormStd(category: string): string {
  for (const [re, std] of GB_LEGAL_FORM_STD) {
    if (re.test(category)) {
      return std;
    }
  }
  return "other";
}

async function harvestGbCompaniesHouse(): Promise<void> {
  const dir = path.join(REPO_ROOT, "data", "europe-depth", "downloads", "ch-bulk");
  if (!existsSync(dir)) {
    console.error(`extract the zip first: ${dir} missing`);
    process.exit(1);
  }
  const csv = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".csv"));
  if (csv === undefined) {
    console.error("no CSV inside ch-bulk/");
    process.exit(1);
  }
  const file = path.join(dir, csv);
  console.log(`gbch: streaming ${csv} (SIC buckets, caps total 3000)`);

  const taken = new Map<string, number>();
  const picked: { row: RegisterRow; bucket: SicBucket }[] = [];
  let header: string[] = [];
  let col: Record<string, number> = {};
  let lines = 0;

  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    lines += 1;
    if (lines === 1) {
      header = splitLine(line, ",").map((h) => h.trim());
      col = Object.fromEntries(header.map((h, i) => [h, i]));
      continue;
    }
    if (picked.length >= 3000) {
      break;
    }
    const cells = splitLine(line, ",");
    const status = cells[col["CompanyStatus"] ?? -1] ?? "";
    if (status !== "Active") {
      continue;
    }
    const sics = [
      cells[col["SICCode.SicText_1"] ?? -1] ?? "",
      cells[col["SICCode.SicText_2"] ?? -1] ?? "",
      cells[col["SICCode.SicText_3"] ?? -1] ?? "",
      cells[col["SICCode.SicText_4"] ?? -1] ?? "",
    ];
    const bucket = GB_SIC_BUCKETS.find((b) => sics.some((s) => s.startsWith(b.sic)));
    if (bucket === undefined) {
      continue;
    }
    const already = taken.get(bucket.sic) ?? 0;
    if (already >= bucket.cap) {
      continue;
    }
    const name = cells[col["CompanyName"] ?? -1] ?? "";
    const number = cells[col["CompanyNumber"] ?? -1] ?? "";
    if (name === "" || number === "") {
      continue;
    }
    taken.set(bucket.sic, already + 1);
    const street = [cells[col["RegAddress.AddressLine1"] ?? -1], cells[col["RegAddress.AddressLine2"] ?? -1]]
      .filter((s) => s !== undefined && s !== "")
      .join(", ");
    const city = cells[col["RegAddress.PostTown"] ?? -1] ?? "";
    const postal = cells[col["RegAddress.PostCode"] ?? -1] ?? "";
    const category = cells[col["CompanyCategory"] ?? -1] ?? "";
    const incorporated = cells[col["IncorporationDate"] ?? -1] ?? "";
    const uri = cells[col["URI"] ?? -1] ?? "";
    const row: RegisterRow = {
      name,
      country: "GB",
      city: city || null,
      registryId: `GBCH:${number}`,
      tags: ["register_verified", "gbch"],
      note: `Companies House ${number} · SIC ${bucket.sic} · ${category || "?"}`,
      depth: {
        legalName: name,
        legalFormNative: category || "",
        legalFormStandardized: gbLegalFormStd(category),
        legalStatus: "active",
        ...(incorporated !== "" ? { incorporationDate: toIsoDate(incorporated) } : {}),
        registeredAddress: {
          ...(street !== "" ? { street } : {}),
          ...(city !== "" ? { city } : {}),
          ...(postal !== "" ? { postal } : {}),
          country: "GB",
        },
        hqCountry: "GB",
        regulatoryStatus: "unregulated", // register grade; FCA licence layer is a separate source
        primaryRegulator: "Companies House",
        ...(bucket.role !== undefined ? { primaryRole: bucket.role } : {}),
      },
      ...(uri !== "" ? {} : {}),
    };
    picked.push({ row, bucket });
  }
  rl.close();
  console.log(
    `gbch: scanned ${lines.toLocaleString()} lines · picked ${picked.length} (` +
      GB_SIC_BUCKETS.map((b) => `${b.sic}:${taken.get(b.sic) ?? 0}`).join(" ") +
      ")",
  );

  const importer = new RegisterImporter();
  await importer.init();
  let classifications = 0;
  for (const { row, bucket } of picked) {
    const result = await importer.importRow(row);
    if (
      (result.outcome === "created" || result.outcome === "merged" || result.outcome === "merged_registry") &&
      result.entityId !== undefined
    ) {
      await db
        .insert(entityClassifications)
        .values({
          entityId: result.entityId,
          assetClass: bucket.l1,
          strategy: bucket.l3 ?? "",
          subClass: bucket.l2 ?? null,
          source: "register",
          status: "proposed",
          confidence: "0.90",
        })
        .onConflictDoNothing();
      classifications += 1;
    }
  }
  await importer.flush();
  // flush() assigns ids for batched creates — the classification pass above
  // only reaches rows resolved before flush; run a reconcile for the rest.
  const missing = picked.filter(({ row }) => row.registryId !== undefined);
  let reconciled = 0;
  for (const { row, bucket } of missing) {
    const id = row.registryId === null || row.registryId === undefined ? undefined : importer.entityIdFor(row.registryId);
    if (id === undefined) {
      continue;
    }
    const inserted = await db
      .insert(entityClassifications)
      .values({
        entityId: id,
        assetClass: bucket.l1,
        strategy: bucket.l3 ?? "",
        subClass: bucket.l2 ?? null,
        source: "register",
        status: "proposed",
        confidence: "0.90",
      })
      .onConflictDoNothing()
      .returning({ e: entityClassifications.entityId });
    reconciled += inserted.length;
  }
  console.log(
    `gbch import: created ${importer.counts.created} · merged ${importer.counts.merged + importer.counts.merged_registry} · ambiguous skipped ${importer.counts.ambiguous} · invalid ${importer.counts.skipped} · classifications ${classifications}+${reconciled}`,
  );
  if (importer.ambiguousRows.length > 0) {
    console.log(`ambiguous sample: ${importer.ambiguousRows.slice(0, 5).join(" | ")}`);
  }
}

/** Companies House dates are DD/MM/YYYY. */
function toIsoDate(d: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  return m === null ? d : `${m[3]}-${m[2]}-${m[1]}`;
}

const ADAPTERS: Record<string, () => Promise<void>> = {
  gbch: harvestGbCompaniesHouse,
};

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("europe-registers.ts") === true;
if (isMain) {
  const idx = process.argv.indexOf("--register");
  const key = idx >= 0 ? process.argv[idx + 1] : undefined;
  const adapter = key === undefined ? undefined : ADAPTERS[key];
  if (adapter === undefined) {
    console.error(`usage: europe-registers.ts --register <${Object.keys(ADAPTERS).join("|")}>`);
    process.exit(1);
  }
  adapter()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
