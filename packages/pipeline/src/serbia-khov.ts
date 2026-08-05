import "./env";
import { chromium } from "playwright";
import {
  createEntity,
  db,
  entities,
  entityTags,
  eq,
  organizations,
  resolveEntity,
  sql,
} from "@continuum/db";

/**
 * SERBIA DEEP RUN — KHOV official registers (Komisija za hartije od vrednosti).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-khov.ts
 *
 * THE gap this closes: kompanije.co.rs is a general company register and
 * carries no licence data at all, so Serbia's licensed fund managers,
 * investment funds, broker-dealers and custodians were absent from the corpus
 * (fund management showed ONE company, private_debt 39, liquid_alts 7).
 * KHOV is the primary securities regulator and publishes each register in
 * full, with licence numbers and dates.
 *
 * TIER: tier2_regulator. These are register-grade rows — the regulator's own
 * list is the verification — so they ACTIVATE directly, unlike the tier-3
 * aggregator rows which stay provisional.
 *
 * CONSENT DOCTRINE: the registers of брокери, портфолио менаџери and
 * инвестициони саветници are rolls of NATURAL PERSONS. They are deliberately
 * NOT harvested. Only organization registers are read.
 *
 * Page shape: each register renders a names table followed by a details table
 * (matični broj, licence number, licence date, registration number and date,
 * plus a type description). Rows are zipped by index.
 */

const BASE = "https://www.sec.gov.rs/index.php/sr/службени-регистри/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type Register = {
  slug: string;
  label: string;
  tags: string[];
  role: string;
  l1: string;
  l2?: string;
  l3?: string;
};

/** ORGANIZATION registers only — person rolls are excluded by doctrine. */
const REGISTERS: Register[] = [
  {
    slug: "регистар-друштава-за-управљање-инвестиционим-фондовима",
    label: "Društva za upravljanje investicionim fondovima (fund management companies)",
    tags: ["khov", "fund_manager"],
    role: "ManCo",
    l1: "liquid_alts",
  },
  {
    slug: "регистар-инвестициониx-фондовa-2",
    label: "Alternativni investicioni fondovi (AIFs)",
    tags: ["khov", "aif"],
    role: "Fund Vehicle",
    l1: "pe_growth",
  },
  {
    slug: "регистар-инвестициониx-фондовa",
    label: "Investicioni fondovi (UCITS / open-end funds)",
    tags: ["khov", "investment_fund"],
    role: "Fund Vehicle",
    l1: "liquid_alts",
  },
  {
    slug: "регистар-брокерско-дилерских-друштава",
    label: "Brokersko-dilerska društva (broker-dealers)",
    tags: ["khov", "broker_dealer"],
    role: "Advisor",
    l1: "service_graph",
  },
  {
    slug: "регистар-кастоди-банака",
    label: "Kastodi banke (custodian banks)",
    tags: ["khov", "custodian"],
    role: "Vendor",
    l1: "service_graph",
    l2: "asset_servicing",
    l3: "custodian",
  },
  {
    slug: "регистар-овлашћених-банака",
    label: "Ovlašćene banke (authorised banks)",
    tags: ["khov", "bank"],
    role: "Bank",
    l1: "service_graph",
  },
  {
    slug: "регистар-пружалаца-услуга-повезаних-с-дигиталним-токенима",
    label: "Pružaoci usluga povezanih s digitalnim tokenima (crypto-asset services)",
    tags: ["khov", "crypto_provider"],
    role: "Vendor",
    l1: "niche_alts",
    l2: "digital_assets",
  },
  {
    slug: "листе-друштава-за-ревизију",
    label: "Društva za reviziju (audit firms)",
    tags: ["khov", "audit_firm"],
    role: "Advisor",
    l1: "service_graph",
    l2: "legal_advisory",
  },
  {
    slug: "регистар-квалификованих-инвеститора",
    label: "Kvalifikovani investitori (qualified investors)",
    tags: ["khov", "qualified_investor"],
    role: "LP",
    l1: "service_graph",
  },
];

type Row = { name: string; maticniBroj?: string; licence?: string; licenceDate?: string; note?: string };

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** A cell that looks like an organization name rather than a code or date. */
function looksLikeName(s: string): boolean {
  return (
    s.length >= 6 &&
    s.length <= 160 &&
    /[A-Za-zČĆŠĐŽčćšđž]/.test(s) &&
    !/^\d/.test(s) &&
    !/^(назив|матични|број|датум|врста|редни)/i.test(s)
  );
}

async function scrapeRegister(slug: string): Promise<Row[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(BASE + slug, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(3500);
    const tables = await page.$$eval("table", (ts) =>
      ts.map((t) =>
        Array.from(t.querySelectorAll("tr")).map((tr) =>
          Array.from(tr.querySelectorAll("td,th")).map((td) =>
            (td.textContent ?? "").replace(/\s+/g, " ").trim(),
          ),
        ),
      ),
    );

    // Names: single-column cells that read like organization names.
    const names: string[] = [];
    const details: string[][] = [];
    for (const table of tables) {
      for (const row of table) {
        const cells = row.filter((c) => c !== "");
        if (cells.length === 1 && looksLikeName(cells[0] ?? "")) {
          names.push(clean(cells[0] ?? ""));
        } else if (cells.length >= 3) {
          details.push(cells.map(clean));
        }
      }
    }

    // Zip names to detail rows by position; detail rows may be absent.
    return names.map((name, i) => {
      const d = details[i] ?? [];
      const mb = d.find((c) => /^\d{8}$/.test(c));
      const lic = d.find((c) => /^\d+\/\d/.test(c));
      const date = d.find((c) => /^\d{2}\.\d{2}\.\d{4}\.?$/.test(c));
      const desc = d.find((c) => c.length > 25 && /[а-яА-Яa-zA-Z]/.test(c));
      return {
        name,
        ...(mb !== undefined ? { maticniBroj: mb } : {}),
        ...(lic !== undefined ? { licence: lic } : {}),
        ...(date !== undefined ? { licenceDate: date } : {}),
        ...(desc !== undefined ? { note: desc.slice(0, 300) } : {}),
      };
    });
  } catch {
    return [];
  } finally {
    await browser.close().catch(() => {});
  }
}

/** "21.09.2023." -> 2023-09-21 */
function toIso(d: string | undefined): string | undefined {
  if (d === undefined) {
    return undefined;
  }
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(d);
  return m === null ? undefined : `${m[3]}-${m[2]}-${m[1]}`;
}

async function main(): Promise<void> {
  const summary: string[] = [];

  for (const reg of REGISTERS) {
    const rows = await scrapeRegister(reg.slug);
    if (rows.length === 0) {
      summary.push(`✗ ${reg.label}: 0 rows parsed`);
      continue;
    }
    let created = 0;
    let merged = 0;
    let ambiguous = 0;

    for (const row of rows) {
      let entityId: string | undefined;
      if (row.maticniBroj !== undefined) {
        const hit = await db.execute(sql`
          SELECT entity_id FROM organizations WHERE registry_id = ${row.maticniBroj} LIMIT 1`);
        entityId = (hit.rows[0] as { entity_id: string } | undefined)?.entity_id;
      }
      if (entityId === undefined) {
        const resolved = await resolveEntity({
          name: row.name,
          country: "RS",
          kindHint: "organization",
        });
        if (resolved.outcome === "ambiguous" && row.maticniBroj === undefined) {
          ambiguous += 1;
          continue;
        }
        if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
          entityId = resolved.entityId;
          merged += 1;
        }
      } else {
        merged += 1;
      }

      if (entityId === undefined) {
        // Register-grade: the regulator's own list IS the verification, so
        // these activate directly rather than landing provisional.
        const entity = await createEntity({
          kind: "organization",
          name: row.name,
          country: "RS",
          tags: [...reg.tags, "pilot_rs", "register_verified", "rs_sector_target"],
        });
        await db.insert(organizations).values({ entityId: entity.id }).onConflictDoNothing();
        entityId = entity.id;
        created += 1;
      }

      for (const tag of [...reg.tags, "pilot_rs", "rs_sector_target"]) {
        await db.insert(entityTags).values({ entityId, tag }).onConflictDoNothing();
      }

      await db.execute(sql`
        UPDATE organizations SET
          registry_id = COALESCE(registry_id, ${row.maticniBroj ?? null}),
          legal_name = COALESCE(legal_name, ${row.name}),
          hq_country = COALESCE(hq_country, 'RS'),
          primary_role = COALESCE(primary_role, ${reg.role}),
          regulatory_status = COALESCE(regulatory_status, 'regulated'),
          primary_regulator = COALESCE(primary_regulator, 'Komisija za hartije od vrednosti (KHOV)'),
          regulatory_license_number = COALESCE(regulatory_license_number, ${row.licence ?? null}),
          category_fields = COALESCE(category_fields, '{}'::jsonb) || ${JSON.stringify({
            khov_register: reg.label,
            ...(row.licence !== undefined ? { khov_licence: row.licence } : {}),
            ...(toIso(row.licenceDate) !== undefined ? { khov_licence_date: toIso(row.licenceDate) } : {}),
            ...(row.note !== undefined ? { khov_type: row.note } : {}),
            khov_source_url: BASE + reg.slug,
            khov_fetched_at: new Date().toISOString(),
          })}::jsonb
        WHERE entity_id = ${entityId}::uuid`);

      await db.execute(sql`
        INSERT INTO entity_classifications (entity_id, asset_class, strategy, sub_class, source, status, confidence)
        VALUES (${entityId}::uuid, ${reg.l1}, ${reg.l3 ?? ""}, ${reg.l2 ?? null}, 'register', 'proposed', '0.95')
        ON CONFLICT DO NOTHING`);
    }
    summary.push(
      `✓ ${reg.label}: ${rows.length} rows — created ${created}, merged ${merged}, ambiguous ${ambiguous}`,
    );
    console.log(summary[summary.length - 1]);
  }

  console.log("\n=== KHOV REGISTER HARVEST ===");
  for (const line of summary) {
    console.log(line);
  }
  console.log(
    "\nNOTE: registers of brokers, portfolio managers and investment advisers are\n" +
      "rolls of natural persons and were deliberately NOT harvested (consent doctrine).",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
