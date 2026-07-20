/**
 * Warm-path engine (Phase 32B) — PURE graph search, fixture-tested in
 * verify-universe. The DB layer builds a member-scoped edge list (public
 * edges ∪ THAT member's private edges ∪ their consented co-attendance) and
 * hands it here; this module never touches storage, so the privacy scoping
 * is structural: an edge another member owns simply never reaches it.
 */

/** The reserved start node — the member themselves. */
export const MEMBER_NODE = "member";

export type WarmEdge = {
  from: string;
  to: string;
  /** 'private_contact' | 'affiliation' | 'co_attendance' | a public edge type. */
  kind: string;
  /** Human phrase for the rendered chain ("your contact J. Novak, Partner"). */
  label: string;
  /** True ONLY for the owner's private-contact hops — rendered "(your contact)". */
  private: boolean;
  /** ISO date of the edge's newest evidence, null when undated. */
  recency: string | null;
};

export type WarmPath = {
  /** Node ids, MEMBER_NODE first, target last. */
  nodes: string[];
  edges: WarmEdge[];
  hops: number;
  /** LOWER is warmer. Deterministic. */
  score: number;
};

/**
 * Warmth ordering (spec): private contact > invested_in/manages >
 * advised_on > co-attendance > generic. Higher weight = warmer.
 */
export function warmthWeight(kind: string): number {
  switch (kind) {
    case "private_contact":
      return 40;
    case "affiliation":
      return 35;
    case "invested_in":
    case "manages":
    case "lp_in":
    case "acquired":
    case "founded":
      return 30;
    case "lent_to":
    case "sold_portfolio_to":
    case "originated":
    case "divested":
      return 25;
    case "advised_on":
    case "serviced_by":
    case "audits":
    case "values":
      return 20;
    case "co_attendance":
      return 15;
    default:
      return 10;
  }
}

/** Newer evidence warms a path; undated edges add nothing. */
export function recencyBonus(recency: string | null, now: Date): number {
  if (recency === null) {
    return 0;
  }
  const then = Date.parse(`${recency}T00:00:00Z`);
  if (Number.isNaN(then)) {
    return 0;
  }
  const days = Math.max(0, (now.getTime() - then) / 86_400_000);
  if (days <= 90) {
    return 8;
  }
  if (days <= 365) {
    return 5;
  }
  if (days <= 1095) {
    return 2;
  }
  return 0;
}

function pathScore(edges: WarmEdge[], now: Date): number {
  const warmth = edges.reduce((sum, edge) => sum + warmthWeight(edge.kind), 0);
  const newest = edges.reduce<string | null>(
    (best, edge) =>
      edge.recency !== null && (best === null || edge.recency > best) ? edge.recency : best,
    null,
  );
  // Hop count dominates (fewer always beats warmer-but-longer), then warmth,
  // then recency of the newest edge on the path.
  return edges.length * 1000 - warmth - recencyBonus(newest, now);
}

const MAX_EXPANSIONS = 50_000;
const MAX_RESULTS = 10;

/**
 * All simple paths MEMBER_NODE → target within maxHops edges, ranked
 * warmest-first. Public edges traverse BOTH directions (a relationship
 * connects regardless of which side is source); member-originating edges
 * (private/affiliation/co-attendance) only lead AWAY from the member.
 */
export function findWarmPaths(input: {
  edges: WarmEdge[];
  target: string;
  maxHops?: number;
  now: Date;
}): WarmPath[] {
  const maxHops = input.maxHops ?? 3;
  const adjacency = new Map<string, WarmEdge[]>();
  const add = (key: string, edge: WarmEdge) => {
    adjacency.set(key, [...(adjacency.get(key) ?? []), edge]);
  };
  for (const edge of input.edges) {
    add(edge.from, edge);
    if (edge.from !== MEMBER_NODE) {
      // Reverse traversal keeps the SAME edge (label/kind), walked backwards.
      add(edge.to, { ...edge, from: edge.to, to: edge.from });
    }
  }

  const results: WarmPath[] = [];
  let expansions = 0;
  const walk = (node: string, visited: string[], edges: WarmEdge[]): void => {
    if (expansions >= MAX_EXPANSIONS) {
      return;
    }
    expansions += 1;
    if (node === input.target && edges.length > 0) {
      results.push({
        nodes: [...visited],
        edges: [...edges],
        hops: edges.length,
        score: pathScore(edges, input.now),
      });
      return;
    }
    if (edges.length >= maxHops) {
      return;
    }
    for (const edge of adjacency.get(node) ?? []) {
      if (visited.includes(edge.to)) {
        continue;
      }
      visited.push(edge.to);
      edges.push(edge);
      walk(edge.to, visited, edges);
      visited.pop();
      edges.pop();
    }
  };
  walk(MEMBER_NODE, [MEMBER_NODE], []);

  // Deterministic: score, then the node chain as the tie-break.
  results.sort((a, b) => a.score - b.score || a.nodes.join("|").localeCompare(b.nodes.join("|")));
  return results.slice(0, MAX_RESULTS);
}
