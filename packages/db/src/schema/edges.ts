import {
  char,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { documents } from "./sources";

/**
 * Edge direction semantics — read every row as SOURCE -[edge_type]-> TARGET:
 *
 *   invested_in            investor (fund/org/person) -> company, asset, or portfolio invested into
 *   lp_in                  LP (org/person) -> fund_vehicle committed to
 *   manages                management company (GP) -> fund_vehicle or asset it manages
 *   acquired               buyer -> target company/asset acquired
 *   advised_on             advisor -> client advised (deal_entity_id = the deal; role = mandate, e.g. "sell-side legal")
 *   lent_to                lender -> borrower
 *   pledged_collateral_for pledgor -> lender/facility benefiting from the collateral
 *   serviced_by            portfolio/asset -> servicer operating it
 *   sold_portfolio_to      seller (e.g. bank) -> buyer of the portfolio (deal_entity_id = the sale)
 *   founded                founder (person/org) -> organization founded
 *   employed_by            person -> employer organization
 *   board_member_of        person -> organization whose board they sit on
 *   co_invested_with       co-investor -> co-investor (symmetric; store one direction only)
 *   regulated_by           regulated entity -> regulator
 *   litigated_against      claimant -> defendant
 *   sponsored              sponsor -> event/organization sponsored
 *   attended               person/org -> event attended
 */
export const edgeType = pgEnum("edge_type", [
  "invested_in",
  "lp_in",
  "manages",
  "acquired",
  "advised_on",
  "lent_to",
  "pledged_collateral_for",
  "serviced_by",
  "sold_portfolio_to",
  "founded",
  "employed_by",
  "board_member_of",
  "co_invested_with",
  "regulated_by",
  "litigated_against",
  "sponsored",
  "attended",
]);

export const reviewStatus = pgEnum("review_status", ["proposed", "approved", "rejected"]);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    edgeType: edgeType("edge_type").notNull(),
    sourceEntityId: uuid("source_entity_id")
      .notNull()
      .references(() => entities.id),
    targetEntityId: uuid("target_entity_id")
      .notNull()
      .references(() => entities.id),
    dealEntityId: uuid("deal_entity_id").references(() => entities.id),
    role: text("role"),
    startedOn: date("started_on"),
    endedOn: date("ended_on"),
    amount: numeric("amount"),
    currency: char("currency", { length: 3 }),
    sourceDocumentId: uuid("source_document_id").references(() => documents.id),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("1.00"),
    status: reviewStatus("status").notNull().default("approved"),
    verifiedBy: text("verified_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("edges_source_entity_id_idx").on(t.sourceEntityId),
    index("edges_target_entity_id_idx").on(t.targetEntityId),
    index("edges_edge_type_idx").on(t.edgeType),
    index("edges_deal_entity_id_idx").on(t.dealEntityId),
  ],
);
