import {
  boolean,
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
  // Phase 33A — the steward's own-voice statement ("From {Org}"), sanitized
  // ≤600 chars, always rendered LABELED as the org's own words. The one
  // thing a steward may write directly; record data stays review-gated.
  stewardStatement: text("steward_statement"),

  // ── EUROPE DEPTH RUN schema upgrade — 25+ deterministic data points ──
  // House law: deterministic-fill ONLY; NULL when the source does not state
  // it. Never guessed, never estimated. Provenance rides on sources +
  // timeline_facts; these are the entity's registry-grade attributes.
  //
  // EXPLICITLY EXCLUDED (constitution §5): estimated dry powder / target IRR
  // (estimation is banned) · person LinkedIn URLs (consent doctrine — no
  // individual-data harvesting) · UBO fields (EU public UBO access restricted
  // since the 2022 CJEU ruling — legitimate-interest gated; a future
  // legal-gated decision, not a column).

  // A. IDENTITY (beyond legal_name/registry_id/tax_id/founded_year above)
  commercialName: text("commercial_name"),
  leiCode: char("lei_code", { length: 20 }),
  legalFormNative: text("legal_form_native"), // GmbH, S.A., d.o.o., Sp. z o.o., SICAV…
  legalFormStandardized: text("legal_form_standardized"), // corp|partnership|fund_vehicle|spv|branch|other
  incorporationDate: date("incorporation_date"),
  legalStatus: text("legal_status"), // active|liquidation|restructuring|dissolved

  // B. REGULATORY & CONTACT
  regulatoryStatus: text("regulatory_status"), // regulated|unregulated|exempt
  primaryRegulator: text("primary_regulator"),
  regulatoryLicenseNumber: text("regulatory_license_number"),
  registeredAddress: jsonb("registered_address"), // {street, city, postal, country}
  hqCountry: char("hq_country", { length: 2 }),
  corporateEmail: text("corporate_email"),
  corporatePhone: text("corporate_phone"),

  // C. TAXONOMY ROLES (classifications live in entity_classifications)
  primaryRole: text("primary_role"), // GP|LP|ManCo|Fund Vehicle|SPV|Servicer|Advisor|Vendor|Portfolio Co|Regulator
  secondaryRoles: jsonb("secondary_roles"), // string[]
  targetGeoScope: jsonb("target_geo_scope"), // string[] — ISO2 codes / region slugs

  // D. FINANCIAL — ONLY when publicly stated. share_capital is
  // {amount, currency, amount_eur, rate_date}: original amount + currency
  // ALWAYS stored beside the deterministic ECB-converted EUR value (ecb_rates).
  // LLMs never do currency math (house law).
  shareCapital: jsonb("share_capital"),
  aumEur: numeric("aum_eur"),
  capitalRaisedEur: numeric("capital_raised_eur"),
  reportingDate: date("reporting_date"),

  // Category-specific PUBLIC fields, keyed per Level-1 class (documented in
  // europe-taxonomy.ts): PE {fund_vintage, fund_size, stage_focus,
  // portfolio_company_count} · Debt {portfolio_gbv, servicer_licence,
  // loan_book_size} · Real Assets {asset_type, sqm_or_gla, project_count,
  // energy_capacity_mw} · Liquid {strategy, domicile, ucits_or_aif,
  // prime_broker} · Niche {case_or_catalog_count, registry_standard,
  // token_standard} · Service {services_offered, accreditation, licences}.
  categoryFields: jsonb("category_fields"),

  // F. MEDIA
  logoSource: text("logo_source"), // favicon|og_image|monogram|operator
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
  // Phase 26A: strategy holds TAXONOMY slugs (alt-taxonomy.ts); the
  // pre-taxonomy free text was preserved verbatim in strategy_raw by the
  // migration (unmappable values keep strategy NULL + raw).
  strategy: text("strategy"),
  strategyRaw: text("strategy_raw"),
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
  // Phase 31A: recurring-annual events whose next edition's dates are the
  // EXPECTED pattern rather than a published confirmation render with an
  // explicit "expected" marker — the calendar never states a guess as fact.
  expected: boolean("expected").notNull().default(false),
});
