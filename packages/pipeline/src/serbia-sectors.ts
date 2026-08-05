import "./env";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";

/**
 * SERBIA DEEP RUN — enumerate companies by NACE class from the sector pages.
 *
 *   tsx src/serbia-sectors.ts            # discover company URLs by sector
 *
 * WHY THIS EXISTS: the sitemap is an INCOMPLETE index — it holds ~4,166
 * company URLs while the site clearly carries more, and it omitted exactly
 * the firms that matter most here (EOS International Investments, DDM Debt
 * Management, Atradius Collections and most of the 8291 debt-collection
 * cohort). Walking the sector tree targets the alternatives classes directly
 * instead of hoping the sitemap happened to include them.
 *
 * ROUTE: /delatnost/{SECTION} → divisions → groups → 4-digit classes, then
 * the class page itself, which lists its companies.
 *
 * ROBOTS COMPLIANCE (robots.txt fetched 2026-08-04):
 *   User-agent: *  /  Allow: /
 *   Disallow: /api/ · /admin/ · /_next/* · /*?page=
 *
 * The class page WITHOUT a query string is allowed and is what this reads.
 * `?page=N` is explicitly disallowed, so this harvester does not request it —
 * which caps each class at the ~24 companies the first page renders. That is
 * a deliberate ceiling, not a bug: where a class holds more, the shortfall is
 * reported per class in the summary so the gap is visible rather than silent.
 *
 * The complete lists for the financial classes live upstream in KHOV (fund
 * managers, funds, broker-dealers, custodians) and NBS (banks, leasing,
 * insurers, voluntary pension funds) — primary registers with tier-1/2
 * provenance. Those are the correct fix for the shortfall, not deeper
 * pagination of a tier-3 aggregator.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_FILE = path.join(REPO_ROOT, "data", "kompanije-sector-urls.json");
const BASE = "https://www.kompanije.co.rs";
const DELAY_MS = 900;

/** NACE sections whose divisions carry the alternatives universe. */
const TARGET_SECTIONS = ["K", "L", "M", "N", "D", "F", "J"];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Read a page and return every /delatnost/ link plus every company link. */
async function readNode(
  browser: Browser,
  url: string,
): Promise<{ children: string[]; companies: string[]; total: number }> {
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1400);
    const hrefs = await page.$$eval("a[href]", (as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const text = await page.evaluate(() => document.body.innerText);
    // "64 Kompanija" / "Kompanije" — the class's true company count.
    const totalM = /(\d[\d.]*)\s*\n?\s*Kompanij/i.exec(text);
    const total =
      totalM === null ? 0 : Number.parseInt((totalM[1] ?? "0").replace(/\./g, ""), 10);

    const children = [
      ...new Set(
        hrefs.filter((h) => /^\/delatnost\/[A-Z0-9]+$/.test(h) && h !== url.replace(BASE, "")),
      ),
    ];
    const companies = [
      ...new Set(
        hrefs.filter(
          (h) =>
            h.startsWith("/") &&
            h.length > 14 &&
            !/^\/(delatnost|mesto|okrug|statistika|pretraga)/.test(h) &&
            !h.includes("?"),
        ),
      ),
    ];
    return { children, companies, total };
  } catch {
    return { children: [], companies: [], total: 0 };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const companyUrls = new Set<string>();
  const shortfalls: { code: string; got: number; total: number }[] = [];
  const visited = new Set<string>();

  // Breadth-first walk: section → division → group → class.
  let frontier = TARGET_SECTIONS.map((s) => `${BASE}/delatnost/${s}`);
  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const next: string[] = [];
    console.log(`\n=== depth ${depth}: ${frontier.length} nodes ===`);
    for (const url of frontier) {
      if (visited.has(url)) {
        continue;
      }
      visited.add(url);
      const { children, companies, total } = await readNode(browser, url);
      for (const c of companies) {
        companyUrls.add(BASE + c);
      }
      const code = url.split("/").pop() ?? "";
      if (companies.length > 0) {
        console.log(
          `  ${code}: ${companies.length} companies listed${total > companies.length ? ` (class holds ${total})` : ""}`,
        );
        if (total > companies.length) {
          shortfalls.push({ code, got: companies.length, total });
        }
      }
      for (const child of children) {
        const abs = BASE + child;
        if (!visited.has(abs)) {
          next.push(abs);
        }
      }
      await sleep(DELAY_MS);
    }
    frontier = [...new Set(next)];
  }
  await browser.close();

  // Merge with whatever the sitemap already gave us.
  const existing: string[] = existsSync(OUT_FILE)
    ? (JSON.parse(readFileSync(OUT_FILE, "utf8")) as string[])
    : [];
  const merged = [...new Set([...existing, ...companyUrls])];
  writeFileSync(OUT_FILE, JSON.stringify(merged, null, 0));

  const missed = shortfalls.reduce((n, s) => n + (s.total - s.got), 0);
  console.log(
    `\nserbia-sectors done: ${companyUrls.size} company URLs discovered · ${merged.length} total in ${path.basename(OUT_FILE)}`,
  );
  console.log(
    `\nHONEST SHORTFALL: ${shortfalls.length} classes hold more companies than their first page lists, ` +
      `so ${missed} companies are NOT reachable without the disallowed ?page= URLs.`,
  );
  for (const s of shortfalls.sort((a, b) => b.total - b.got - (a.total - a.got)).slice(0, 15)) {
    console.log(`  ${s.code}: got ${s.got} of ${s.total}`);
  }
  console.log(
    `\nThe upstream fix for these: KHOV (fund managers, funds, broker-dealers,\n` +
      `custodians) and NBS (banks, leasing, insurers, voluntary pension funds)\n` +
      `publish the COMPLETE lists with tier-1/2 provenance.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
