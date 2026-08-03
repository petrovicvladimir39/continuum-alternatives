import "./env";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { db, sql } from "@continuum/db";
import { iconNameFor, mapClassSlug } from "./map-icons";

const execFileAsync = promisify(execFile);

/**
 * LOGO-PIN MAP S4 — serve as tiles, not queries. Exports the geocoded
 * corpus to a static artifact the map reads directly; Postgres is never
 * touched at request time.
 *
 * Pipeline: best location per entity (website_hq > register_address >
 * city_centroid, highest precision wins) → GeoJSON → tippecanoe → PMTiles
 * when tippecanoe is available. On this Windows box tippecanoe/WSL/Docker
 * are all absent (probed 2026-08-03), so the committed artifact is the
 * gzip-friendly GeoJSON (~30k points ≈ 2MB over the wire) — the map's
 * cluster source consumes it directly. `pnpm tiles:build` re-cuts after
 * every harvest; run it where tippecanoe exists to emit entities.pmtiles
 * (the map upgrade to a vector-tile source is the documented cutover step,
 * clustering then moves into tippecanoe --cluster-distance).
 */

const OUT_DIR = path.join(process.cwd(), "..", "..", "apps", "web", "public", "map", "tiles");

type LocatedRow = {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  precision: string;
  confidence: string | null;
  country: string | null;
  city: string | null;
  kind: string;
  class_slug: string | null;
  has_logo: boolean;
  has_registry: boolean;
  degree: number;
};

async function main(): Promise<void> {
  const rows = (
    await db.execute(sql`
      SELECT DISTINCT ON (e.id)
        e.slug, e.name, l.lat, l.lon, l.precision,
        l.location_confidence AS confidence,
        e.country, o.hq_city AS city, e.kind::text AS kind,
        (SELECT c.asset_class FROM entity_classifications c
          WHERE c.entity_id = e.id AND c.status = 'approved'
          ORDER BY c.confidence DESC LIMIT 1) AS class_slug,
        (o.logo_url IS NOT NULL) AS has_logo,
        (o.registry_id IS NOT NULL) AS has_registry,
        COALESCE((SELECT count(*) FROM edges ed
          WHERE ed.source_entity_id = e.id OR ed.target_entity_id = e.id), 0)::int AS degree
      FROM entities e
      JOIN entity_locations l ON l.entity_id = e.id AND l.lat IS NOT NULL
      LEFT JOIN organizations o ON o.entity_id = e.id
      WHERE e.status = 'active'
      ORDER BY e.id,
        CASE l.source WHEN 'website_hq' THEN 0 WHEN 'register_address' THEN 1 ELSE 2 END,
        CASE l.precision WHEN 'rooftop' THEN 0 WHEN 'street' THEN 1 ELSE 2 END
    `)
  ).rows as LocatedRow[];

  const features = rows.map((row) => {
    const importance =
      row.degree * 50 + (row.has_logo ? 500 : 0) + (row.has_registry ? 1500 : 0);
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [row.lon, row.lat] },
      properties: {
        icon: iconNameFor({
          hasLogo: row.has_logo,
          slug: row.slug,
          classSlug: row.class_slug,
          name: row.name,
        }),
        name: row.name,
        slug: row.slug,
        cls: mapClassSlug(row.class_slug),
        country: row.country ?? "",
        tier: row.has_registry ? "register" : "monitored",
        kind: row.kind,
        city: row.city ?? "",
        aumM: null,
        sort: -importance,
        prec: row.precision,
        conf: row.confidence !== null ? Number.parseFloat(row.confidence) : null,
      },
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const geojsonPath = path.join(OUT_DIR, "entities.geojson");
  fs.writeFileSync(
    geojsonPath,
    JSON.stringify({ type: "FeatureCollection", features }),
  );
  const sizeMb = (fs.statSync(geojsonPath).size / 1024 / 1024).toFixed(1);
  console.log(`entities.geojson: ${features.length} features, ${sizeMb} MB`);

  const byPrecision = new Map<string, number>();
  for (const f of features) {
    byPrecision.set(f.properties.prec, (byPrecision.get(f.properties.prec) ?? 0) + 1);
  }
  console.log("precision split:", Object.fromEntries(byPrecision));

  // PMTiles when tippecanoe exists (Linux/macOS/CI) — probed, honest skip here.
  try {
    await execFileAsync("tippecanoe", ["--version"]);
  } catch {
    console.log("tippecanoe: not available on this machine — GeoJSON artifact only");
    console.log("(run `pnpm tiles:build` on a machine with tippecanoe to emit entities.pmtiles)");
    return;
  }
  const pmtilesPath = path.join(OUT_DIR, "entities.pmtiles");
  await execFileAsync("tippecanoe", [
    "-o", pmtilesPath, "--force",
    "-l", "entities",
    "-Z4", "-z14",
    "--cluster-distance=44", "--accumulate-attribute=count:sum",
    "--drop-densest-as-needed",
    geojsonPath,
  ]);
  console.log(`entities.pmtiles written: ${(fs.statSync(pmtilesPath).size / 1024 / 1024).toFixed(1)} MB`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
