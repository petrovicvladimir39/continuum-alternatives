import "./env";
import { and, db, entities, eq, isNotNull, isNull, organizations } from "@continuum/db";
import { resolveLogo } from "./logos";

/** Idempotent: only touches active orgs that have a website and no logo yet. */
async function main() {
  const candidates = await db
    .select({ entityId: organizations.entityId, website: organizations.website })
    .from(organizations)
    .innerJoin(entities, eq(entities.id, organizations.entityId))
    .where(
      and(
        eq(entities.status, "active"),
        isNotNull(organizations.website),
        isNull(organizations.logoUrl),
      ),
    );

  let stamped = 0;
  for (const candidate of candidates) {
    const logoUrl = resolveLogo(candidate.website);
    if (logoUrl === null) {
      continue;
    }
    await db
      .update(organizations)
      .set({ logoUrl, logoFetchedAt: new Date() })
      .where(eq(organizations.entityId, candidate.entityId));
    stamped += 1;
  }
  console.log(`logos-backfill: ${candidates.length} candidates, ${stamped} logo URLs stamped`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
