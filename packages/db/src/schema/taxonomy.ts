import { char, index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { entities } from "./entities";

/**
 * Tag taxonomy (the only valid values for entity_tags.tag):
 *
 *   GPs:        gp_vc, gp_pe, gp_credit, gp_distressed
 *   LPs:        lp_pension, lp_insurance, lp_dfi, lp_family_office, lp_fof
 *   Lenders:    bank, non_bank_lender
 *   Servicing:  servicer, collection_agency
 *   Advisors:   advisor_ma, placement_agent, law_firm, insolvency_practitioner,
 *               accounting, valuer, fund_admin, dd_provider, restructuring_advisor,
 *               data_provider, pr_ir, exec_search
 *   Public:     regulator, ministry, agency_investment_promotion, state_amc,
 *               registry_body, court, stock_exchange
 *   Ecosystem:  incubator, accelerator, university, association, media
 *   Companies:  startup, scaleup, sme, corporate, spv
 */
export const entityTags = pgTable(
  "entity_tags",
  {
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.tag] })],
);

export const aliases = pgTable(
  "aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").references(() => entities.id),
    alias: text("alias").notNull(),
    aliasNormalized: text("alias_normalized").notNull(),
    lang: char("lang", { length: 2 }),
  },
  (t) => [index("aliases_alias_normalized_idx").on(t.aliasNormalized)],
);
