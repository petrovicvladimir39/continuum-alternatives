import "./env";
import { db, sql } from "@continuum/db";
import { USER_AGENT } from "./crawl-shared";

/**
 * LOGO-PIN MAP S1 — pull registered addresses from the GLEIF API for every
 * org whose registry_id is a bare 20-char LEI (the GLEIF sweep stored the
 * LEI but only kept the city). $0: api.gleif.org is free, no key. Batched
 * filter[lei]=… lookups, 1s politeness, resumable — an org with an existing
 * register_address row is never re-fetched. Address preference:
 * headquartersAddress over legalAddress (closer to a real office; both are
 * register-sourced). Coordinates stay NULL here — locations:geocode fills
 * them; raw_address is stored verbatim for auditability.
 */

const GLEIF_API = "https://api.gleif.org/api/v1/lei-records";
const BATCH = 100;
const POLITENESS_MS = 1_000;
const TIMEOUT_MS = 30_000;

type GleifAddress = {
  addressLines?: string[];
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
};

type GleifRecord = {
  attributes?: {
    lei?: string;
    entity?: {
      legalAddress?: GleifAddress;
      headquartersAddress?: GleifAddress;
    };
  };
};

function formatAddress(addr: GleifAddress): string | null {
  const lines = (addr.addressLines ?? []).map((l) => l.trim()).filter((l) => l.length > 0);
  const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(" ").trim();
  const parts = [...lines, cityLine, addr.country].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length >= 2 ? parts.join(", ") : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? Number.parseInt(process.argv[limitArg + 1] ?? "", 10) : 25_000;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit must be a positive integer");
  }

  const pending = (
    await db.execute(sql`
      SELECT o.entity_id AS entity_id, o.registry_id AS lei
      FROM organizations o
      JOIN entities e ON e.id = o.entity_id
      WHERE o.registry_id ~ '^[0-9A-Z]{20}$'
        AND e.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM entity_locations l
          WHERE l.entity_id = o.entity_id AND l.source = 'register_address'
        )
      ORDER BY o.registry_id
      LIMIT ${limit}
    `)
  ).rows as { entity_id: string; lei: string }[];

  console.log(`pending LEI address fetches: ${pending.length}`);
  const byLei = new Map(pending.map((p) => [p.lei, p.entity_id]));
  let fetched = 0;
  let stored = 0;
  let noAddress = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const url = new URL(GLEIF_API);
    url.searchParams.set("filter[lei]", batch.map((b) => b.lei).join(","));
    url.searchParams.set("page[size]", String(BATCH));
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "application/vnd.api+json" },
    });
    if (!response.ok) {
      throw new Error(`GLEIF HTTP ${response.status} at offset ${i} — rerun to resume`);
    }
    const payload = (await response.json()) as { data?: GleifRecord[] };
    for (const record of payload.data ?? []) {
      const lei = record.attributes?.lei;
      const entityId = lei !== undefined ? byLei.get(lei) : undefined;
      if (entityId === undefined) {
        continue;
      }
      fetched += 1;
      const entity = record.attributes?.entity;
      const addr = entity?.headquartersAddress ?? entity?.legalAddress;
      const raw = addr !== undefined ? formatAddress(addr) : null;
      if (raw === null) {
        noAddress += 1;
        continue;
      }
      await db.execute(sql`
        INSERT INTO entity_locations (entity_id, source, raw_address)
        VALUES (${entityId}, 'register_address', ${raw})
        ON CONFLICT (entity_id, source) DO NOTHING
      `);
      stored += 1;
    }
    process.stdout.write(`\r${Math.min(i + BATCH, pending.length)}/${pending.length} LEIs`);
    await sleep(POLITENESS_MS);
  }
  console.log(`\nfetched ${fetched} records, stored ${stored} addresses, ${noAddress} without a usable address`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
