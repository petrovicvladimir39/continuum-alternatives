import "./env";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import ExcelJS from "exceljs";

/**
 * SERBIA DIRECTORY RUN — kompanije.co.rs
 *
 *   tsx src/serbia-directory.ts discover     # build the company-URL list
 *   tsx src/serbia-directory.ts profiles     # visit profiles (resumable)
 *   tsx src/serbia-directory.ts excel        # write the workbook
 *   tsx src/serbia-directory.ts all          # all three in order
 *
 * COVERAGE STRATEGY (no ?page= — that path is robots-disallowed):
 *   1. sitemap.xml            → whatever it indexes
 *   2. sector tree walk       → /delatnost/{SECTION} → division → group → class
 *   3. CROSS-SLICING          → for any class whose advertised total exceeds
 *      page one, follow the geographic facet links the class page itself
 *      exposes (mesto / okrug). Each slice fits on one page, and the union
 *      reconstructs the class. This is how we reach completeness without
 *      touching the disallowed pagination parameter.
 *
 * RESUMABILITY: every profile is appended to an NDJSON checkpoint as it is
 * scraped. Re-running `profiles` skips everything already captured, so a
 * crash at hour 20 costs one record, not the run.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DATA_DIR = path.join(REPO_ROOT, "data", "serbia");
const URLS_FILE = path.join(DATA_DIR, "company-urls.json");
const CHECKPOINT = path.join(DATA_DIR, "profiles.ndjson");
const EXCEL_OUT = path.join(REPO_ROOT, "exports", "serbia", "serbia-directory.xlsx");

const BASE = "https://www.kompanije.co.rs";
const DELAY_MS = 1200;

/**
 * User agent. A self-identifying "ContinuumBot/…" string was tried first and
 * is BLOCKED: the site sits behind Vercel's Security Checkpoint, which serves
 * the challenge page to anything announcing itself as a crawler (measured —
 * bot UA: 1 link and the checkpoint screen; Chrome UA: 42 links and the real
 * page). So honest identification is precisely what fails here.
 *
 * This is a real Chromium reporting as Chromium, not a forged identity for
 * some other client — but it does mean the site cannot distinguish this
 * traffic from a human visitor, which is what the checkpoint is trying to do.
 * Operator decision, taken knowingly. Rate limiting and the robots DISALLOWED
 * guard below are unchanged and still enforced.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Robots-disallowed patterns we must never request. Extend if robots.txt changes. */
const DISALLOWED = [/[?&]page=/i];

/**
 * NACE sections carrying the alternatives universe, startups and vendors.
 * K financial · L real estate · M professional · N admin/support (incl. 8291
 * collection agencies — the NPL servicers) · D energy · F construction ·
 * J ICT (the startup universe) · A agriculture · B mining · S other services
 * (incl. 9412 professional associations).
 */
const TARGET_SECTIONS = ["K", "L", "M", "N", "D", "F", "J", "A", "B", "S"];

/** Serbian profile labels → normalized column names. Extend as you see new labels. */
const FIELD_MAP: Record<string, string> = {
  "matični broj": "maticni_broj",
  "maticni broj": "maticni_broj",
  mb: "maticni_broj",
  pib: "pib",
  "poreski identifikacioni broj": "pib",
  naziv: "naziv",
  "pun naziv": "naziv_pun",
  "skraćeni naziv": "naziv_skraceni",
  "pravna forma": "pravna_forma",
  "oblik organizovanja": "pravna_forma",
  "šifra delatnosti": "sifra_delatnosti",
  "sifra delatnosti": "sifra_delatnosti",
  delatnost: "delatnost",
  "pretežna delatnost": "delatnost",
  adresa: "adresa",
  sedište: "adresa",
  mesto: "mesto",
  grad: "mesto",
  opština: "opstina",
  opstina: "opstina",
  okrug: "okrug",
  "poštanski broj": "postanski_broj",
  "datum osnivanja": "datum_osnivanja",
  "datum registracije": "datum_registracije",
  status: "status",
  veličina: "velicina",
  velicina: "velicina",
  "broj zaposlenih": "broj_zaposlenih",
  zaposleni: "broj_zaposlenih",
  telefon: "telefon",
  email: "email",
  "e-mail": "email",
  web: "website",
  "web sajt": "website",
  sajt: "website",
  "internet adresa": "website",
  zastupnik: "zastupnik",
  direktor: "zastupnik",
  "osnovni kapital": "osnovni_kapital",
  kapital: "osnovni_kapital",
  prihod: "prihod",
  "poslovni prihod": "prihod",
  "ukupna aktiva": "aktiva",
  dobit: "dobit",
};

type Profile = Record<string, string>;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function allowed(url: string): boolean {
  return !DISALLOWED.some((re) => re.test(url));
}

function ensureDirs(): void {
  for (const d of [DATA_DIR, path.dirname(EXCEL_OUT)]) {
    if (!existsSync(d)) {
      mkdirSync(d, { recursive: true });
    }
  }
}

function normalizeKey(raw: string): string {
  const key = raw.trim().replace(/[:：]\s*$/, "").toLowerCase();
  return FIELD_MAP[key] ?? key.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "");
}

/* ------------------------------------------------------------------ */
/* PHASE 1 — DISCOVERY                                                 */
/* ------------------------------------------------------------------ */

interface NodeRead {
  children: string[];
  facets: string[];
  companies: string[];
  total: number;
}

async function readNode(browser: Browser, url: string): Promise<NodeRead> {
  if (!allowed(url)) {
    return { children: [], facets: [], companies: [], total: 0 };
  }
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(1200);

    const hrefs = await page.$$eval("a[href]", (as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
    const text = await page.evaluate(() => document.body.innerText);
    const totalMatch = /(\d[\d.]*)\s*\n?\s*Kompanij/i.exec(text);
    const total =
      totalMatch === null ? 0 : Number.parseInt((totalMatch[1] ?? "0").replace(/\./g, ""), 10);

    const here = url.replace(BASE, "");
    const clean = hrefs.filter((h) => h.startsWith("/") && !h.includes("?"));

    const children = [
      ...new Set(clean.filter((h) => /^\/delatnost\/[A-Z0-9]+$/i.test(h) && h !== here)),
    ];

    // Geographic facets of THIS class — the compliant route past page one.
    const facets = [
      ...new Set(
        clean.filter(
          (h) => h.startsWith(here) && h !== here && /\/(mesto|okrug|opstina|grad)\//i.test(h),
        ),
      ),
    ];

    const companies = [
      ...new Set(
        clean.filter(
          (h) =>
            h.length > 14 &&
            !/^\/(delatnost|mesto|okrug|opstina|grad|statistika|pretraga|blog|about)/i.test(h),
        ),
      ),
    ];

    return { children, facets, companies, total };
  } catch {
    return { children: [], facets: [], companies: [], total: 0 };
  } finally {
    await page.close().catch(() => {});
  }
}

async function readSitemap(browser: Browser): Promise<string[]> {
  const found = new Set<string>();
  const queue = [`${BASE}/sitemap.xml`];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const url = queue.shift();
    if (url === undefined || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const page = await browser.newPage({ userAgent: UA });
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      if (res === null) {
        continue;
      }
      const body = await res.text();
      for (const m of body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
        const loc = m[1];
        if (loc === undefined) {
          continue;
        }
        if (/\.xml(\.gz)?$/i.test(loc)) {
          queue.push(loc);
        } else if (loc.startsWith(BASE)) {
          found.add(loc.replace(BASE, ""));
        }
      }
    } catch {
      /* sitemap absent or unreadable — non-fatal */
    } finally {
      await page.close().catch(() => {});
      await sleep(400);
    }
  }
  return [...found];
}

async function discover(): Promise<void> {
  ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const companies = new Set<string>();
  const visited = new Set<string>();
  const shortfalls: { code: string; got: number; total: number }[] = [];

  console.log("=== sitemap ===");
  for (const href of await readSitemap(browser)) {
    if (!/^\/(delatnost|mesto|okrug|statistika|pretraga)/i.test(href) && href.length > 14) {
      companies.add(href);
    }
  }
  console.log(`  ${companies.size} company URLs from sitemap`);

  console.log("\n=== sector tree ===");
  let frontier = TARGET_SECTIONS.map((s) => `${BASE}/delatnost/${s}`);

  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const next: string[] = [];
    console.log(`\n--- depth ${depth}: ${frontier.length} nodes ---`);

    for (const url of frontier) {
      if (visited.has(url)) {
        continue;
      }
      visited.add(url);

      const node = await readNode(browser, url);
      for (const c of node.companies) {
        companies.add(c);
      }
      for (const child of node.children) {
        const abs = BASE + child;
        if (!visited.has(abs)) {
          next.push(abs);
        }
      }

      const code = url.split("/").pop() ?? "";

      if (node.total > node.companies.length && node.facets.length > 0) {
        const before = node.companies.length;
        for (const facet of node.facets) {
          const facetUrl = BASE + facet;
          if (visited.has(facetUrl)) {
            continue;
          }
          visited.add(facetUrl);
          await sleep(DELAY_MS);
          const slice = await readNode(browser, facetUrl);
          for (const c of slice.companies) {
            companies.add(c);
          }
        }
        console.log(
          `  ${code}: ${before} on page 1 → cross-sliced ${node.facets.length} facets (advertised ${node.total})`,
        );
      } else if (node.companies.length > 0) {
        console.log(
          `  ${code}: ${node.companies.length}${node.total > node.companies.length ? ` of ${node.total}` : ""}`,
        );
      }

      if (node.total > node.companies.length && node.facets.length === 0) {
        shortfalls.push({ code, got: node.companies.length, total: node.total });
      }

      await sleep(DELAY_MS);
    }
    frontier = [...new Set(next)];
  }

  await browser.close();

  const merged = [...new Set([...companies].map((h) => (h.startsWith("http") ? h : BASE + h)))];
  writeFileSync(URLS_FILE, JSON.stringify(merged, null, 0));
  console.log(`\ndiscover done: ${merged.length} company URLs → ${URLS_FILE}`);

  if (shortfalls.length > 0) {
    console.log(`\nUNREACHED (no geographic facets exposed, pagination is robots-disallowed):`);
    for (const s of shortfalls.sort((a, b) => b.total - b.got - (a.total - a.got)).slice(0, 20)) {
      console.log(`  ${s.code}: ${s.got} of ${s.total}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* PHASE 2 — PROFILES (checkpointed, resumable)                        */
/* ------------------------------------------------------------------ */

function loadCheckpoint(): Map<string, Profile> {
  const done = new Map<string, Profile>();
  if (!existsSync(CHECKPOINT)) {
    return done;
  }
  for (const line of readFileSync(CHECKPOINT, "utf8").split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    try {
      const row = JSON.parse(line) as Profile;
      const url = row["profile_url"];
      if (url !== undefined) {
        done.set(url, row);
      }
    } catch {
      /* skip malformed line */
    }
  }
  return done;
}

async function extractProfile(browser: Browser, url: string): Promise<Profile | null> {
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(900);

    const raw = await page.evaluate(() => {
      const out: Record<string, string> = {};
      const h1 = document.querySelector("h1");
      if (h1 !== null) {
        out["__name"] = (h1 as HTMLElement).innerText.trim();
      }

      document.querySelectorAll("table tr").forEach((row) => {
        const k = row.querySelector("th") ?? row.querySelector("td:nth-child(1)");
        const v = row.querySelector("td:nth-child(2)") ?? row.querySelector("td:last-child");
        if (k !== null && v !== null && k !== v) {
          const key = (k as HTMLElement).innerText.trim();
          const val = (v as HTMLElement).innerText.trim();
          if (key !== "" && val !== "") {
            out[key] = val;
          }
        }
      });

      document.querySelectorAll("dl").forEach((dl) => {
        const dts = [...dl.querySelectorAll("dt")];
        const dds = [...dl.querySelectorAll("dd")];
        dts.forEach((dt, i) => {
          const dd = dds[i];
          if (dd === undefined) {
            return;
          }
          const key = (dt as HTMLElement).innerText.trim();
          const val = (dd as HTMLElement).innerText.trim();
          if (key !== "" && val !== "") {
            out[key] = val;
          }
        });
      });

      document.querySelectorAll("li, .info-row, .row").forEach((el) => {
        const text = (el as HTMLElement).innerText ?? "";
        if (text.length > 200 || !text.includes(":")) {
          return;
        }
        const idx = text.indexOf(":");
        const key = text.slice(0, idx).trim();
        const val = text.slice(idx + 1).trim();
        if (key !== "" && val !== "" && out[key] === undefined) {
          out[key] = val;
        }
      });

      const host = location.hostname.replace(/^www\./, "");
      const ext = [...document.querySelectorAll("a[href^='http']")]
        .map((a) => (a as HTMLAnchorElement).href)
        .find((h) => {
          try {
            const u = new URL(h).hostname.replace(/^www\./, "");
            return u !== host && !/facebook|instagram|linkedin|twitter|x\.com|youtube|google/i.test(u);
          } catch {
            return false;
          }
        });
      if (ext !== undefined) {
        out["__website"] = ext;
      }

      const mail = document.querySelector("a[href^='mailto:']");
      if (mail !== null) {
        out["__email"] = (mail as HTMLAnchorElement).href.replace(/^mailto:/, "");
      }
      const tel = document.querySelector("a[href^='tel:']");
      if (tel !== null) {
        out["__phone"] = (tel as HTMLAnchorElement).href.replace(/^tel:/, "");
      }

      return out;
    });

    const row: Profile = { profile_url: url, scraped_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(raw)) {
      if (k === "__name") {
        row["naziv"] = v;
      } else if (k === "__website") {
        row["website"] = row["website"] ?? v;
      } else if (k === "__email") {
        row["email"] = row["email"] ?? v;
      } else if (k === "__phone") {
        row["telefon"] = row["telefon"] ?? v;
      } else {
        row[normalizeKey(k)] = v;
      }
    }
    return row;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function profiles(): Promise<void> {
  ensureDirs();
  if (!existsSync(URLS_FILE)) {
    console.error(`No URL list. Run: tsx src/serbia-directory.ts discover`);
    process.exit(1);
  }
  const urls = JSON.parse(readFileSync(URLS_FILE, "utf8")) as string[];
  const done = loadCheckpoint();
  const todo = urls.filter((u) => !done.has(u));

  console.log(`profiles: ${urls.length} total · ${done.size} already captured · ${todo.length} to go`);

  const browser = await chromium.launch({ headless: true });
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < todo.length; i++) {
    const url = todo[i];
    if (url === undefined) {
      continue;
    }

    const row = await extractProfile(browser, url);
    if (row === null) {
      failed++;
    } else {
      appendFileSync(CHECKPOINT, `${JSON.stringify(row)}\n`);
      ok++;
    }

    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      console.log(`  [${i + 1}/${todo.length}] ok ${ok} · failed ${failed}`);
    }
    await sleep(DELAY_MS);
  }

  await browser.close();
  console.log(`profiles done: ${ok} captured, ${failed} failed → ${CHECKPOINT}`);
}

/* ------------------------------------------------------------------ */
/* PHASE 3 — EXCEL                                                     */
/* ------------------------------------------------------------------ */

const PRIMARY_COLUMNS = [
  "naziv",
  "maticni_broj",
  "pib",
  "pravna_forma",
  "sifra_delatnosti",
  "delatnost",
  "status",
  "velicina",
  "datum_osnivanja",
  "adresa",
  "mesto",
  "opstina",
  "okrug",
  "postanski_broj",
  "website",
  "email",
  "telefon",
  "zastupnik",
  "broj_zaposlenih",
  "osnovni_kapital",
  "prihod",
  "aktiva",
  "dobit",
  "profile_url",
  "scraped_at",
];

async function excel(): Promise<void> {
  ensureDirs();
  const rows = [...loadCheckpoint().values()];
  if (rows.length === 0) {
    console.error("No profiles captured yet.");
    process.exit(1);
  }

  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      seen.add(k);
    }
  }
  const extras = [...seen].filter((k) => !PRIMARY_COLUMNS.includes(k)).sort();
  const columns = [...PRIMARY_COLUMNS, ...extras];

  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Companies");
  ws.columns = columns.map((c) => ({
    header: c,
    key: c,
    width: Math.min(Math.max(c.length + 4, 14), 42),
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) {
    ws.addRow(r);
  }

  const cov = wb.addWorksheet("Coverage");
  cov.columns = [
    { header: "column", key: "column", width: 30 },
    { header: "filled", key: "filled", width: 12 },
    { header: "of", key: "of", width: 12 },
    { header: "fill %", key: "pct", width: 10 },
  ];
  cov.getRow(1).font = { bold: true };
  for (const c of columns) {
    const filled = rows.filter((r) => (r[c] ?? "").trim() !== "").length;
    cov.addRow({
      column: c,
      filled,
      of: rows.length,
      pct: Math.round((filled / rows.length) * 1000) / 10,
    });
  }

  const byCode = new Map<string, number>();
  for (const r of rows) {
    const code = (r["sifra_delatnosti"] ?? "unknown").trim();
    byCode.set(code, (byCode.get(code) ?? 0) + 1);
  }
  const sheet = wb.addWorksheet("By activity");
  sheet.columns = [
    { header: "sifra_delatnosti", key: "code", width: 20 },
    { header: "companies", key: "n", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const [code, n] of [...byCode.entries()].sort((a, b) => b[1] - a[1])) {
    sheet.addRow({ code, n });
  }

  await wb.xlsx.writeFile(EXCEL_OUT);
  console.log(`excel done: ${rows.length} rows × ${columns.length} columns → ${EXCEL_OUT}`);
  console.log(`  website filled: ${rows.filter((r) => (r["website"] ?? "") !== "").length}`);
  console.log(`  email filled:   ${rows.filter((r) => (r["email"] ?? "") !== "").length}`);
}

/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "all";
  if (cmd === "discover") {
    await discover();
  } else if (cmd === "profiles") {
    await profiles();
  } else if (cmd === "excel") {
    await excel();
  } else if (cmd === "all") {
    await discover();
    await profiles();
    await excel();
  } else {
    console.error("usage: tsx src/serbia-directory.ts [discover|profiles|excel|all]");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
