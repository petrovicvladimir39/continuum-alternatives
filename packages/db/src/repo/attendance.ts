import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { contactRequests, eventAttendance, memberProfiles } from "../schema";

/**
 * Attendance + contact data layer (Phase 31C). Consent-first throughout:
 * visibility is opt-in (default false, only the member flips it), the named
 * list and every contact path check `visible` on BOTH sides, and declines
 * are silent. Attendance is FIRST-PARTY member data only — nothing here is
 * ever scraped or imported.
 */

export type AttendanceStatus = "attending" | "interested";

/** Set or clear (null) the member's own attendance. Visibility survives status changes. */
export async function setAttendance(
  memberId: string,
  eventEntityId: string,
  status: AttendanceStatus | null,
): Promise<void> {
  if (status === null) {
    await db
      .delete(eventAttendance)
      .where(
        and(eq(eventAttendance.memberId, memberId), eq(eventAttendance.eventEntityId, eventEntityId)),
      );
    return;
  }
  await db
    .insert(eventAttendance)
    .values({ memberId, eventEntityId, status })
    .onConflictDoUpdate({
      target: [eventAttendance.memberId, eventAttendance.eventEntityId],
      set: { status },
    });
}

/** The opt-in toggle. Only meaningful on an existing attendance row. */
export async function setAttendanceVisibility(
  memberId: string,
  eventEntityId: string,
  visible: boolean,
): Promise<void> {
  await db
    .update(eventAttendance)
    .set({ visible })
    .where(
      and(eq(eventAttendance.memberId, memberId), eq(eventAttendance.eventEntityId, eventEntityId)),
    );
}

export async function myAttendance(
  memberId: string,
  eventEntityId: string,
): Promise<{ status: AttendanceStatus; visible: boolean } | null> {
  const rows = await db
    .select({ status: eventAttendance.status, visible: eventAttendance.visible })
    .from(eventAttendance)
    .where(
      and(eq(eventAttendance.memberId, memberId), eq(eventAttendance.eventEntityId, eventEntityId)),
    );
  const row = rows[0];
  return row === undefined
    ? null
    : { status: row.status as AttendanceStatus, visible: row.visible };
}

/** Aggregate counts — always renderable; they identify nobody. */
export async function attendanceCounts(
  eventEntityId: string,
): Promise<{ attending: number; interested: number }> {
  const result = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE status = 'attending')::int AS attending,
      count(*) FILTER (WHERE status = 'interested')::int AS interested
    FROM event_attendance WHERE event_entity_id = ${eventEntityId}
  `);
  const row = result.rows[0] ?? {};
  return { attending: Number(row.attending ?? 0), interested: Number(row.interested ?? 0) };
}

export type VisibleAttendee = {
  memberId: string;
  status: AttendanceStatus;
  name: string;
  roleTitle: string | null;
  organization: string | null;
};

/** The named list: VISIBLE rows only, name + the member-set professional line. */
export async function visibleAttendees(eventEntityId: string): Promise<VisibleAttendee[]> {
  const rows = await db
    .select({
      memberId: eventAttendance.memberId,
      status: eventAttendance.status,
      displayName: memberProfiles.displayName,
      roleTitle: memberProfiles.roleTitle,
      organization: memberProfiles.organization,
    })
    .from(eventAttendance)
    .innerJoin(memberProfiles, eq(memberProfiles.id, eventAttendance.memberId))
    .where(and(eq(eventAttendance.eventEntityId, eventEntityId), eq(eventAttendance.visible, true)))
    .orderBy(eventAttendance.status, memberProfiles.displayName);
  return rows.map((row) => ({
    memberId: row.memberId,
    status: row.status as AttendanceStatus,
    name: row.displayName ?? "Member",
    roleTitle: row.roleTitle,
    organization: row.organization,
  }));
}

export async function isVisibleAttendee(
  memberId: string,
  eventEntityId: string,
): Promise<boolean> {
  const rows = await db
    .select({ visible: eventAttendance.visible })
    .from(eventAttendance)
    .where(
      and(eq(eventAttendance.memberId, memberId), eq(eventAttendance.eventEntityId, eventEntityId)),
    );
  return rows[0]?.visible === true;
}

// ── Contact requests ─────────────────────────────────────────────────────

export const CONTACT_REQUESTS_PER_DAY = 5;

export async function contactRequestsToday(memberId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM contact_requests
    WHERE from_member_id = ${memberId} AND created_at >= date_trunc('day', now())
  `);
  return Number(result.rows[0]?.n ?? 0);
}

/** Outbox row for a contact event — direct insert, idempotent on (member,kind,ref). */
async function enqueueContactAlert(
  memberId: string,
  requestId: string,
  eventEntityId: string,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO alert_outbox (member_id, kind, ref_id, entity_id)
    VALUES (${memberId}, 'contact_request', ${requestId}::uuid, ${eventEntityId}::uuid)
    ON CONFLICT (member_id, kind, ref_id) DO NOTHING
  `);
}

export type CreateContactResult = "created" | "duplicate";

/**
 * One request per (from, to, event) pair — ever. Caller enforces the
 * visible→visible rule and the daily rate limit; the recipient learns via
 * their update feed (outbox kind 'contact_request').
 */
export async function createContactRequest(input: {
  fromMemberId: string;
  toMemberId: string;
  eventEntityId: string;
  message: string | null;
}): Promise<CreateContactResult> {
  const inserted = await db
    .insert(contactRequests)
    .values({
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      eventEntityId: input.eventEntityId,
      message: input.message,
    })
    .onConflictDoNothing()
    .returning({ id: contactRequests.id });
  const row = inserted[0];
  if (row === undefined) {
    return "duplicate";
  }
  await enqueueContactAlert(input.toMemberId, row.id, input.eventEntityId);
  return "created";
}

/**
 * Recipient decision. Acceptance notifies the SENDER (their update item
 * reveals both emails); decline notifies NOBODY — silent by design.
 */
export async function respondContactRequest(
  requestId: string,
  toMemberId: string,
  accept: boolean,
): Promise<boolean> {
  const rows = await db
    .update(contactRequests)
    .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(
      and(
        eq(contactRequests.id, requestId),
        eq(contactRequests.toMemberId, toMemberId),
        eq(contactRequests.status, "pending"),
      ),
    )
    .returning({
      id: contactRequests.id,
      fromMemberId: contactRequests.fromMemberId,
      eventEntityId: contactRequests.eventEntityId,
    });
  const row = rows[0];
  if (row === undefined) {
    return false;
  }
  if (accept) {
    await enqueueContactAlert(row.fromMemberId, row.id, row.eventEntityId);
  }
  return true;
}

export type ContactRequestView = {
  id: string;
  direction: "incoming" | "outgoing";
  status: string;
  message: string | null;
  createdAt: Date | null;
  eventName: string;
  eventSlug: string;
  counterpartName: string;
  counterpartLine: string | null;
  /** Revealed ONLY after acceptance — to both sides. */
  counterpartEmail: string | null;
};

/** Everything involving this member, for /account/updates. */
export async function listContactRequestsFor(memberId: string): Promise<ContactRequestView[]> {
  const result = await db.execute(sql`
    SELECT cr.id, cr.status, cr.message, cr.created_at,
      cr.from_member_id, cr.to_member_id,
      e.name AS event_name, e.slug AS event_slug,
      fm.display_name AS from_name, fm.role_title AS from_role, fm.organization AS from_org,
      fm.email AS from_email,
      tm.display_name AS to_name, tm.role_title AS to_role, tm.organization AS to_org,
      tm.email AS to_email
    FROM contact_requests cr
    JOIN entities e ON e.id = cr.event_entity_id
    JOIN member_profiles fm ON fm.id = cr.from_member_id
    JOIN member_profiles tm ON tm.id = cr.to_member_id
    WHERE cr.from_member_id = ${memberId} OR cr.to_member_id = ${memberId}
    ORDER BY cr.created_at DESC
  `);
  return result.rows.map((row) => {
    const incoming = String(row.to_member_id) === memberId;
    const accepted = String(row.status) === "accepted";
    const line = (role: unknown, org: unknown) =>
      [role, org].filter((part) => part !== null && part !== "").join(" · ") || null;
    return {
      id: String(row.id),
      direction: incoming ? "incoming" : "outgoing",
      status: String(row.status),
      message: row.message === null ? null : String(row.message),
      createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
      eventName: String(row.event_name),
      eventSlug: String(row.event_slug),
      counterpartName: String((incoming ? row.from_name : row.to_name) ?? "Member"),
      counterpartLine: incoming ? line(row.from_role, row.from_org) : line(row.to_role, row.to_org),
      counterpartEmail: accepted
        ? incoming
          ? row.from_email === null
            ? null
            : String(row.from_email)
          : row.to_email === null
            ? null
            : String(row.to_email)
        : null,
    };
  });
}

/** Member ids this sender has already requested at this event (UI state). */
export async function outgoingRequestTargets(
  fromMemberId: string,
  eventEntityId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ toMemberId: contactRequests.toMemberId })
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.fromMemberId, fromMemberId),
        eq(contactRequests.eventEntityId, eventEntityId),
      ),
    );
  return new Set(rows.map((row) => row.toMemberId));
}

/** Has this pair already exchanged a request for this event? */
export async function pairRequestExists(
  fromMemberId: string,
  toMemberId: string,
  eventEntityId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: contactRequests.id })
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.fromMemberId, fromMemberId),
        eq(contactRequests.toMemberId, toMemberId),
        eq(contactRequests.eventEntityId, eventEntityId),
      ),
    );
  return rows.length > 0;
}
