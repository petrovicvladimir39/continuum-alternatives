import "./env";
import * as cheerio from "cheerio";
import { db, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — S3 website crawler ($0, deterministic, cheerio).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-site-enrich.ts [--limit N]
 *
 * For every RS entity that HAS a website, politely crawl its own site (max 8
 * pages) and extract, deterministically and with provenance:
 *
 *   LOGO      og:image → apple-touch-icon → header <img> → favicon
 *   SUMMARY   og:description → meta description → first About paragraph,
 *             stored VERBATIM and attributed to the company's own site
 *   CONTACTS  mailto: / tel: links
 *   HQ ADDRESS from the contact page → Nominatim → ROOFTOP/street precision
 *
 * House rules held throughout: FILL-NULL only (a register value always wins),
 * nothing is guessed, and every field carries its source URL + fetched_at in
 * organizations.enrichment.website_crawl so the provenance is auditable.
 *
 * No LLM. Prose is taken verbatim from the page that published it, never
 * paraphrased — which is also why it can be published labeled as the
 * company's own words.
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PAGE_PATHS = [
  "",
  "/o-nama",
  "/about",
  "/about-us",
  "/kontakt",
  "/contact",
  "/tim",
  "/team",
];
const MAX_PAGES = 8;
const FETCH_TIMEOUT = 15_000;

type Crawled = {
  logoUrl?: string;
  summary?: string;
  email?: string;
  phone?: string;
  address?: string;
  pagesFetched: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) {
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

function absolutize(base: string, href: string): string | undefined {
  try {
    return new URL(href, base).href;
  } catch {
    return undefined;
  }
}

/** Serbian address heuristics: street + number, and a 5-digit postal + city. */
function findAddress($: cheerio.CheerioAPI, text: string): string | undefined {
  // Prefer an explicit address element.
  const tagged = clean($("address").first().text());
  if (tagged.length > 12 && tagged.length < 200) {
    return tagged;
  }
  // Otherwise a line carrying a street token and a house number.
  const streetRe =
    /([A-ZČĆŠĐŽ][\p{L}\s.\-]{3,40}\s+(?:\d{1,3}[a-zA-Z]?(?:\/\d+)?))\s*,?\s*(\d{5})\s+([\p{L}\s]{3,30})/u;
  const m = streetRe.exec(text);
  if (m !== null) {
    return clean(`${m[1]}, ${m[2]} ${m[3]}`);
  }
  const bg = /(\d{5})\s+(Beograd|Novi Sad|Niš|Kragujevac|Subotica|Zemun)/i.exec(text);
  if (bg !== null) {
    return clean(`${bg[1]} ${bg[2]}`);
  }
  return undefined;
}

async function crawlSite(website: string): Promise<Crawled> {
  const result: Crawled = { pagesFetched: [] };
  let root: string;
  try {
    root = new URL(website).origin;
  } catch {
    return result;
  }

  // Build the page list: the standard paths, plus any same-host contact/about
  // link discovered on the homepage.
  const queue: string[] = [];
  const home = await fetchHtml(root);
  result.pagesFetched.push(root);
  if (home !== null) {
    const $h = cheerio.load(home);
    $h("a[href]").each((_, a) => {
      const href = $h(a).attr("href") ?? "";
      if (!/(kontakt|contact|o-nama|about|tim|team|portfolio|fondovi|funds|usluge|services|impressum)/i.test(href)) {
        return;
      }
      const abs = absolutize(root, href);
      if (abs !== undefined && abs.startsWith(root) && !queue.includes(abs)) {
        queue.push(abs);
      }
    });
  }
  for (const p of PAGE_PATHS) {
    if (p === "") {
      continue;
    }
    const abs = root + p;
    if (!queue.includes(abs)) {
      queue.push(abs);
    }
  }

  const pages: { url: string; html: string }[] = [];
  if (home !== null) {
    pages.push({ url: root, html: home });
  }
  for (const url of queue) {
    if (pages.length >= MAX_PAGES) {
      break;
    }
    const html = await fetchHtml(url);
    if (html !== null) {
      pages.push({ url, html });
      result.pagesFetched.push(url);
    }
    await sleep(700); // polite to a single small host
  }
  if (pages.length === 0) {
    return result;
  }

  const first = pages[0];
  if (first !== undefined) {
    const $ = cheerio.load(first.html);
    // LOGO cascade.
    const og = $('meta[property="og:image"]').attr("content");
    const apple = $('link[rel="apple-touch-icon"]').attr("href");
    const headerImg = $("header img, .logo img, a.navbar-brand img, #logo img").first().attr("src");
    const icon = $('link[rel~="icon"]').attr("href");
    const logoRaw = og ?? apple ?? headerImg ?? icon;
    if (logoRaw !== undefined) {
      const abs = absolutize(first.url, logoRaw);
      if (abs !== undefined) {
        result.logoUrl = abs;
      }
    }
    // SUMMARY — verbatim, never paraphrased.
    const ogd = $('meta[property="og:description"]').attr("content");
    const metad = $('meta[name="description"]').attr("content");
    let summary = clean(ogd ?? metad ?? "");
    if (summary.length < 60) {
      for (const page of pages) {
        if (!/o-nama|about/i.test(page.url) && page !== first) {
          continue;
        }
        const $p = cheerio.load(page.html);
        $p("p").each((_, el) => {
          const t = clean($p(el).text());
          if (summary.length < 60 && t.length >= 80 && t.length <= 900) {
            summary = t;
          }
        });
        if (summary.length >= 60) {
          break;
        }
      }
    }
    if (summary.length >= 40) {
      result.summary = summary.slice(0, 900);
    }
  }

  // CONTACTS + ADDRESS — scan contact pages first, then any page.
  const ordered = [...pages].sort((a, b) =>
    Number(/kontakt|contact/i.test(b.url)) - Number(/kontakt|contact/i.test(a.url)),
  );
  for (const page of ordered) {
    const $ = cheerio.load(page.html);
    if (result.email === undefined) {
      const mail = $("a[href^='mailto:']").first().attr("href");
      const addr = mail?.replace(/^mailto:/i, "").split("?")[0]?.trim();
      if (addr !== undefined && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(addr)) {
        result.email = addr;
      }
    }
    if (result.phone === undefined) {
      const tel = $("a[href^='tel:']").first().attr("href");
      const num = tel?.replace(/^tel:/i, "").trim();
      if (num !== undefined && num.length >= 6 && num.length <= 30) {
        result.phone = num;
      }
    }
    if (result.address === undefined) {
      const found = findAddress($, clean($("body").text()).slice(0, 20000));
      if (found !== undefined) {
        result.address = found;
      }
    }
    if (result.email !== undefined && result.phone !== undefined && result.address !== undefined) {
      break;
    }
  }
  return result;
}

/** Nominatim, 1 request/second per their usage policy. */
async function geocode(address: string): Promise<{ lat: number; lon: number; precision: string } | null> {
  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(address + ", Serbia")}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      lat: string;
      lon: string;
      type?: string;
      class?: string;
      address?: Record<string, string>;
    }[];
    const hit = json[0];
    if (hit === undefined) {
      return null;
    }
    const hasHouse = hit.address?.house_number !== undefined;
    const hasRoad = hit.address?.road !== undefined;
    const precision = hasHouse ? "rooftop" : hasRoad ? "street" : "city";
    return { lat: Number.parseFloat(hit.lat), lon: Number.parseFloat(hit.lon), precision };
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx >= 0 ? Number.parseInt(process.argv[limIdx + 1] ?? "0", 10) : 0;

  const targetsOnly = process.argv.includes("--targets-only");
  // Target-sector companies first, then by revenue, so a partial run always
  // covers the alternatives-relevant universe before the long tail. Rows
  // already crawled (provenance envelope present) are skipped, making the
  // pass resumable.
  const rows = (
    await db.execute(sql`
      SELECT o.entity_id, o.website, e.name
      FROM organizations o
      JOIN entities e ON e.id = o.entity_id
      WHERE e.country = 'RS' AND o.website IS NOT NULL
        AND o.enrichment->'website_crawl' IS NULL
        ${targetsOnly ? sql`AND EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = 'rs_sector_target')` : sql``}
      ORDER BY
        EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = 'rs_sector_target') DESC,
        (o.category_fields->>'revenue_rsd')::numeric DESC NULLS LAST,
        e.name
      ${limit > 0 ? sql`LIMIT ${limit}` : sql``}
    `)
  ).rows as { entity_id: string; website: string; name: string }[];

  console.log(`serbia-site-enrich: ${rows.length} RS entities with a website`);
  const filled = { logo: 0, summary: 0, email: 0, phone: 0, address: 0, rooftop: 0, street: 0 };
  let crawled = 0;
  let dead = 0;

  for (const row of rows) {
    const c = await crawlSite(row.website);
    if (c.pagesFetched.length === 0) {
      dead += 1;
      continue;
    }
    crawled += 1;
    const fetchedAt = new Date().toISOString();

    if (c.logoUrl !== undefined) {
      const u = await db.execute(sql`
        UPDATE organizations SET logo_url = ${c.logoUrl}, logo_source = 'website_crawl',
               logo_fetched_at = now()
        WHERE entity_id = ${row.entity_id}::uuid AND logo_url IS NULL RETURNING entity_id`);
      filled.logo += u.rows.length;
    }
    if (c.email !== undefined) {
      const u = await db.execute(sql`
        UPDATE organizations SET corporate_email = ${c.email}
        WHERE entity_id = ${row.entity_id}::uuid AND corporate_email IS NULL RETURNING entity_id`);
      filled.email += u.rows.length;
    }
    if (c.phone !== undefined) {
      const u = await db.execute(sql`
        UPDATE organizations SET corporate_phone = ${c.phone}
        WHERE entity_id = ${row.entity_id}::uuid AND corporate_phone IS NULL RETURNING entity_id`);
      filled.phone += u.rows.length;
    }
    if (c.summary !== undefined) {
      const u = await db.execute(sql`
        UPDATE entities SET summary = ${c.summary}
        WHERE id = ${row.entity_id}::uuid AND summary IS NULL RETURNING id`);
      filled.summary += u.rows.length;
    }

    // Provenance envelope — every crawled field cites the pages it came from.
    await db.execute(sql`
      UPDATE organizations
      SET enrichment = coalesce(enrichment, '{}'::jsonb) || ${JSON.stringify({
        website_crawl: {
          fetched_at: fetchedAt,
          pages: c.pagesFetched,
          found: {
            logo: c.logoUrl ?? null,
            summary_chars: c.summary?.length ?? 0,
            email: c.email ?? null,
            phone: c.phone ?? null,
            address: c.address ?? null,
          },
        },
      })}::jsonb
      WHERE entity_id = ${row.entity_id}::uuid`);

    if (c.address !== undefined) {
      filled.address += 1;
      const geo = await geocode(c.address);
      if (geo !== null) {
        if (geo.precision === "rooftop") {
          filled.rooftop += 1;
        } else if (geo.precision === "street") {
          filled.street += 1;
        }
        await db.execute(sql`
          INSERT INTO entity_locations
            (entity_id, source, raw_address, lat, lon, precision, location_confidence, geocoded_at)
          VALUES (${row.entity_id}::uuid, 'website_hq', ${c.address}, ${geo.lat}, ${geo.lon},
                  ${geo.precision}, ${geo.precision === "rooftop" ? "0.9" : geo.precision === "street" ? "0.7" : "0.4"}, now())
          ON CONFLICT (entity_id, source) DO UPDATE SET
            raw_address = EXCLUDED.raw_address, lat = EXCLUDED.lat, lon = EXCLUDED.lon,
            precision = EXCLUDED.precision, location_confidence = EXCLUDED.location_confidence,
            geocoded_at = now()`);
        await sleep(1100); // Nominatim: max 1 rps
      }
    }

    if (crawled % 10 === 0) {
      console.log(
        `  ${crawled}/${rows.length} · logos ${filled.logo} · summaries ${filled.summary} · emails ${filled.email} · rooftop ${filled.rooftop}`,
      );
    }
  }

  console.log(
    `\nserbia-site-enrich done: crawled ${crawled}, unreachable ${dead}\n` +
      `  logos ${filled.logo} · summaries ${filled.summary} · emails ${filled.email} · phones ${filled.phone}\n` +
      `  addresses found ${filled.address} → rooftop ${filled.rooftop} · street ${filled.street}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
