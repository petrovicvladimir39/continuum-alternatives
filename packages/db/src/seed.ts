import "./env";
import { companyNameCore, normalizeAlias } from "@continuum/shared";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "./client";
import {
  aliases,
  assets,
  deals,
  edges,
  entities,
  entityTags,
  fundVehicles,
  organizations,
  sources,
  timelineFacts,
} from "./schema";

const SLUGS = [
  "example-bank-ad",
  "project-danube-portfolio",
  "adriatic-special-situations-fund-i",
  "adriatic-capital-partners",
  "servis-one",
  "lex-partners",
  "danube-npl-sale-2025",
];

function must<T>(row: T | undefined, label: string): T {
  if (row === undefined) {
    throw new Error(`seed: missing row for ${label}`);
  }
  return row;
}

async function insertEntity(values: typeof entities.$inferInsert): Promise<string> {
  const inserted = await db.insert(entities).values(values).returning({ id: entities.id });
  return must(inserted[0], values.slug).id;
}

async function main() {
  const existing = await db
    .select({ id: entities.id })
    .from(entities)
    .where(inArray(entities.slug, SLUGS));
  const ids = existing.map((row) => row.id);

  if (ids.length > 0) {
    await db.delete(timelineFacts).where(inArray(timelineFacts.entityId, ids));
    await db
      .delete(edges)
      .where(
        or(
          inArray(edges.sourceEntityId, ids),
          inArray(edges.targetEntityId, ids),
          inArray(edges.dealEntityId, ids),
        ),
      );
    await db.delete(entityTags).where(inArray(entityTags.entityId, ids));
    await db.delete(aliases).where(inArray(aliases.entityId, ids));
    await db.delete(organizations).where(inArray(organizations.entityId, ids));
    await db.delete(assets).where(inArray(assets.entityId, ids));
    await db.delete(fundVehicles).where(inArray(fundVehicles.entityId, ids));
    await db.delete(deals).where(inArray(deals.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
    console.log(`seed: removed ${ids.length} existing entities and their references`);
  }

  const bankId = await insertEntity({
    kind: "organization",
    name: "Example Bank AD",
    slug: "example-bank-ad",
    country: "RS",
  });
  const portfolioId = await insertEntity({
    kind: "asset",
    name: "Project Danube Portfolio",
    slug: "project-danube-portfolio",
    country: "RS",
  });
  const fundId = await insertEntity({
    kind: "fund_vehicle",
    name: "Adriatic Special Situations Fund I",
    slug: "adriatic-special-situations-fund-i",
  });
  const managerId = await insertEntity({
    kind: "organization",
    name: "Adriatic Capital Partners",
    slug: "adriatic-capital-partners",
  });
  const servicerId = await insertEntity({
    kind: "organization",
    name: "Servis One d.o.o.",
    slug: "servis-one",
    country: "RS",
  });
  const lawFirmId = await insertEntity({
    kind: "organization",
    name: "Lex & Partners",
    slug: "lex-partners",
    country: "RS",
  });
  const dealId = await insertEntity({
    kind: "deal",
    name: "Danube NPL Sale 2025",
    slug: "danube-npl-sale-2025",
    country: "RS",
  });

  await db.insert(organizations).values([
    { entityId: bankId, legalName: "Example Bank AD" },
    { entityId: managerId, legalName: "Adriatic Capital Partners" },
    { entityId: servicerId, legalName: "Servis One d.o.o." },
    { entityId: lawFirmId, legalName: "Lex & Partners" },
  ]);
  await db.insert(assets).values({
    entityId: portfolioId,
    assetType: "npl_portfolio",
    nominalValue: "120000000",
    currency: "EUR",
  });
  await db.insert(fundVehicles).values({
    entityId: fundId,
    managerEntityId: managerId,
    strategy: "special_situations",
  });
  await db.insert(deals).values({
    entityId: dealId,
    dealType: "npl_sale",
    announcedOn: "2025-06-15",
    amount: "48000000",
    currency: "EUR",
  });

  await db.insert(entityTags).values([
    { entityId: bankId, tag: "bank" },
    { entityId: managerId, tag: "gp_distressed" },
    { entityId: servicerId, tag: "servicer" },
    { entityId: lawFirmId, tag: "law_firm" },
  ]);

  await db.insert(edges).values([
    {
      edgeType: "sold_portfolio_to",
      sourceEntityId: bankId,
      targetEntityId: managerId,
      dealEntityId: dealId,
      confidence: "1.00",
      status: "approved",
    },
    {
      edgeType: "invested_in",
      sourceEntityId: fundId,
      targetEntityId: portfolioId,
      dealEntityId: dealId,
      confidence: "1.00",
      status: "approved",
    },
    {
      edgeType: "manages",
      sourceEntityId: managerId,
      targetEntityId: fundId,
      confidence: "1.00",
      status: "approved",
    },
    {
      edgeType: "serviced_by",
      sourceEntityId: portfolioId,
      targetEntityId: servicerId,
      confidence: "1.00",
      status: "approved",
    },
    {
      edgeType: "advised_on",
      sourceEntityId: lawFirmId,
      targetEntityId: bankId,
      dealEntityId: dealId,
      role: "sell-side legal",
      confidence: "1.00",
      status: "approved",
    },
  ]);

  await db.insert(timelineFacts).values([
    {
      entityId: dealId,
      factType: "deal_announced",
      occurredOn: "2025-06-15",
      title: "Example Bank AD announces sale of Project Danube NPL portfolio",
      body: "€120m nominal NPL portfolio sold to Adriatic Capital Partners for €48m.",
      audienceChannels: ["distressed", "private_credit"],
      confidence: "1.00",
      status: "approved",
    },
    {
      entityId: portfolioId,
      factType: "servicing_mandate_awarded",
      occurredOn: "2025-07-01",
      title: "Servicing mandate for Project Danube Portfolio awarded to Servis One d.o.o.",
      audienceChannels: ["distressed"],
      confidence: "1.00",
      status: "approved",
    },
  ]);

  const seededEntities = await db
    .select({ id: entities.id, name: entities.name })
    .from(entities)
    .where(inArray(entities.slug, SLUGS));
  for (const entity of seededEntities) {
    const normalized = normalizeAlias(entity.name);
    const core = companyNameCore(entity.name);
    await db.insert(aliases).values({
      entityId: entity.id,
      alias: entity.name,
      aliasNormalized: normalized,
    });
    if (core !== normalized) {
      await db.insert(aliases).values({
        entityId: entity.id,
        alias: entity.name,
        aliasNormalized: core,
      });
    }
  }

  console.log("seed: inserted 7 entities, 5 edges, 2 timeline facts (Danube NPL example deal)");

  // Starter source set. RSS urls were probed live at seed-authoring time; sites
  // without a resolvable feed use firecrawl_index. Only eKapija and SeeNews start
  // active — the operator activates the rest in admin.
  const seedSources: (typeof sources.$inferInsert)[] = [
    {
      name: "Continuum Alternatives (canary)",
      url: "https://continuumalternatives.com",
      sourceType: "company_site",
      fetchMethod: "http_simple",
      schedule: "weekly",
      active: true,
    },
    {
      name: "eKapija",
      url: "https://www.ekapija.com/",
      country: "RS",
      sourceType: "press",
      fetchMethod: "firecrawl_index",
      schedule: "daily",
      active: true,
      config: { linkIncludePattern: "/news/\\d+", language: "sr", maxItemsPerRun: 10 },
    },
    {
      name: "SeeNews (regional press)",
      url: "https://seenews.com/news",
      country: "BG",
      sourceType: "press",
      fetchMethod: "firecrawl_index",
      schedule: "daily",
      active: true,
      config: {
        linkIncludePattern: "seenews\\.com/news/",
        language: "en",
        articleFetch: "firecrawl",
        maxItemsPerRun: 10,
      },
    },
    {
      name: "ALSU — Стечајни предмети",
      url: "https://alsu.gov.rs/ci/stecajni-postupak/stecajevi/",
      country: "RS",
      sourceType: "registry",
      fetchMethod: "registry_custom",
      schedule: "daily",
      active: true,
      config: {
        handler: "alsu-stecajevi",
        dedupKey: "caseRef",
        language: "sr",
        maxItemsPerRun: 10,
      },
    },
    {
      name: "ALSU — Огласи продаје имовине",
      url: "https://alsu.gov.rs/ci/stecajni-postupak/oglasi-prodaje/",
      country: "RS",
      sourceType: "registry",
      fetchMethod: "registry_custom",
      schedule: "daily",
      active: true,
      config: { handler: "alsu-prodaje", language: "sr", maxItemsPerRun: 10 },
    },
    {
      name: "Biznis.rs",
      url: "https://biznis.rs/feed/",
      country: "RS",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "sr" },
    },
    {
      name: "Nova Ekonomija",
      url: "https://novaekonomija.rs/feed",
      country: "RS",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "sr" },
    },
    {
      name: "Poslovni dnevnik",
      url: "https://www.poslovni.hr/feed",
      country: "HR",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "hr" },
    },
    {
      name: "Lider (verify url)",
      url: "https://lider.media",
      country: "HR",
      sourceType: "press",
      fetchMethod: "firecrawl_index",
      schedule: "daily",
      active: false,
      config: { language: "hr" },
    },
    {
      name: "Ziarul Financiar",
      url: "https://www.zf.ro/rss",
      country: "RO",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "ro" },
    },
    {
      name: "Profit.ro",
      url: "https://www.profit.ro/rss",
      country: "RO",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "ro" },
    },
    {
      name: "Capital.bg",
      url: "https://www.capital.bg/rss/",
      country: "BG",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "bg" },
    },
    {
      name: "IntelliNews",
      url: "https://www.intellinews.com/feed",
      sourceType: "press",
      fetchMethod: "rss",
      schedule: "daily",
      active: false,
      config: { language: "en" },
    },
  ];
  for (const source of seedSources) {
    const byUrl = source.url
      ? await db.select({ id: sources.id }).from(sources).where(eq(sources.url, source.url))
      : [];
    const byName =
      byUrl.length > 0
        ? []
        : await db.select({ id: sources.id }).from(sources).where(eq(sources.name, source.name));
    const existingId = byUrl[0]?.id ?? byName[0]?.id;
    if (existingId !== undefined) {
      await db.update(sources).set(source).where(eq(sources.id, existingId));
    } else {
      await db.insert(sources).values(source);
    }
  }
  console.log(`seed: ensured ${seedSources.length} ingestion sources (eKapija + SeeNews active)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
