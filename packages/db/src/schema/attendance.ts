import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { memberProfiles } from "./members";

/**
 * Event attendance + contact (Phase 31C) — consent-first, first-party ONLY.
 * Attendance rows are created by the member themselves; there is no scraped
 * attendee data anywhere in this system and never will be.
 *
 * `visible` defaults FALSE and only the member flips it: appearing on a
 * public-to-members attendee list is OPT-IN, hard. Aggregate counts render
 * regardless (they identify nobody); names render only for visible rows.
 */
export const eventAttendance = pgTable(
  "event_attendance",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    eventEntityId: uuid("event_entity_id")
      .notNull()
      .references(() => entities.id),
    status: text("status").notNull(), // 'attending' | 'interested'
    visible: boolean("visible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.eventEntityId] })],
);

/**
 * Contact requests: visible→visible only, ONE per (from, to, event) pair.
 * Acceptance reveals emails to BOTH sides via their update items — there is
 * deliberately no in-app messaging in v1: email is where professionals
 * talk, and building a worse inbox helps nobody. Declines are silent: the
 * sender sees status only if they look, never a notification.
 */
export const contactRequests = pgTable(
  "contact_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromMemberId: uuid("from_member_id")
      .notNull()
      .references(() => memberProfiles.id),
    toMemberId: uuid("to_member_id")
      .notNull()
      .references(() => memberProfiles.id),
    eventEntityId: uuid("event_entity_id")
      .notNull()
      .references(() => entities.id),
    message: text("message"),
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("contact_requests_pair_event_idx").on(t.fromMemberId, t.toMemberId, t.eventEntityId),
  ],
);
