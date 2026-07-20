import "./env";
import { companyNameCore } from "@continuum/shared";
import { and, db, entities, eq, isNull, or, organizations } from "@continuum/db";

/**
 * Companies House (GB) enrichment anchor (reset build Part 3) — $0, no LLM.
 *
 *   pnpm ch:enrich [-- --limit 100]
 *
 * Pulls official company status / incorporation date / registered office
 * onto EXISTING GB organization details. NO mass ingestion — this only
 * decorates organizations already in the corpus. One search request per
 * organization (the CH search payload carries everything we store), and a
 * result is accepted ONLY when its normalized name-core matches ours —
 * no fuzzy adoption of a wrong company.
 *
 * Operator step: CH_API_KEY (free key, developer.company-information.service.gov.uk).
 * Without it the command explains itself and exits cleanly.
 */

const CH_SEARCH = "https://api.company-information.service.gov.uk/search/companies";
const POLITENESS_MS = 600; // CH allows 600 req / 5 min — stay well under

type ChSearchItem = {
  title?: string;
  company_number?: string;
  company_status?: string;
  date_of_creation?: string;
  address?: { locality?: string | null } | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const apiKey = process.env.CH_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    console.log(
      "ch:enrich — CH_API_KEY is not set, so nothing was fetched or written.\n" +
        "Get a free key at developer.company-information.service.gov.uk (register an\n" +
        "application, REST key), put it in .env as CH_API_KEY, and re-run. This step\n" +
        "is optional; the platform works without it.",
    );
    process.exit(0);
  }

  const argv = process.argv.slice(2);
  let limit = 100;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i]!, 10);
    }
  }

  // GB organizations still missing any of the CH-anchored fields.
  const rows = await db
    .select({
      entityId: entities.id,
      name: entities.name,
      slug: entities.slug,
      foundedYear: organizations.foundedYear,
      hqCity: organizations.hqCity,
      registryId: organizations.registryId,
      verificationNote: organizations.verificationNote,
    })
    .from(entities)
    .innerJoin(organizations, eq(organizations.entityId, entities.id))
    .where(
      and(
        eq(entities.kind, "organization"),
        eq(entities.country, "GB"),
        eq(entities.status, "active"),
        or(isNull(organizations.foundedYear), isNull(organizations.hqCity)),
      ),
    )
    .limit(limit);

  console.log(`ch:enrich — ${rows.length} GB organizations to check (limit ${limit})`);
  const auth = `Basic ${Buffer.from(`${apiKey.trim()}:`).toString("base64")}`;
  let enriched = 0;
  let noMatch = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const url = `${CH_SEARCH}?q=${encodeURIComponent(row.name)}&items_per_page=5`;
      const response = await fetch(url, { headers: { authorization: auth } });
      if (response.status === 429) {
        console.log("rate limited — waiting 60s");
        await sleep(60_000);
        continue;
      }
      if (!response.ok) {
        errors += 1;
        console.log(`  ${row.slug}: HTTP ${response.status}`);
        await sleep(POLITENESS_MS);
        continue;
      }
      const payload = (await response.json()) as { items?: ChSearchItem[] };
      const ourCore = companyNameCore(row.name);
      const hit = (payload.items ?? []).find(
        (item) => item.title !== undefined && companyNameCore(item.title) === ourCore,
      );
      if (hit === undefined || hit.company_number === undefined) {
        noMatch += 1;
        await sleep(POLITENESS_MS);
        continue;
      }

      const patch: Partial<typeof organizations.$inferInsert> = {};
      if (row.foundedYear === null && hit.date_of_creation !== undefined) {
        const year = Number.parseInt(hit.date_of_creation.slice(0, 4), 10);
        if (Number.isFinite(year)) {
          patch.foundedYear = year;
        }
      }
      if (row.hqCity === null && hit.address?.locality) {
        patch.hqCity = hit.address.locality;
      }
      if (row.registryId === null) {
        patch.registryId = `CH:${hit.company_number}`;
      }
      const chNote = `Companies House ${hit.company_number} · status ${hit.company_status ?? "?"} · incorporated ${hit.date_of_creation ?? "?"}`;
      patch.verificationNote = row.verificationNote
        ? `${row.verificationNote} | ${chNote}`
        : chNote;
      await db.update(organizations).set(patch).where(eq(organizations.entityId, row.entityId));
      enriched += 1;
      console.log(`  ${row.slug}: ${chNote}`);
    } catch (error) {
      errors += 1;
      console.log(`  ${row.slug}: ${String(error)}`);
    }
    await sleep(POLITENESS_MS);
  }

  console.log(`ch:enrich done — enriched ${enriched}, no exact match ${noMatch}, errors ${errors}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
