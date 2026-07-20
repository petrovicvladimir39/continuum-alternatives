import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { memberProfiles } from "./members";

/**
 * Member private edges (Phase 32A) — the consented LinkedIn import.
 *
 * ══ PRIVACY LAW OF THIS PHASE ═══════════════════════════════════════════
 * A member's private edges are visible to and traversable by THAT MEMBER
 * ONLY. Never public, never aggregated, never shown to counterparties,
 * never an input to any other member's paths or any "people you may know"
 * feature (which does not exist and must not be built). Every query over
 * this table is scoped by member_id — structurally, not by convention.
 * One click deletes everything.
 * ════════════════════════════════════════════════════════════════════════
 *
 * There are deliberately NO email/phone columns: the LinkedIn export
 * carries an Email Address column and we DROP it at parse time — contact
 * details from uploads are never stored, so they can never leak.
 */
export const memberPrivateEdges = pgTable(
  "member_private_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    /** "First Last" as exported — display only, never resolved to person entities. */
    contactDisplay: text("contact_display").notNull(),
    contactOrgRaw: text("contact_org_raw"),
    /** Set when resolveEntity matched the company to the corpus; else null. */
    contactOrgEntityId: uuid("contact_org_entity_id").references(() => entities.id),
    positionRaw: text("position_raw"),
    connectedOn: date("connected_on"),
    source: text("source").notNull().default("linkedin_upload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("member_private_edges_member_idx").on(t.memberId)],
);
