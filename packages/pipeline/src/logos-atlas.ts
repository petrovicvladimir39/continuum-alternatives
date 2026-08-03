import "./env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db, sql } from "@continuum/db";
import { MOCK_ENTITIES, twoLetterMonogram } from "@continuum/shared";
import { USER_AGENT } from "./crawl-shared";

/**
 * LOGO-PIN MAP S2 — sprite atlases for the MapLibre symbol layer.
 *
 * Icon plan (this is what keeps 30k pins to a handful of requests):
 * - Entities WITH a resolved logo_url → fetched, normalized to a 64px PNG
 *   on transparent ground → icon "logo-{slug}".
 * - Everyone else → a monogram tile in the entity's taxonomy-class accent,
 *   DEDUPED by (class, two-letter monogram): thousands of entities collapse
 *   into a few hundred distinct tiles → icon "mono-{class}-{MG}". Never a
 *   blank pin.
 * - Sheets are 1024×1024 (256 icons), ordered by importance (edge degree +
 *   verification tier) so sheet 0 carries the majors that appear first as
 *   you zoom; the style lists all sheets via the MapLibre multi-sprite array.
 *
 * Output: apps/web/public/map/sprites/{real|mock}-{n}.png/.json + manifest.
 * Blob-storage (Vercel Blob/R2) hosting is the cutover step — no store
 * credentials exist in this environment, so public/ is the honest interim.
 */

const OUT_DIR = path.join(process.cwd(), "..", "..", "apps", "web", "public", "map", "sprites");
const TILE = 64;
const SHEET_COLS = 16;
const SHEET_ICONS = SHEET_COLS * SHEET_COLS;
const FETCH_TIMEOUT_MS = 10_000;
const FETCH_DELAY_MS = 250;

/** v2 class accents (dark-ground values) + neutral, for monogram tiles. */
const CLASS_HEX: Record<string, string> = {
  "private-equity": "#47b598",
  "private-credit": "#c69a3d",
  "real-assets": "#a3a441",
  "hedge-funds": "#9a7bc0",
  structured: "#4da4a8",
  esoteric: "#b06aa4",
  collectibles: "#c0708f",
  climate: "#5aa878",
  digital: "#8486c9",
  neutral: "#6e6a62",
};

type IconJob = {
  name: string;
  kind: "logo" | "mono";
  logoUrl?: string;
  monogram?: string;
  classSlug?: string;
  rank: number;
};

type SpriteIndex = Record<
  string,
  { x: number; y: number; width: number; height: number; pixelRatio: number }
>;

function monoTileSvg(monogram: string, hex: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" fill="${hex}" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle"
    font-family="Instrument Sans, Arial, sans-serif" font-size="26" font-weight="600"
    fill="#ffffff">${monogram}</text>
</svg>`;
}

async function normalizeLogo(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      return null;
    }
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length === 0) {
      return null;
    }
    // Logo sits on a white tile inside a 1px hairline frame (the pin look):
    // favicons are often transparent and unreadable straight on the basemap.
    const inner = await sharp(input, { animated: false })
      .resize(TILE - 8, TILE - 8, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
      <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" fill="#ffffff" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    </svg>`;
    return await sharp(Buffer.from(frame))
      .composite([{ input: inner, left: 4, top: 4 }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

async function collectRealJobs(): Promise<IconJob[]> {
  const rows = (
    await db.execute(sql`
      SELECT e.slug, e.name, o.logo_url,
        COALESCE((
          SELECT c.asset_class FROM entity_classifications c
          WHERE c.entity_id = e.id AND c.status = 'approved'
          ORDER BY c.confidence DESC LIMIT 1
        ), 'neutral') AS class_slug,
        COALESCE((SELECT count(*) FROM edges ed
          WHERE ed.source_entity_id = e.id OR ed.target_entity_id = e.id), 0)::int AS degree
      FROM entities e
      JOIN entity_locations l ON l.entity_id = e.id AND l.lat IS NOT NULL
      LEFT JOIN organizations o ON o.entity_id = e.id
      WHERE e.status = 'active'
      GROUP BY e.slug, e.name, o.logo_url, e.id
    `)
  ).rows as { slug: string; name: string; logo_url: string | null; class_slug: string; degree: number }[];

  const jobs = new Map<string, IconJob>();
  for (const row of rows) {
    const classSlug = CLASS_HEX[row.class_slug] !== undefined ? row.class_slug : "neutral";
    const rank = row.degree + (row.logo_url !== null ? 5 : 0);
    if (row.logo_url !== null) {
      jobs.set(`logo-${row.slug}`, {
        name: `logo-${row.slug}`,
        kind: "logo",
        logoUrl: row.logo_url,
        classSlug,
        monogram: twoLetterMonogram(row.name),
        rank,
      });
    } else {
      const monogram = twoLetterMonogram(row.name);
      const name = `mono-${classSlug}-${monogram}`;
      const existing = jobs.get(name);
      if (existing === undefined || existing.rank < rank) {
        jobs.set(name, { name, kind: "mono", monogram, classSlug, rank });
      }
    }
  }
  return [...jobs.values()];
}

function collectMockJobs(): IconJob[] {
  const jobs = new Map<string, IconJob>();
  for (const entity of MOCK_ENTITIES) {
    const monogram = twoLetterMonogram(entity.name);
    const classSlug = CLASS_HEX[entity.assetClass] !== undefined ? entity.assetClass : "neutral";
    const name = `mono-${classSlug}-${monogram}`;
    const rank = entity.aumM ?? 0;
    const existing = jobs.get(name);
    if (existing === undefined || existing.rank < rank) {
      jobs.set(name, { name, kind: "mono", monogram, classSlug, rank });
    }
  }
  return [...jobs.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const mock = process.argv.includes("--mock");
  const prefix = mock ? "mock" : "real";
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const jobs = mock ? collectMockJobs() : await collectRealJobs();
  jobs.sort((a, b) => b.rank - a.rank);
  console.log(`${prefix}: ${jobs.length} distinct icons (${jobs.filter((j) => j.kind === "logo").length} logos)`);

  let logoOk = 0;
  let logoFailed = 0;
  const rendered: { name: string; png: Buffer }[] = [];
  for (const job of jobs) {
    if (job.kind === "logo" && job.logoUrl !== undefined) {
      const png = await normalizeLogo(job.logoUrl);
      await sleep(FETCH_DELAY_MS);
      if (png !== null) {
        logoOk += 1;
        rendered.push({ name: job.name, png });
        continue;
      }
      logoFailed += 1; // fall through to monogram — never a blank pin
    }
    const hex = CLASS_HEX[job.classSlug ?? "neutral"] ?? CLASS_HEX.neutral!;
    const png = await sharp(Buffer.from(monoTileSvg(job.monogram ?? "•", hex))).png().toBuffer();
    rendered.push({ name: job.name, png });
    if (rendered.length % 200 === 0) {
      process.stdout.write(`\r${rendered.length}/${jobs.length} icons rendered`);
    }
  }

  // Pack into 1024×1024 sheets, importance-ordered.
  const sheets: { file: string; jsonFile: string; count: number }[] = [];
  for (let s = 0; s * SHEET_ICONS < rendered.length; s += 1) {
    const slice = rendered.slice(s * SHEET_ICONS, (s + 1) * SHEET_ICONS);
    const size = SHEET_COLS * TILE;
    const composites = slice.map((icon, i) => ({
      input: icon.png,
      left: (i % SHEET_COLS) * TILE,
      top: Math.floor(i / SHEET_COLS) * TILE,
    }));
    const index: SpriteIndex = {};
    slice.forEach((icon, i) => {
      index[icon.name] = {
        x: (i % SHEET_COLS) * TILE,
        y: Math.floor(i / SHEET_COLS) * TILE,
        width: TILE,
        height: TILE,
        pixelRatio: 1,
      };
    });
    const base = `${prefix}-${s}`;
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite(composites)
      .png()
      .toFile(path.join(OUT_DIR, `${base}.png`));
    fs.writeFileSync(path.join(OUT_DIR, `${base}.json`), JSON.stringify(index));
    sheets.push({ file: `${base}.png`, jsonFile: `${base}.json`, count: slice.length });
  }

  const manifest = {
    prefix,
    generatedAt: new Date().toISOString(),
    icons: rendered.length,
    logos: logoOk,
    logoFailures: logoFailed,
    sheets: sheets.map((s, i) => ({ id: `${prefix}-${i}`, ...s })),
  };
  fs.writeFileSync(path.join(OUT_DIR, `${prefix}-manifest.json`), JSON.stringify(manifest, null, 2));

  console.log(`\nlogos fetched ok: ${logoOk}, failed→monogram: ${logoFailed}`);
  console.log(`sheets: ${sheets.length} × 1024px (${rendered.length} icons)`);
  console.log(`out: ${OUT_DIR}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
