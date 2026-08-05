import "./env";
import { db, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — firmographic profile layer ($0, fully derived).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-firmographics.ts
 *
 * Reshapes what we already hold into the field set the leading B2B platforms
 * (LinkedIn company pages, Apollo firmographics) expose, so an entity page and
 * a filter rail feel familiar to anyone who uses those tools:
 *
 *   domain                — normalized from the website
 *   linkedin_url          — the COMPANY page only (never people; consent doctrine)
 *   facebook/instagram/x  — split out of the captured social links
 *   employee_range        — LinkedIn's own buckets (1-10 … 10001+)
 *   revenue_range_rsd     — order-of-magnitude bands over filed revenue
 *   company_type          — derived from the Serbian legal form
 *   industry              — the register's own NACE label
 *   industry_section      — NACE section letter + name
 *
 * Everything is DERIVED from stored register facts — no new fetching, no
 * guessing. A field is omitted when its input is missing.
 *
 * NOTE ON CURRENCY: revenue stays in RSD. The ECB reference set does not
 * publish RSD, so a deterministic EUR conversion is not available from our
 * existing FX source; NBS publishes the official EUR/RSD rate and is the
 * correct source to add later. We do NOT invent a rate.
 */

/** LinkedIn's company-size buckets, verbatim. */
function employeeRange(n: number): string {
  if (n <= 1) return "1";
  if (n <= 10) return "2-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1,000";
  if (n <= 5000) return "1,001-5,000";
  if (n <= 10000) return "5,001-10,000";
  return "10,001+";
}

/** Order-of-magnitude revenue bands (RSD), Apollo-style. */
function revenueRange(rsd: number): string {
  if (rsd < 10_000_000) return "< 10M RSD";
  if (rsd < 100_000_000) return "10M - 100M RSD";
  if (rsd < 500_000_000) return "100M - 500M RSD";
  if (rsd < 1_000_000_000) return "500M - 1B RSD";
  if (rsd < 5_000_000_000) return "1B - 5B RSD";
  if (rsd < 10_000_000_000) return "5B - 10B RSD";
  if (rsd < 50_000_000_000) return "10B - 50B RSD";
  return "50B+ RSD";
}

/** Serbian legal form → the company-type vocabulary these platforms use. */
function companyType(legalForm: string): string | undefined {
  const s = legalForm.toLowerCase();
  if (s.includes("javno preduze")) return "Government Agency";
  if (s.includes("otvoreno akcionarsko")) return "Public Company";
  if (s.includes("akcionarsko")) return "Public Company";
  if (s.includes("zadruga")) return "Cooperative";
  if (s.includes("ogranak") || s.includes("predstavni")) return "Branch of Foreign Company";
  if (s.includes("ortačko") || s.includes("ortacko") || s.includes("komanditno")) return "Partnership";
  if (s.includes("ograničenom") || s.includes("ogranicenom")) return "Privately Held";
  if (s.includes("preduzetnik")) return "Sole Proprietorship";
  return undefined;
}

/** NACE section letter + English name, from the 2-digit division. */
function naceSection(division: number): { letter: string; name: string } | undefined {
  const table: [number, number, string, string][] = [
    [1, 3, "A", "Agriculture, Forestry and Fishing"],
    [5, 9, "B", "Mining and Quarrying"],
    [10, 33, "C", "Manufacturing"],
    [35, 35, "D", "Electricity, Gas, Steam and Air Conditioning"],
    [36, 39, "E", "Water Supply, Sewerage and Waste Management"],
    [41, 43, "F", "Construction"],
    [45, 47, "G", "Wholesale and Retail Trade"],
    [49, 53, "H", "Transportation and Storage"],
    [55, 56, "I", "Accommodation and Food Service"],
    [58, 63, "J", "Information and Communication"],
    [64, 66, "K", "Financial and Insurance Activities"],
    [68, 68, "L", "Real Estate Activities"],
    [69, 75, "M", "Professional, Scientific and Technical Activities"],
    [77, 82, "N", "Administrative and Support Service Activities"],
    [84, 84, "O", "Public Administration and Defence"],
    [85, 85, "P", "Education"],
    [86, 88, "Q", "Human Health and Social Work"],
    [90, 93, "R", "Arts, Entertainment and Recreation"],
    [94, 96, "S", "Other Service Activities"],
  ];
  for (const [lo, hi, letter, name] of table) {
    if (division >= lo && division <= hi) {
      return { letter, name };
    }
  }
  return undefined;
}

function domainOf(website: string): string | undefined {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const rows = (
    await db.execute(sql`
      SELECT o.entity_id, o.website, o.legal_form_native,
             o.category_fields->>'employees'   AS employees,
             o.category_fields->>'revenue_rsd' AS revenue,
             o.category_fields->>'nace_code'   AS nace_code,
             o.category_fields->>'nace_label'  AS nace_label,
             o.category_fields->'social_links' AS socials
      FROM organizations o JOIN entities e ON e.id = o.entity_id
      WHERE e.country = 'RS'
    `)
  ).rows as {
    entity_id: string;
    website: string | null;
    legal_form_native: string | null;
    employees: string | null;
    revenue: string | null;
    nace_code: string | null;
    nace_label: string | null;
    socials: string[] | null;
  }[];

  console.log(`serbia-firmographics: ${rows.length} Serbian organizations`);
  const filled = {
    domain: 0, linkedin: 0, facebook: 0, instagram: 0, x: 0,
    employeeRange: 0, revenueRange: 0, companyType: 0, industry: 0, section: 0,
  };

  for (const row of rows) {
    const f: Record<string, string> = {};

    if (row.website !== null) {
      const d = domainOf(row.website);
      if (d !== undefined) {
        f.domain = d;
        filled.domain += 1;
      }
    }
    for (const link of row.socials ?? []) {
      if (/linkedin\.com\/company/i.test(link) && f.linkedin_url === undefined) {
        f.linkedin_url = link;
        filled.linkedin += 1;
      } else if (/facebook\.com/i.test(link) && f.facebook_url === undefined) {
        f.facebook_url = link;
        filled.facebook += 1;
      } else if (/instagram\.com/i.test(link) && f.instagram_url === undefined) {
        f.instagram_url = link;
        filled.instagram += 1;
      } else if (/(twitter|x)\.com/i.test(link) && f.x_url === undefined) {
        f.x_url = link;
        filled.x += 1;
      }
    }
    const emp = row.employees === null ? Number.NaN : Number.parseInt(row.employees, 10);
    if (Number.isFinite(emp)) {
      f.employee_range = employeeRange(emp);
      filled.employeeRange += 1;
    }
    const rev = row.revenue === null ? Number.NaN : Number.parseInt(row.revenue, 10);
    if (Number.isFinite(rev)) {
      f.revenue_range_rsd = revenueRange(rev);
      filled.revenueRange += 1;
    }
    if (row.legal_form_native !== null) {
      const t = companyType(row.legal_form_native);
      if (t !== undefined) {
        f.company_type = t;
        filled.companyType += 1;
      }
    }
    if (row.nace_label !== null && row.nace_label !== "") {
      f.industry = row.nace_label;
      filled.industry += 1;
    }
    if (row.nace_code !== null) {
      const div = Number.parseInt(row.nace_code.slice(0, 2), 10);
      const sec = Number.isFinite(div) ? naceSection(div) : undefined;
      if (sec !== undefined) {
        f.industry_section = `${sec.letter} — ${sec.name}`;
        filled.section += 1;
      }
    }

    if (Object.keys(f).length === 0) {
      continue;
    }
    await db.execute(sql`
      UPDATE organizations
      SET category_fields = coalesce(category_fields, '{}'::jsonb)
                            || jsonb_build_object('firmographics', ${JSON.stringify(f)}::jsonb)
      WHERE entity_id = ${row.entity_id}::uuid`);
  }

  console.log(
    `\nserbia-firmographics done:\n` +
      `  domain ${filled.domain} · linkedin ${filled.linkedin} · facebook ${filled.facebook} · instagram ${filled.instagram} · x ${filled.x}\n` +
      `  employee_range ${filled.employeeRange} · revenue_range ${filled.revenueRange} · company_type ${filled.companyType}\n` +
      `  industry ${filled.industry} · industry_section ${filled.section}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
