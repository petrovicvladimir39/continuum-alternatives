import "./env";
import { chromium } from "playwright";
import {
  createEntity,
  db,
  entityTags,
  organizations,
  resolveEntity,
  sql,
} from "@continuum/db";

/**
 * SERBIA DEEP RUN — NBS (Narodna banka Srbije) supervised-institution lists.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-nbs.ts
 *
 * NBS supervises everything KHOV does not: banks, financial leasing, insurance,
 * VOLUNTARY PENSION FUNDS and their management companies (the domestic LP
 * base), payment institutions and e-money institutions.
 *
 * ROUTE NOTE: nbs.rs answers with HTTP 200 and an "ERROR 404" BODY for unknown
 * paths — a soft 404. An earlier probe of guessed URLs therefore looked
 * successful while returning nothing. The real paths carry NO /index.html
 * suffix; they were read from the site's own navigation rather than guessed,
 * and every page here is verified to render a real list before parsing.
 *
 * TIER: tier2_regulator — the central bank's own list is the verification, so
 * rows ACTIVATE directly.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type NbsList = {
  url: string;
  label: string;
  tags: string[];
  role: string;
  l1: string;
  l2?: string;
  l3?: string;
};

const LISTS: NbsList[] = [
  {
    url: "https://nbs.rs/sr/finansijske-institucije/banke/spisak-banaka",
    label: "Spisak banaka (banks)",
    tags: ["nbs", "bank"],
    role: "Bank",
    l1: "service_graph",
  },
  {
    url: "https://nbs.rs/sr/finansijske-institucije/penzijski-fondovi/dpf",
    label: "Društva za upravljanje dobrovoljnim penzijskim fondovima (voluntary pension fund managers)",
    tags: ["nbs", "pension_manco"],
    role: "LP",
    l1: "service_graph",
  },
  {
    url: "https://nbs.rs/sr/finansijske-institucije/pi-ien/registar-pi",
    label: "Registar platnih institucija (payment institutions)",
    tags: ["nbs", "payment_institution"],
    role: "Vendor",
    l1: "service_graph",
    l2: "technology",
  },
  {
    url: "https://nbs.rs/sr/finansijske-institucije/pi-ien/registar-ien",
    label: "Registar institucija elektronskog novca (e-money institutions)",
    tags: ["nbs", "emoney_institution"],
    role: "Vendor",
    l1: "service_graph",
    l2: "technology",
  },
  {
    url: "https://nbs.rs/sr/finansijske-institucije/lizing/poslovanje-dfl/",
    label: "Društva za finansijski lizing (financial leasing)",
    tags: ["nbs", "leasing"],
    role: "GP",
    l1: "private_debt",
    l2: "asset_backed_lending",
  },
];

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Reads like an institution name, not a heading, code or date. */
function looksLikeInstitution(s: string): boolean {
  return (
    s.length >= 6 &&
    s.length <= 150 &&
    /[A-Za-zČĆŠĐŽčćšđž]/.test(s) &&
    !/^\d/.test(s) &&
    !/^(naziv|redni|br\.|adresa|telefon|sedište|matični|www|http)/i.test(s) &&
    /(banka|bank|a\.?d\.?|d\.?o\.?o\.?|osiguranje|lizing|leasing|društvo|fond|institucija|payment|pay)/i.test(s)
  );
}

async function scrapeList(url: string): Promise<{ names: string[]; soft404: boolean }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(2800);
    const text = await page.evaluate(() => document.body.innerText);
    // nbs.rs soft-404s with HTTP 200 — detect it from the body, not the status.
    if (/ERROR 404|Page Not Found|strana ne postoji/i.test(text)) {
      return { names: [], soft404: true };
    }
    const cells = await page.$$eval("table td, table th, li", (els) =>
      els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()),
    );
    const names = [...new Set(cells.map(clean).filter(looksLikeInstitution))];
    return { names, soft404: false };
  } catch {
    return { names: [], soft404: false };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main(): Promise<void> {
  const summary: string[] = [];

  for (const list of LISTS) {
    const { names, soft404 } = await scrapeList(list.url);
    if (soft404) {
      summary.push(`✗ ${list.label}: SOFT 404 (page not found) — url needs re-checking`);
      console.log(summary[summary.length - 1]);
      continue;
    }
    if (names.length === 0) {
      summary.push(`✗ ${list.label}: 0 institutions parsed — layout drifted`);
      console.log(summary[summary.length - 1]);
      continue;
    }

    let created = 0;
    let merged = 0;
    let ambiguous = 0;
    for (const name of names) {
      const resolved = await resolveEntity({ name, country: "RS", kindHint: "organization" });
      let entityId: string;
      if (resolved.outcome === "ambiguous") {
        ambiguous += 1;
        continue;
      }
      if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
        entityId = resolved.entityId;
        merged += 1;
      } else {
        // Regulator-grade: the central bank's list IS the verification.
        const entity = await createEntity({
          kind: "organization",
          name,
          country: "RS",
          tags: [...list.tags, "pilot_rs", "register_verified", "rs_sector_target"],
        });
        await db.insert(organizations).values({ entityId: entity.id }).onConflictDoNothing();
        entityId = entity.id;
        created += 1;
      }

      for (const tag of [...list.tags, "pilot_rs", "rs_sector_target"]) {
        await db.insert(entityTags).values({ entityId, tag }).onConflictDoNothing();
      }
      await db.execute(sql`
        UPDATE organizations SET
          legal_name = COALESCE(legal_name, ${name}),
          hq_country = COALESCE(hq_country, 'RS'),
          primary_role = COALESCE(primary_role, ${list.role}),
          regulatory_status = COALESCE(regulatory_status, 'regulated'),
          primary_regulator = COALESCE(primary_regulator, 'Narodna banka Srbije (NBS)'),
          category_fields = COALESCE(category_fields, '{}'::jsonb) || ${JSON.stringify({
            nbs_register: list.label,
            nbs_source_url: list.url,
            nbs_fetched_at: new Date().toISOString(),
          })}::jsonb
        WHERE entity_id = ${entityId}::uuid`);
      await db.execute(sql`
        INSERT INTO entity_classifications (entity_id, asset_class, strategy, sub_class, source, status, confidence)
        VALUES (${entityId}::uuid, ${list.l1}, ${list.l3 ?? ""}, ${list.l2 ?? null}, 'register', 'proposed', '0.95')
        ON CONFLICT DO NOTHING`);
    }
    summary.push(
      `✓ ${list.label}: ${names.length} institutions — created ${created}, merged ${merged}, ambiguous ${ambiguous}`,
    );
    console.log(summary[summary.length - 1]);
  }

  console.log("\n=== NBS HARVEST ===");
  for (const line of summary) {
    console.log(line);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
