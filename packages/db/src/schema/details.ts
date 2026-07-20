import {
  char,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entities } from "./entities";

export const organizations = pgTable("organizations", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  legalName: text("legal_name"),
  registryId: text("registry_id"),
  taxId: text("tax_id"),
  hqCity: text("hq_city"),
  foundedYear: integer("founded_year"),
  website: text("website"),
  employeeRange: text("employee_range"),
  // Universe-seeding audit trail (Phase 15): how/when this org passed or failed
  // the live homepage verification gate. Never rendered publicly.
  verificationNote: text("verification_note"),
  // Resolved external favicon URL only (Phase 16) — self-hosting fetched logo
  // binaries on R2 is BACKLOG; we never store image bytes.
  logoUrl: text("logo_url"),
  logoFetchedAt: timestamp("logo_fetched_at", { withTimezone: true }),
  // AI enrichment (Phase 17). Shape (see @continuum/pipeline enrich.ts):
  //   overview_en      published directly — labeled "From the company's website"
  //   strategy_focus   string[] rendered as neutral tags
  //   source_urls      the fetched pages grounding the overview
  //   proposed         {founded_year?, hq_address?, aum_text?, team_size_text?}
  //                    — guarded factual fields awaiting review-queue approval
  //   approved         same fields after approval (founded_year also written
  //                    to founded_year column); nothing here publishes
  //                    without a human decision
  enrichment: jsonb("enrichment"),
  enrichedAt: timestamp("enriched_at", { withTimezone: true }),
});

// Deliberately minimal — GDPR.
export const people = pgTable("people", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  displayName: text("display_name").notNull(),
  roleTitle: text("role_title"),
  linkedinUrl: text("linkedin_url"),
});

export const fundVehicles = pgTable("fund_vehicles", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  managerEntityId: uuid("manager_entity_id").references(() => entities.id),
  vintageYear: integer("vintage_year"),
  targetSize: numeric("target_size"),
  currency: char("currency", { length: 3 }),
  strategy: text("strategy"),
  status: text("status"),
});

export const dealType = pgEnum("deal_type", [
  "vc_round",
  "pe_buyout",
  "growth_equity",
  "acquisition",
  "exit",
  "npl_sale",
  "credit_facility",
  "refinancing",
  "insolvency_process",
  "restructuring",
  "fund_close",
]);

export const deals = pgTable("deals", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  dealType: dealType("deal_type").notNull(),
  announcedOn: date("announced_on"),
  amount: numeric("amount"),
  currency: char("currency", { length: 3 }),
  dealStatus: text("deal_status"),
});

export const assetType = pgEnum("asset_type", [
  "npl_portfolio",
  "property",
  "company_stake",
  "loan_book",
]);

export const assets = pgTable("assets", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  assetType: assetType("asset_type").notNull(),
  nominalValue: numeric("nominal_value"),
  currency: char("currency", { length: 3 }),
});

export const eventFormat = pgEnum("event_format", ["in_person", "online", "hybrid"]);

export const events = pgTable("events", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  eventFormat: eventFormat("event_format").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  venue: text("venue"),
  city: text("city"),
  eventUrl: text("event_url"),
});
