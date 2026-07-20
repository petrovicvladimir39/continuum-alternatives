import { sql } from "drizzle-orm";
import { findWarmPaths, MEMBER_NODE, type WarmEdge, type WarmPath } from "@continuum/shared";
import { db } from "../client";
import { publicPathFor } from "./public";
import type { EntityKind } from "./entities";

/**
 * The egocentric universe (Phase 32B/C).
 *
 * PRIVACY LAW: every query here is scoped by the member id the caller
 * resolved from their own session. Member A's private edges are loaded by
 * `WHERE member_id = A` — member B's traversal CANNOT touch them because
 * they are never in B's edge list. Asserted adversarially in
 * verify-universe at the SQL-result level.
 */

const FRONTIER_NODE_CAP = 1500;
const FRONTIER_EDGE_CAP = 5000;

export type MemberGraph = {
  edges: WarmEdge[];
  /** Entity ids one hop from the member, by origin. */
  seeds: { affiliation: string | null; contactOrgs: string[]; coAttendanceOrgs: string[] };
  nodeNames: Map<string, string>;
  nodeKinds: Map<string, string>;
};

/** Build THIS member's traversable world: their hops out + public edges. */
export async function buildMemberGraph(memberId: string, maxHops = 3): Promise<MemberGraph> {
  const edges: WarmEdge[] = [];
  const nodeNames = new Map<string, string>();
  const nodeKinds = new Map<string, string>();

  // Affiliation — the member-confirmed firm (never inferred).
  const affiliationResult = await db.execute(sql`
    SELECT e.id, e.name, e.kind FROM member_profiles m
    JOIN entities e ON e.id = m.organization_entity_id AND e.status = 'active'
    WHERE m.id = ${memberId}
  `);
  const affiliation = affiliationResult.rows[0];
  const affiliationId = affiliation === undefined ? null : String(affiliation.id);
  if (affiliation !== undefined) {
    nodeNames.set(String(affiliation.id), String(affiliation.name));
    nodeKinds.set(String(affiliation.id), String(affiliation.kind));
    edges.push({
      from: MEMBER_NODE,
      to: String(affiliation.id),
      kind: "affiliation",
      label: "your firm",
      private: false,
      recency: null,
    });
  }

  // Private contacts — THIS member's rows only (the scoping that matters).
  const contactsResult = await db.execute(sql`
    SELECT p.contact_org_entity_id AS org_id, p.contact_display, p.position_raw,
           p.connected_on::text AS connected_on, e.name, e.kind
    FROM member_private_edges p
    JOIN entities e ON e.id = p.contact_org_entity_id AND e.status = 'active'
    WHERE p.member_id = ${memberId} AND p.contact_org_entity_id IS NOT NULL
  `);
  const contactOrgs: string[] = [];
  for (const row of contactsResult.rows) {
    const orgId = String(row.org_id);
    nodeNames.set(orgId, String(row.name));
    nodeKinds.set(orgId, String(row.kind));
    contactOrgs.push(orgId);
    const position = row.position_raw === null ? "" : `, ${String(row.position_raw)}`;
    edges.push({
      from: MEMBER_NODE,
      to: orgId,
      kind: "private_contact",
      label: `your contact ${String(row.contact_display)}${position}`,
      private: true,
      recency: row.connected_on === null ? null : String(row.connected_on),
    });
  }

  // Co-attendance — mutual VISIBLE attendance only: both sides opted onto
  // the attendee list in 31C, so this hop breaches nobody's privacy.
  const coResult = await db.execute(sql`
    SELECT DISTINCT o.name AS org_name, o.id AS org_id, o.kind AS org_kind,
           ev.name AS event_name, other_m.display_name,
           to_char(evd.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS event_date
    FROM event_attendance mine
    JOIN event_attendance other
      ON other.event_entity_id = mine.event_entity_id
     AND other.member_id <> mine.member_id AND other.visible = true
    JOIN member_profiles other_m
      ON other_m.id = other.member_id AND other_m.deleted_at IS NULL
    JOIN entities o ON o.id = other_m.organization_entity_id AND o.status = 'active'
    JOIN entities ev ON ev.id = mine.event_entity_id
    JOIN events evd ON evd.entity_id = mine.event_entity_id
    WHERE mine.member_id = ${memberId} AND mine.visible = true
  `);
  const coAttendanceOrgs: string[] = [];
  for (const row of coResult.rows) {
    const orgId = String(row.org_id);
    nodeNames.set(orgId, String(row.org_name));
    nodeKinds.set(orgId, String(row.org_kind));
    coAttendanceOrgs.push(orgId);
    edges.push({
      from: MEMBER_NODE,
      to: orgId,
      kind: "co_attendance",
      label: `co-attended ${String(row.event_name)} with ${String(row.display_name ?? "a member")}`,
      private: false,
      recency: row.event_date === null ? null : String(row.event_date),
    });
  }

  // Public frontier: approved edges, expanded (maxHops - 1) rings out from
  // the member's one-hop orgs, capped to keep worst cases bounded.
  let frontier = [...new Set([affiliationId, ...contactOrgs, ...coAttendanceOrgs].filter(
    (id): id is string => id !== null,
  ))];
  const known = new Set(frontier);
  const seenEdges = new Set<string>();
  for (let ring = 0; ring < maxHops - 1 && frontier.length > 0; ring++) {
    if (known.size >= FRONTIER_NODE_CAP || edges.length >= FRONTIER_EDGE_CAP) {
      break;
    }
    const result = await db.execute(sql`
      SELECT x.id, x.edge_type, x.source_entity_id, x.target_entity_id,
             x.started_on::text AS started_on, to_char(x.created_at, 'YYYY-MM-DD') AS created_on,
             s.name AS source_name, s.kind AS source_kind, s.status AS source_status,
             t.name AS target_name, t.kind AS target_kind, t.status AS target_status
      FROM edges x
      JOIN entities s ON s.id = x.source_entity_id
      JOIN entities t ON t.id = x.target_entity_id
      WHERE x.status = 'approved'
        AND (x.source_entity_id IN (${sql.join(frontier.map((id) => sql`${id}::uuid`), sql`, `)})
          OR x.target_entity_id IN (${sql.join(frontier.map((id) => sql`${id}::uuid`), sql`, `)}))
      LIMIT ${FRONTIER_EDGE_CAP}
    `);
    const nextFrontier: string[] = [];
    for (const row of result.rows) {
      if (String(row.source_status) !== "active" || String(row.target_status) !== "active") {
        continue;
      }
      const edgeId = String(row.id);
      if (seenEdges.has(edgeId)) {
        continue;
      }
      seenEdges.add(edgeId);
      const sourceId = String(row.source_entity_id);
      const targetId = String(row.target_entity_id);
      nodeNames.set(sourceId, String(row.source_name));
      nodeKinds.set(sourceId, String(row.source_kind));
      nodeNames.set(targetId, String(row.target_name));
      nodeKinds.set(targetId, String(row.target_kind));
      edges.push({
        from: sourceId,
        to: targetId,
        kind: String(row.edge_type),
        label: String(row.edge_type).replaceAll("_", " "),
        private: false,
        recency:
          row.started_on !== null
            ? String(row.started_on)
            : row.created_on === null
              ? null
              : String(row.created_on),
      });
      for (const id of [sourceId, targetId]) {
        if (!known.has(id) && known.size < FRONTIER_NODE_CAP) {
          known.add(id);
          nextFrontier.push(id);
        }
      }
    }
    frontier = nextFrontier;
  }

  return {
    edges,
    seeds: { affiliation: affiliationId, contactOrgs, coAttendanceOrgs },
    nodeNames,
    nodeKinds,
  };
}

/**
 * Intro intermediary (Phase 32D): a member confirmed-affiliated to the org
 * WITH a participation signal — any visibility opt-in from 31C or a
 * published post. Members who never chose to be seen anywhere are not
 * offered up as intermediaries: no signal, no affordance, just the org
 * name. Deterministic pick (oldest profile) when several qualify.
 */
export async function findIntroIntermediary(
  orgEntityId: string,
  excludeMemberId: string,
): Promise<{ memberId: string; displayName: string; line: string | null } | null> {
  const result = await db.execute(sql`
    SELECT m.id, coalesce(m.display_name, 'Member') AS display_name,
           m.role_title, m.organization
    FROM member_profiles m
    WHERE m.organization_entity_id = ${orgEntityId}
      AND m.deleted_at IS NULL
      AND m.id <> ${excludeMemberId}
      AND (
        EXISTS (SELECT 1 FROM event_attendance a
                  WHERE a.member_id = m.id AND a.visible = true)
        OR EXISTS (SELECT 1 FROM thread_posts p
                     WHERE p.member_id = m.id AND p.status = 'published')
      )
    ORDER BY m.created_at ASC
    LIMIT 1
  `);
  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }
  const line =
    [row.role_title, row.organization].filter((part) => part !== null && part !== "").join(" · ") ||
    null;
  return { memberId: String(row.id), displayName: String(row.display_name), line };
}

export type UniverseLayer = "firm" | "contact" | "event" | "watched";

export type UniverseEntity = {
  entityId: string;
  slug: string;
  name: string;
  kind: string;
  href: string | null;
  layer: UniverseLayer;
  lat: number | null;
  lng: number | null;
  /** direct contact / 2 hops / watched only — deterministic, no path search. */
  warmth: "direct" | "two_hops" | "watched_only";
};

/**
 * The member's universe, layered: their firm, matched contact orgs
 * (private — OWNER-ONLY output), consented co-attendance orgs, watchlist.
 * Warmth: direct = one member-hop away; watched entities upgrade to
 * "2 hops" when one approved public edge links them to a direct org.
 */
export async function universeEntities(memberId: string): Promise<UniverseEntity[]> {
  const result = await db.execute(sql`
    WITH firm AS (
      SELECT e.id, 'firm' AS layer FROM member_profiles m
      JOIN entities e ON e.id = m.organization_entity_id AND e.status = 'active'
      WHERE m.id = ${memberId}
    ),
    contact AS (
      SELECT DISTINCT p.contact_org_entity_id AS id, 'contact' AS layer
      FROM member_private_edges p
      JOIN entities e ON e.id = p.contact_org_entity_id AND e.status = 'active'
      WHERE p.member_id = ${memberId} AND p.contact_org_entity_id IS NOT NULL
    ),
    event_orgs AS (
      SELECT DISTINCT om.organization_entity_id AS id, 'event' AS layer
      FROM event_attendance mine
      JOIN event_attendance other
        ON other.event_entity_id = mine.event_entity_id
       AND other.member_id <> mine.member_id AND other.visible = true
      JOIN member_profiles om ON om.id = other.member_id AND om.deleted_at IS NULL
      JOIN entities e ON e.id = om.organization_entity_id AND e.status = 'active'
      WHERE mine.member_id = ${memberId} AND mine.visible = true
    ),
    watched AS (
      SELECT w.entity_id AS id, 'watched' AS layer FROM member_watchlist w
      JOIN entities e ON e.id = w.entity_id AND e.status = 'active'
      WHERE w.member_id = ${memberId}
    ),
    all_rows AS (
      SELECT * FROM firm UNION ALL SELECT * FROM contact
      UNION ALL SELECT * FROM event_orgs UNION ALL SELECT * FROM watched
    ),
    ranked AS (
      SELECT id, layer, row_number() OVER (
        PARTITION BY id
        ORDER BY CASE layer WHEN 'firm' THEN 0 WHEN 'contact' THEN 1
                            WHEN 'event' THEN 2 ELSE 3 END
      ) AS rn
      FROM all_rows
    )
    SELECT r.id, r.layer, e.slug, e.name, e.kind,
           ST_Y(e.geo::geometry) AS lat, ST_X(e.geo::geometry) AS lng,
           EXISTS (
             SELECT 1 FROM edges x
             WHERE x.status = 'approved'
               AND (x.source_entity_id = r.id OR x.target_entity_id = r.id)
               AND (x.source_entity_id IN (SELECT id FROM ranked d WHERE d.rn = 1 AND d.layer <> 'watched')
                 OR x.target_entity_id IN (SELECT id FROM ranked d WHERE d.rn = 1 AND d.layer <> 'watched'))
           ) AS near_direct
    FROM ranked r JOIN entities e ON e.id = r.id
    WHERE r.rn = 1
    ORDER BY e.name
  `);
  return result.rows.map((row) => {
    const layer = String(row.layer) as UniverseLayer;
    return {
      entityId: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      kind: String(row.kind),
      href: publicPathFor(String(row.kind) as EntityKind, String(row.slug)),
      layer,
      lat: row.lat === null ? null : Number(row.lat),
      lng: row.lng === null ? null : Number(row.lng),
      warmth:
        layer !== "watched" ? "direct" : row.near_direct === true ? "two_hops" : "watched_only",
    };
  });
}

export type PathSegment = {
  /** Display name of the node this hop ARRIVES at. */
  nodeName: string;
  /** The hop's phrase ("your contact J. Novak, Partner" / "advised on"). */
  viaLabel: string;
  /** Owner-only marker — rendered "(your contact)". */
  isPrivate: boolean;
};

export type RenderedPath = {
  segments: PathSegment[];
  hops: number;
  score: number;
  /** "You → Acme Partners — your contact J. Novak → advised on → Target." */
  chain: string;
};

/**
 * Ranked warm paths member → target over public ∪ own-private edges.
 * Pure engine underneath; this wrapper resolves display names.
 */
export async function pathsToEntity(
  memberId: string,
  targetEntityId: string,
  maxHops = 3,
): Promise<RenderedPath[]> {
  const graph = await buildMemberGraph(memberId, maxHops);
  const paths = findWarmPaths({
    edges: graph.edges,
    target: targetEntityId,
    maxHops,
    now: new Date(),
  });
  return paths.map((path) => renderPath(path, graph.nodeNames));
}

/**
 * Spec format: "You → Acme Partners — your contact J. Novak, Partner →
 * advised on → Target Fund" — first hop names the org and how you know it;
 * every later hop is "→ {relationship} → {org}".
 */
function renderPath(path: WarmPath, nodeNames: Map<string, string>): RenderedPath {
  const segments: PathSegment[] = path.edges.map((edge, index) => ({
    nodeName: nodeNames.get(path.nodes[index + 1]!) ?? "—",
    viaLabel: edge.label,
    isPrivate: edge.private,
  }));
  const first = segments[0]!;
  const chain =
    `You → ${first.nodeName} — ${first.viaLabel}` +
    segments
      .slice(1)
      .map((segment) => ` → ${segment.viaLabel} → ${segment.nodeName}`)
      .join("");
  return { segments, hops: path.hops, score: path.score, chain };
}
