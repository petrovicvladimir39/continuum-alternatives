import "./env";
import { inArray, or } from "drizzle-orm";
import { db } from "./client";
import {
  assets,
  deals,
  edges,
  entities,
  entityTags,
  fundVehicles,
  organizations,
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

  console.log("seed: inserted 7 entities, 5 edges, 2 timeline facts (Danube NPL example deal)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
