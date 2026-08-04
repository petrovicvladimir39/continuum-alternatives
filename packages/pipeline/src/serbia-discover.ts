import "./env";
import * as cheerio from "cheerio";
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
 * SERBIA DEEP RUN — S1 discovery ($0, deterministic, cheerio-parsed).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-discover.ts [--only fic,amcham]
 *
 * Success here is FIELD COMPLETENESS, not row count, so the sources are
 * ordered by how many schema fields each row arrives with — directories that
 * publish website + logo + contact + address beat registers that publish a
 * name and a number.
 *
 *   fic     — Foreign Investors Council. Richest rows in the run: street,
 *             city, postal, phone, email, website, sector (CSS class), and
 *             the PARENT COUNTRY (country-uk / country-french …) which gives
 *             deterministic domestic/foreign ownership.
 *   amcham  — AmCham Serbia. ~500 members, each with a LOGO url and a
 *             company-written description (both inside a tooltip payload).
 *
 * Every row is tagged `pilot_rs` so the Serbian working set is filterable and
 * exportable on its own, without fragmenting the graph.
 *
 * Directory membership is DECLARATIVE, not register-grade: new entities land
 * status='provisional' + needs_verification. Matched entities only gain
 * gap-fills (never overwrites) plus the source tag.
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

export type SerbiaRow = {
  name: string;
  website?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  postal?: string;
  logoUrl?: string;
  summary?: string;
  sector?: string;
  /** ISO2 of the parent/owner country when the directory states it. */
  parentCountry?: string;
  sourceUrl: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${res.status} ${url}`);
  }
  return res.text();
}

/** FIC encodes parent country as a CSS class: country-uk, country-french… */
const FIC_COUNTRY: Record<string, string> = {
  uk: "GB", british: "GB", usa: "US", american: "US", german: "DE", germany: "DE",
  french: "FR", france: "FR", italian: "IT", italy: "IT", austrian: "AT", austria: "AT",
  swiss: "CH", switzerland: "CH", dutch: "NL", netherlands: "NL", belgian: "BE",
  danish: "DK", swedish: "SE", norwegian: "NO", finnish: "FI", greek: "GR",
  spanish: "ES", portuguese: "PT", turkish: "TR", russian: "RU", chinese: "CN",
  japanese: "JP", korean: "KR", indian: "IN", israeli: "IL", hungarian: "HU",
  slovenian: "SI", croatian: "HR", czech: "CZ", "czech-republic": "CZ", polish: "PL",
  slovak: "SK", romanian: "RO", bulgarian: "BG", cypriot: "CY", luxembourg: "LU",
  irish: "IE", serbian: "RS", montenegrin: "ME", macedonian: "MK",
};

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Normalize a bare host or full url to https://host/path form. */
function normalizeUrl(raw: string): string | undefined {
  const t = raw.trim().replace(/[;,]+$/, "");
  if (t === "" || /^(mailto|tel):/i.test(t)) {
    return undefined;
  }
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!u.hostname.includes(".")) {
      return undefined;
    }
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return undefined;
  }
}

// ── FIC ─────────────────────────────────────────────────────────────────────

type WpPost = {
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  categories: number[];
};

/**
 * FIC members are WordPress posts. The /members/ page paginates client-side
 * (every /page/N/ serves page 1), so the REST API is the correct route: it
 * returns the same rows as clean JSON with no scraping of rendered pages.
 * Member posts are identified STRUCTURALLY — a <ul> carrying "Tel:" and
 * "Web:" — rather than by category, because members sit across several
 * committee categories.
 */
async function harvestFic(): Promise<SerbiaRow[]> {
  const out: SerbiaRow[] = [];
  const seen = new Set<string>();
  // Category slugs are the sector/country signal; fetch the map once.
  let catById = new Map<number, string>();
  try {
    const cats = JSON.parse(
      await fetchText("https://fic.org.rs/wp-json/wp/v2/categories?per_page=100"),
    ) as { id: number; slug: string }[];
    catById = new Map(cats.map((c) => [c.id, c.slug]));
  } catch {
    /* sector/country tags are optional */
  }

  for (let page = 1; page <= 8; page++) {
    let posts: WpPost[];
    try {
      posts = JSON.parse(
        await fetchText(`https://fic.org.rs/wp-json/wp/v2/posts?per_page=100&page=${page}`),
      ) as WpPost[];
    } catch {
      break;
    }
    if (posts.length === 0) {
      break;
    }
    for (const post of posts) {
      const html = post.content.rendered;
      // Structural member test: a contact block with phone AND web.
      if (!/Tel:/i.test(html) || !/Web:/i.test(html)) {
        continue;
      }
      const $ = cheerio.load(html);
      const name = cleanText(cheerio.load(`<i>${post.title.rendered}</i>`)("i").text());
      if (name === "" || seen.has(name.toLowerCase())) {
        continue;
      }
      seen.add(name.toLowerCase());

      const slugs = post.categories.map((id) => catById.get(id) ?? "").filter((s) => s !== "");
      const sectorSlug = slugs.find((s) => s.startsWith("sector-") || /industry|services|energy|real-estate|insurance|banking|pharma/i.test(s));
      const countrySlug = slugs.find((s) => FIC_COUNTRY[s.toLowerCase()] !== undefined);
      const parentIso = countrySlug === undefined ? undefined : FIC_COUNTRY[countrySlug.toLowerCase()];

      const lines: string[] = [];
      $("li").each((_, li) => {
        lines.push(cleanText($(li).text()));
      });
      const email = $("a[href^='mailto:']").first().attr("href")?.replace(/^mailto:/i, "");
      const webAnchor = $("li")
        .filter((_, li) => /Web:/i.test($(li).text()))
        .find("a")
        .first()
        .attr("href");

      let street: string | undefined;
      let city: string | undefined;
      let postal: string | undefined;
      for (const line of lines) {
        if (/^(Tel|E-?mail|Web|Enrolment|Fax)/i.test(line) || line === "") {
          continue;
        }
        const m = /^(\d{5})\s+(.+)$/.exec(line);
        if (m !== null && city === undefined) {
          postal = m[1];
          city = m[2];
        } else if (street === undefined) {
          street = line;
        }
      }
      const phone = lines.find((l) => /^Tel:/i.test(l))?.replace(/^Tel:\s*/i, "");
      const website = webAnchor === undefined ? undefined : normalizeUrl(webAnchor);

      out.push({
        name,
        sourceUrl: post.link,
        ...(website !== undefined ? { website } : {}),
        ...(email !== undefined && email.includes("@") ? { email } : {}),
        ...(phone !== undefined && phone !== "" ? { phone } : {}),
        ...(street !== undefined ? { street } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(postal !== undefined ? { postal } : {}),
        ...(sectorSlug !== undefined ? { sector: sectorSlug.replace(/^sector-/, "").replace(/-/g, " ") } : {}),
        ...(parentIso !== undefined ? { parentCountry: parentIso } : {}),
      });
    }
    await sleep(1000);
  }
  return out;
}

// ── AmCham ──────────────────────────────────────────────────────────────────

async function harvestAmcham(): Promise<SerbiaRow[]> {
  const url = "https://www.amcham.rs/members/";
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const out: SerbiaRow[] = [];
  const seen = new Set<string>();

  $("a.glossaryLink").each((_, el) => {
    const raw = $(el).attr("data-cmtooltip");
    if (raw === undefined || raw === "") {
      return;
    }
    // Tooltip is double-escaped HTML: decode once, then parse.
    const decoded = cheerio.load(`<div>${raw}</div>`)("div").text();
    const $t = cheerio.load(`<div>${decoded}</div>`);
    const name = cleanText($(el).text()) || cleanText($t(".glossaryItemTitle").text());
    if (name === "" || seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    const logo = $t("img").first().attr("src");
    // First real paragraph of the company's own blurb.
    const summary = cleanText($t("div").text())
      .replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      .slice(0, 900);
    out.push({
      name,
      sourceUrl: url,
      ...(logo !== undefined && /^https?:\/\//.test(logo) ? { logoUrl: logo } : {}),
      ...(summary.length > 40 ? { summary } : {}),
    });
  });
  return out;
}

// ── Import ──────────────────────────────────────────────────────────────────

type SourceStats = {
  rows: number;
  created: number;
  merged: number;
  ambiguous: number;
  withWebsite: number;
  withLogo: number;
  withEmail: number;
  withAddress: number;
};

async function importRows(sourceKey: string, rows: SerbiaRow[]): Promise<SourceStats> {
  const stats: SourceStats = {
    rows: rows.length,
    created: 0,
    merged: 0,
    ambiguous: 0,
    withWebsite: rows.filter((r) => r.website !== undefined).length,
    withLogo: rows.filter((r) => r.logoUrl !== undefined).length,
    withEmail: rows.filter((r) => r.email !== undefined).length,
    withAddress: rows.filter((r) => r.street !== undefined || r.city !== undefined).length,
  };
  const tag = `dir_${sourceKey}`;

  for (const row of rows) {
    const resolved = await resolveEntity({
      name: row.name,
      country: "RS",
      kindHint: "organization",
    });
    let entityId: string;
    if (resolved.outcome === "ambiguous") {
      stats.ambiguous += 1;
      continue;
    }
    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      entityId = resolved.entityId;
      stats.merged += 1;
    } else {
      const created = await createEntity({
        kind: "organization",
        name: row.name,
        country: "RS",
        tags: [tag, "pilot_rs", "needs_verification"],
      });
      await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, created.id));
      await db.insert(organizations).values({
        entityId: created.id,
        verificationNote: `${sourceKey} member directory (${row.sourceUrl})`,
      });
      entityId = created.id;
      stats.created += 1;
    }

    // Tags (idempotent).
    for (const t of [tag, "pilot_rs"]) {
      await db
        .insert(entityTags)
        .values({ entityId, tag: t })
        .onConflictDoNothing();
    }

    // FILL-NULL ONLY — a register value always wins over a directory value.
    const address =
      row.street !== undefined || row.city !== undefined || row.postal !== undefined
        ? JSON.stringify({
            ...(row.street !== undefined ? { street: row.street } : {}),
            ...(row.city !== undefined ? { city: row.city } : {}),
            ...(row.postal !== undefined ? { postal: row.postal } : {}),
            country: "RS",
          })
        : null;

    await db.execute(sql`
      UPDATE organizations SET
        website = COALESCE(website, ${row.website ?? null}),
        corporate_email = COALESCE(corporate_email, ${row.email ?? null}),
        corporate_phone = COALESCE(corporate_phone, ${row.phone ?? null}),
        hq_city = COALESCE(hq_city, ${row.city ?? null}),
        hq_country = COALESCE(hq_country, 'RS'),
        logo_url = COALESCE(logo_url, ${row.logoUrl ?? null}),
        logo_source = COALESCE(logo_source, ${row.logoUrl !== undefined ? `directory:${sourceKey}` : null}),
        registered_address = COALESCE(registered_address, ${address}::jsonb)
      WHERE entity_id = ${entityId}::uuid
    `);

    if (row.summary !== undefined) {
      await db.execute(sql`
        UPDATE entities SET summary = COALESCE(summary, ${row.summary})
        WHERE id = ${entityId}::uuid
      `);
    }
    // Foreign ownership, stated by the directory — a fact, not an inference.
    if (row.parentCountry !== undefined) {
      const ownTag = row.parentCountry === "RS" ? "ownership_domestic" : "ownership_foreign";
      await db.insert(entityTags).values({ entityId, tag: ownTag }).onConflictDoNothing();
      await db
        .insert(entityTags)
        .values({ entityId, tag: `parent_country_${row.parentCountry.toLowerCase()}` })
        .onConflictDoNothing();
    }
  }
  return stats;
}

const ADAPTERS: Record<string, () => Promise<SerbiaRow[]>> = {
  fic: harvestFic,
  amcham: harvestAmcham,
};

async function main(): Promise<void> {
  const onlyIdx = process.argv.indexOf("--only");
  const only =
    onlyIdx >= 0
      ? new Set((process.argv[onlyIdx + 1] ?? "").split(",").map((s) => s.trim()))
      : null;

  const report: string[] = [];
  for (const [key, fn] of Object.entries(ADAPTERS)) {
    if (only !== null && !only.has(key)) {
      continue;
    }
    let rows: SerbiaRow[];
    try {
      rows = await fn();
    } catch (error) {
      report.push(`✗ ${key}: fetch failed — ${String(error).slice(0, 90)}`);
      continue;
    }
    if (rows.length === 0) {
      report.push(`✗ ${key}: 0 rows parsed — site drifted, skipped`);
      continue;
    }
    const s = await importRows(key, rows);
    const pct = (n: number) => `${Math.round((n / s.rows) * 100)}%`;
    report.push(
      `✓ ${key}: ${s.rows} rows — created ${s.created}, merged ${s.merged}, ambiguous ${s.ambiguous}\n` +
        `    arriving WITH: website ${pct(s.withWebsite)} · logo ${pct(s.withLogo)} · email ${pct(s.withEmail)} · address ${pct(s.withAddress)}`,
    );
  }

  console.log("\n=== SERBIA S1 DISCOVERY ===");
  for (const line of report) {
    console.log(line);
  }
  process.exit(0);
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("serbia-discover.ts") === true;
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
