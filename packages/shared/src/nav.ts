/**
 * Site IA (Phase 25A) — the single navigation tree. Header dropdowns,
 * footer columns, sitemap prominence, and the verify suite all consume this
 * ONE definition.
 */

export type NavLeaf = { label: string; href: string };
export type NavNode = NavLeaf | { label: string; items: NavLeaf[] };

export const NAV_TREE: NavNode[] = [
  { label: "News", href: "/news" },
  {
    label: "Markets",
    items: [
      { label: "Private Equity", href: "/markets/private-equity" },
      { label: "Venture Capital", href: "/markets/venture-capital" },
      { label: "Private Credit", href: "/markets/private-credit" },
      { label: "Distressed & Special Situations", href: "/markets/distressed" },
      { label: "LPs & Institutions", href: "/markets/lps-institutions" },
      { label: "Service Providers", href: "/markets/service-providers" },
    ],
  },
  { label: "Ecosystem", href: "/ecosystem" },
  {
    label: "Data",
    items: [
      { label: "Companies", href: "/companies" },
      { label: "Funds", href: "/funds" },
      { label: "Deals", href: "/deals" },
      { label: "Auctions", href: "/auctions" },
      { label: "Rankings", href: "/rankings" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    label: "Solutions",
    items: [
      { label: "For Investors", href: "/solutions/investors" },
      { label: "For Lenders & Servicers", href: "/solutions/lenders-servicers" },
      { label: "For Advisors", href: "/solutions/advisors" },
      { label: "For Founders", href: "/solutions/founders" },
      { label: "For Institutions", href: "/solutions/institutions" },
      // Phase 29C: /pricing lives HERE, not as a top-level item — the quieter
      // of the two allowed placements. Membership is a commercial affordance
      // for people already evaluating the product (the Solutions audience);
      // a top-level "Pricing" would put a sell in every reader's eyeline.
      { label: "Membership", href: "/pricing" },
    ],
  },
  { label: "Reports", href: "/reports" },
  {
    label: "Resources",
    items: [
      // Phase 31B: /events lives HERE, not under Data ▾ — Data holds the
      // record's datasets (entities, facts, rankings); the calendar is a
      // reader utility like the Digest, and it links back into the record
      // rather than being part of it.
      { label: "Events", href: "/events" },
      { label: "Digest", href: "/digest" },
      { label: "Reports", href: "/reports" },
      // Phase 34B: analyst tools are member utilities, so they sit with the
      // reader utilities — not under Data ▾, which lists the record itself.
      { label: "Analyst tools", href: "/tools/npl-simulator" },
      { label: "API & MCP", href: "/docs/api" },
      { label: "Coverage", href: "/coverage" },
      { label: "Methodology", href: "/methodology" },
      { label: "About", href: "/about" },
    ],
  },
];

export function navLeaves(tree: NavNode[] = NAV_TREE): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  const seen = new Set<string>();
  for (const node of tree) {
    const items = "items" in node ? node.items : [node];
    for (const leaf of items) {
      if (!seen.has(leaf.href)) {
        seen.add(leaf.href);
        leaves.push(leaf);
      }
    }
  }
  return leaves;
}
