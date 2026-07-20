import { eq, sql } from "drizzle-orm";
import type { ParsedConnection } from "@continuum/shared";
import { db } from "../client";
import { memberPrivateEdges, memberProfiles } from "../schema";
import { resolveEntity } from "../resolve";

/**
 * Private-graph data layer (Phase 32A).
 *
 * PRIVACY LAW: every function here takes THE member's id resolved from
 * their own session and scopes every statement by it. Private edges are
 * visible to and traversable by that member only — never public, never
 * aggregated, never another member's input. Delete-all is total and
 * immediate.
 */

/** ONE confirmed affiliation; null clears. Never called by inference code. */
export async function setMemberAffiliation(
  memberId: string,
  organizationEntityId: string | null,
): Promise<void> {
  await db
    .update(memberProfiles)
    .set({ organizationEntityId })
    .where(eq(memberProfiles.id, memberId));
}

export type ImportReport = {
  imported: number;
  matched: number;
  duplicates: number;
  capped: boolean;
};

/** Sanity cap — a Connections.csv beyond this is truncated, and we say so. */
export const IMPORT_MAX_ROWS = 2000;

/**
 * Store the member's parsed connections. Company strings resolve through
 * the SAME engine the registers use (resolveEntity) — 'matched' links the
 * corpus entity; 'ambiguous' and 'new' keep the raw string only (no fuzzy
 * merging into someone's graph). Re-uploads are idempotent per
 * (display, company) pair. Emails were dropped before this is ever called.
 */
export async function importPrivateEdges(
  memberId: string,
  connections: ParsedConnection[],
): Promise<ImportReport> {
  const capped = connections.length > IMPORT_MAX_ROWS;
  const batch = connections.slice(0, IMPORT_MAX_ROWS);
  const existing = await db
    .select({
      contactDisplay: memberPrivateEdges.contactDisplay,
      contactOrgRaw: memberPrivateEdges.contactOrgRaw,
    })
    .from(memberPrivateEdges)
    .where(eq(memberPrivateEdges.memberId, memberId));
  const seen = new Set(existing.map((row) => `${row.contactDisplay}|${row.contactOrgRaw ?? ""}`));

  let imported = 0;
  let matched = 0;
  let duplicates = 0;
  for (const connection of batch) {
    const key = `${connection.display}|${connection.company ?? ""}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    let contactOrgEntityId: string | null = null;
    if (connection.company !== null) {
      const resolved = await resolveEntity({ name: connection.company, kindHint: "organization" });
      if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
        contactOrgEntityId = resolved.entityId;
        matched += 1;
      }
    }
    await db.insert(memberPrivateEdges).values({
      memberId,
      contactDisplay: connection.display,
      contactOrgRaw: connection.company,
      contactOrgEntityId,
      positionRaw: connection.position,
      connectedOn: connection.connectedOn,
    });
    imported += 1;
  }
  return { imported, matched, duplicates, capped };
}

/** The one-click promise: everything, immediately, no soft-delete. */
export async function deleteAllPrivateEdges(memberId: string): Promise<number> {
  const rows = await db
    .delete(memberPrivateEdges)
    .where(eq(memberPrivateEdges.memberId, memberId))
    .returning({ id: memberPrivateEdges.id });
  return rows.length;
}

export async function countPrivateEdges(
  memberId: string,
): Promise<{ total: number; matched: number }> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE contact_org_entity_id IS NOT NULL)::int AS matched
    FROM member_private_edges WHERE member_id = ${memberId}
  `);
  const row = result.rows[0] ?? {};
  return { total: Number(row.total ?? 0), matched: Number(row.matched ?? 0) };
}

export type PrivateContact = {
  id: string;
  display: string;
  orgRaw: string | null;
  orgEntityId: string | null;
  orgName: string | null;
  orgSlug: string | null;
  position: string | null;
  connectedOn: string | null;
};

/** The member's own contacts, matched org names joined — OWNER-ONLY view. */
export async function listPrivateContacts(memberId: string): Promise<PrivateContact[]> {
  const result = await db.execute(sql`
    SELECT p.id, p.contact_display, p.contact_org_raw, p.contact_org_entity_id,
           p.position_raw, p.connected_on::text AS connected_on,
           e.name AS org_name, e.slug AS org_slug
    FROM member_private_edges p
    LEFT JOIN entities e ON e.id = p.contact_org_entity_id AND e.status = 'active'
    WHERE p.member_id = ${memberId}
    ORDER BY p.contact_display
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    display: String(row.contact_display),
    orgRaw: row.contact_org_raw === null ? null : String(row.contact_org_raw),
    orgEntityId: row.contact_org_entity_id === null ? null : String(row.contact_org_entity_id),
    orgName: row.org_name === null ? null : String(row.org_name),
    orgSlug: row.org_slug === null ? null : String(row.org_slug),
    position: row.position_raw === null ? null : String(row.position_raw),
    connectedOn: row.connected_on === null ? null : String(row.connected_on),
  }));
}

/** Affiliation row for display ("This is my firm"). */
export async function getMemberAffiliation(
  memberId: string,
): Promise<{ entityId: string; name: string; slug: string } | null> {
  const result = await db.execute(sql`
    SELECT e.id, e.name, e.slug
    FROM member_profiles m JOIN entities e ON e.id = m.organization_entity_id
    WHERE m.id = ${memberId} AND e.status = 'active'
  `);
  const row = result.rows[0];
  return row === undefined
    ? null
    : { entityId: String(row.id), name: String(row.name), slug: String(row.slug) };
}
