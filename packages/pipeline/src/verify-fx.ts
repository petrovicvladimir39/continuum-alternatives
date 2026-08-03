import "./env";
import {
  BAM_PER_EUR,
  EUROPE_TAXONOMY,
  EUROPE_L1_SLUGS,
  LEGACY_CLASS_TO_L1,
  classifyFromLicence,
  parseEurofxref,
  subClassForStrategy,
  toEur,
} from "@continuum/shared";

/**
 * Verify: EUROPE DEPTH RUN foundations — deterministic ECB FX conversion
 * (incl. rate_date propagation), the four-level taxonomy spine, and the
 * licence-keyword classifier. Pure fixtures, no network, no DB.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
<Cube>
<Cube time='2026-08-03'>
<Cube currency='USD' rate='1.0842'/>
<Cube currency='CZK' rate='24.318'/>
<Cube currency='PLN' rate='4.2515'/>
<Cube currency='GBP' rate='0.8462'/>
</Cube>
<Cube time='2026-08-01'>
<Cube currency='USD' rate='1.0855'/>
<Cube currency='CZK' rate='24.401'/>
</Cube>
</Cube>
</gesmes:Envelope>`;

async function main(): Promise<void> {
  console.log("— eurofxref parsing —");
  const tables = parseEurofxref(SAMPLE_XML);
  check(tables.length === 2, `two rate days parsed (got ${tables.length})`);
  const day1 = tables[0];
  check(day1?.rateDate === "2026-08-03", `first day is 2026-08-03 (got ${day1?.rateDate})`);
  check(day1?.rates.USD === 1.0842, "USD rate parsed verbatim");
  check(Object.keys(day1?.rates ?? {}).length === 4, "four currencies on day 1");

  console.log("— toEur conversion (rate_date always carried) —");
  const t = tables[0];
  if (t === undefined) {
    check(false, "sample table exists");
    process.exit(1);
  }
  const eur = toEur(1_000_000, "EUR", t);
  check(eur.amountEur === 1_000_000 && eur.rateDate === t.rateDate, "EUR passthrough keeps rate_date");
  const czk = toEur(24_318_000, "CZK", t);
  check(czk.amountEur === 1_000_000, `CZK 24.318M -> EUR 1M (got ${czk.amountEur})`);
  check(czk.rateDate === "2026-08-03", "CZK conversion stamps the ECB rate_date");
  check(czk.amount === 24_318_000 && czk.currency === "CZK", "original amount + currency preserved");
  const bam = toEur(195_583, "BAM", t);
  check(bam.amountEur === 100_000, `BAM statutory peg ${BAM_PER_EUR} (got ${bam.amountEur})`);
  const rsd = toEur(5_000_000, "RSD", t);
  check(rsd.amountEur === null && rsd.rateDate === null, "non-ECB currency (RSD) stays null — never guessed");
  const nan = toEur(Number.NaN, "USD", t);
  check(nan.amountEur === null, "NaN amount never converts");
  const lower = toEur(1084.2, "usd", t);
  check(lower.amountEur === 1000, "currency code case-insensitive");

  console.log("— four-level taxonomy spine —");
  check(EUROPE_TAXONOMY.length === 6, `six Level-1 classes (got ${EUROPE_TAXONOMY.length})`);
  check(
    EUROPE_L1_SLUGS.join(",") ===
      "pe_growth,private_debt,real_assets,liquid_alts,niche_alts,service_graph",
    "L1 slugs in constitutional order",
  );
  const l3Count = EUROPE_TAXONOMY.flatMap((c) => c.subClasses).flatMap((s) => s.strategies).length;
  check(l3Count >= 70, `L3 strategies modeled (got ${l3Count})`);
  const npl = subClassForStrategy("cee_npl_servicing");
  check(npl?.l1 === "private_debt" && npl?.l2 === "npl", "L3 -> L2 -> L1 derivation");
  check(subClassForStrategy("nonexistent") === undefined, "unknown L3 stays unknown");
  const legacyMapped = Object.values(LEGACY_CLASS_TO_L1).every((v) => EUROPE_L1_SLUGS.includes(v));
  check(legacyMapped, "every legacy class maps into the six-class spine");

  console.log("— licence-keyword classifier (deterministic, never force-fit) —");
  const aifm = classifyFromLicence("Alternative Investment Fund Manager (AIFM)");
  check(aifm?.l1 === "liquid_alts" && aifm?.role === "ManCo", "AIFM licence classifies as ManCo");
  const tfi = classifyFromLicence("towarzystwo funduszy inwestycyjnych");
  check(tfi?.l1 === "liquid_alts", "Polish TFI recognized");
  const npl2 = classifyFromLicence("credit servicing firm (NPL directive)");
  check(npl2?.l1 === "private_debt" && npl2?.l2 === "npl", "credit servicer -> NPL sub-class");
  const pension = classifyFromLicence("dôchodková správcovská spoločnosť");
  check(pension?.role === "LP", "Slovak pension company -> LP side");
  check(classifyFromLicence("bakery and confectionery") === undefined, "irrelevant licence NOT force-fit");
  check(classifyFromLicence("") === undefined, "empty input stays unclassified");

  console.log(failures === 0 ? "\nverify-fx: ALL GREEN" : `\nverify-fx: ${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
