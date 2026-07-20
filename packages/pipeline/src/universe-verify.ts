import "./env";
import {
  and,
  db,
  entities,
  entityTags,
  eq,
  isNotNull,
  organizations,
} from "@continuum/db";
import { companyNameCore, normalizeAlias } from "@continuum/shared";
import { stripHtml, USER_AGENT } from "./crawl-shared";

/**
 * Universe verification pass (Phase 15 U-C) — THE activation gate. For every
 * provisional org tagged needs_verification that has a website, fetch the
 * homepage live and activate ONLY on evidence:
 *   PASS  ≥60% of companyNameCore(name) tokens appear in the page text
 *         (title/meta/body, normalized + transliterated), OR the domain
 *         contains a core name token (≥3 chars).
 * PASS → status='active', drop needs_verification, note on organizations.
 * FAIL → stays provisional (never public), note recorded for review.
 */

const TIMEOUT_MS = 15_000;
const POLITENESS_MS = 1_000;
const PAGE_CAP = 500_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type VerifyOutcome = {
  pass: boolean;
  method: "tokens" | "domain" | "none";
  detail: string;
};

/** Pure decision, exported for tests: does this page/domain evidence the name? */
export function verdictFor(name: string, website: string, html: string | null): VerifyOutcome {
  const core = companyNameCore(name);
  const tokens = core.split(" ").filter((token) => token.length > 1);

  let host = "";
  try {
    host = new URL(website).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    host = "";
  }
  const hostCompact = host.replace(/[^a-z0-9]/g, "");
  const domainToken = tokens.find((token) => token.length >= 3 && hostCompact.includes(token));

  if (html !== null) {
    const page = normalizeAlias(stripHtml(html.slice(0, PAGE_CAP)));
    const present = tokens.filter((token) => page.includes(token));
    if (tokens.length > 0 && present.length / tokens.length >= 0.6) {
      return {
        pass: true,
        method: "tokens",
        detail: `${present.length}/${tokens.length} name tokens on homepage`,
      };
    }
    if (domainToken !== undefined) {
      return { pass: true, method: "domain", detail: `domain contains "${domainToken}"` };
    }
    return {
      pass: false,
      method: "none",
      detail: `${present.length}/${tokens.length} tokens, no domain token`,
    };
  }
  if (domainToken !== undefined) {
    // Page unreachable but the domain itself carries the name — not enough
    // on its own; unreachable sites stay provisional.
    return { pass: false, method: "none", detail: `fetch failed (domain has "${domainToken}")` };
  }
  return { pass: false, method: "none", detail: "fetch failed" };
}

async function fetchHomepage(url: string): Promise<{ html: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      return { html: null, error: `HTTP ${response.status}` };
    }
    return { html: await response.text() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { html: null, error: message.slice(0, 120) };
  }
}

async function main() {
  const candidates = await db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      country: entities.country,
      website: organizations.website,
    })
    .from(entities)
    .innerJoin(organizations, eq(organizations.entityId, entities.id))
    .innerJoin(
      entityTags,
      and(eq(entityTags.entityId, entities.id), eq(entityTags.tag, "needs_verification")),
    )
    .where(and(eq(entities.status, "provisional"), isNotNull(organizations.website)))
    .orderBy(entities.name);

  console.log(`universe-verify: ${candidates.length} provisional orgs to check\n`);
  const today = new Date().toISOString().slice(0, 10);
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const [i, candidate] of candidates.entries()) {
    if (i > 0) {
      await sleep(POLITENESS_MS);
    }
    const website = candidate.website as string;
    const { html, error } = await fetchHomepage(website);
    const verdict = verdictFor(candidate.name, website, html);
    const noteDetail = error !== undefined ? `${verdict.detail}; ${error}` : verdict.detail;

    if (verdict.pass) {
      await db.update(entities).set({ status: "active" }).where(eq(entities.id, candidate.id));
      await db
        .delete(entityTags)
        .where(
          and(eq(entityTags.entityId, candidate.id), eq(entityTags.tag, "needs_verification")),
        );
      await db
        .update(organizations)
        .set({ verificationNote: `universe-verify PASS ${today}: ${noteDetail}` })
        .where(eq(organizations.entityId, candidate.id));
      passed += 1;
      console.log(`PASS  ${candidate.name} (${verdict.method}: ${verdict.detail})`);
    } else {
      await db
        .update(organizations)
        .set({ verificationNote: `universe-verify FAIL ${today}: ${noteDetail}` })
        .where(eq(organizations.entityId, candidate.id));
      failed += 1;
      failures.push(`${candidate.name} [${candidate.country ?? "??"}] ${website} — ${noteDetail}`);
      console.log(`FAIL  ${candidate.name} (${noteDetail})`);
    }
  }

  if (failures.length > 0) {
    console.log("\nstill provisional (never public until verified):");
    for (const line of failures) {
      console.log(`  ${line}`);
    }
  }
  console.log(
    `\nuniverse-verify: ${candidates.length} checked — ${passed} activated, ${failed} left provisional`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
