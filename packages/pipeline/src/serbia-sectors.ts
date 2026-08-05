import "./env";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import * as xlsx from "xlsx";

/**
 * SERBIA DEEP RUN — Enumerate ALL companies across every NACE sector (A–S),
 * paginate fully, extract every data point, and output to a single Excel file.
 *
 * Execution:
 *   pnpm exec tsx packages/pipeline/src/serbia-sectors.ts
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const URLS_FILE = path.join(REPO_ROOT, "data", "kompanije-sector-urls.json");
const EXCEL_OUT_FILE = path.join(REPO_ROOT, "data", "kompanije-data.xlsx");
const BASE = "https://www.kompanije.co.rs";
const DELAY_MS = 1200; // Polite delay for heavy profile scraping

/** Comprehensive NACE sections covering the entire economy (A through S) */
const TARGET_SECTIONS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", 
  "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch a single page and extract hrefs and the total company count. */
async function fetchPageHrefs(
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
    const totalM = /(\d[\d.]*)\s*\n?\s*Kompanij/i.exec(text);
    const total =
      totalM === null ? 0 : Number.parseInt((totalM[1] ?? "0").replace(/\./g, ""), 10);

    const children = [
      ...new Set(
        hrefs.filter((h) => /^\/delatnost\/[A-Z0-9]+$/.test(h) && h !== url.replace(BASE, "") && !h.includes("?")),
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

/** Fetch the base node and paginate through all available companies. */
async function readNodeFully(
  browser: Browser,
  baseUrl: string,
): Promise<{ children: string[]; companies: string[]; total: number }> {
  const firstPage = await fetchPageHrefs(browser, baseUrl);
  const allCompanies = new Set<string>(firstPage.companies);
  const { children, total } = firstPage;

  let currentPage = 2;
  let consecutiveEmptyPages = 0;

  while (allCompanies.size < total) {
    const paginatedUrl = `${baseUrl}?page=${currentPage}`;
    await sleep(DELAY_MS);
    
    const pageData = await fetchPageHrefs(browser, paginatedUrl);
    let addedNew = false;
    
    for (const c of pageData.companies) {
      if (!allCompanies.has(c)) {
        allCompanies.add(c);
        addedNew = true;
      }
    }

    if (!addedNew) {
      consecutiveEmptyPages++;
      if (consecutiveEmptyPages >= 2) break;
    } else {
      consecutiveEmptyPages = 0;
    }

    currentPage++;
  }

  return { children, companies: [...allCompanies], total };
}

/** Visit an individual company profile page and scrape all text fields, emails, websites, and tables. */
async function extractCompanyDetails(
  browser: Browser,
  url: string,
): Promise<Record<string, string> | null> {
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};
      
      // 1. Extract Company Name from main header
      const nameEl = document.querySelector("h1");
      result["Company Name"] = nameEl ? nameEl.innerText.trim() : "Unknown";

      // 2. Extract key-value pairs from data tables
      const rows = document.querySelectorAll("table tr");
      rows.forEach((row) => {
        const th = row.querySelector("th") || row.querySelector("td:nth-child(1)");
        const td = row.querySelector("td:nth-child(2)") || row.querySelector("td:last-child");
        
        if (th && td && th !== td) {
          const key = th.innerText.trim().replace(/:$/, "");
          const value = td.innerText.trim();
          if (key && value) {
            result[key] = value;
          }
        }
      });

      // 3. Fallback pass: scan lists, info blocks, and text nodes for metadata (emails, web, etc.)
      const listItems = document.querySelectorAll("li, .info-row, dt, p, div");
      listItems.forEach((item) => {
        const text = (item as HTMLElement).innerText;
        if (text && text.includes(":") && text.length < 200) {
          const [key, ...valParts] = text.split(":");
          const cleanKey = key.trim();
          const cleanVal = valParts.join(":").trim();
          if (cleanKey && cleanVal && !result[cleanKey] && cleanKey.length < 40) {
            result[cleanKey] = cleanVal;
          }
        }
      });

      // 4. Specifically target visible anchor links (to ensure websites and raw mailtos are caught)
      const links = document.querySelectorAll("a[href]");
      links.forEach((link) => {
        const href = link.getAttribute("href") ?? "";
        const text = link.textContent?.trim() ?? "";
        if (href.startsWith("mailto:")) {
          result["Email"] = href.replace("mailto:", "").trim();
        } else if (href.startsWith("http") && !href.includes("kompanije.co.rs")) {
          result["Website"] = href;
        }
      });

      return result;
    });

    data["Profile URL"] = url;
    return data;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const companyUrls = new Set<string>();
  const visited = new Set<string>();

  console.log("=== PHASE 1: Discovering Company URLs Across All Sectors (A-S) ===");
  let frontier = TARGET_SECTIONS.map((s) => `${BASE}/delatnost/${s}`);
  
  for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
    const next: string[] = [];
    console.log(`\n=== depth ${depth}: ${frontier.length} nodes ===`);
    for (const url of frontier) {
      if (visited.has(url)) continue;
      visited.add(url);
      
      const { children, companies } = await readNodeFully(browser, url);
      for (const c of companies) companyUrls.add(BASE + c);
      for (const child of children) {
        const abs = BASE + child;
        if (!visited.has(abs)) next.push(abs);
      }
      await sleep(400);
    }
    frontier = [...new Set(next)];
  }

  const mergedUrls = [...new Set([...companyUrls])];
  writeFileSync(URLS_FILE, JSON.stringify(mergedUrls, null, 0));
  console.log(`\nURL Discovery complete: ${mergedUrls.length} unique company profiles cataloged.`);

  console.log("\n=== PHASE 2: Extracting All Attributes & Contacts from Profiles ===");
  const allCompanyRecords: Record<string, string>[] = [];

  for (let i = 0; i < mergedUrls.length; i++) {
    const url = mergedUrls[i];
    console.log(`[${i + 1}/${mergedUrls.length}] Extracting: ${url}`);
    
    const record = await extractCompanyDetails(browser, url);
    if (record) {
      allCompanyRecords.push(record);
    }
    await sleep(DELAY_MS);
  }

  await browser.close();

  console.log("\n=== PHASE 3: Saving Complete Dataset to Excel ===");
  if (allCompanyRecords.length > 0) {
    const worksheet = xlsx.utils.json_to_sheet(allCompanyRecords);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "All Companies");
    xlsx.writeFile(workbook, EXCEL_OUT_FILE);
    console.log(`\n✅ Success! Saved ${allCompanyRecords.length} company profiles with full data points to ${path.basename(EXCEL_OUT_FILE)}`);
  } else {
    console.log("⚠️ No data records were gathered.");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});