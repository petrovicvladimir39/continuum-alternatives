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
    ],
  },
  { label: "Reports", href: "/reports" },
  {
    label: "Resources",
    items: [
      { label: "Digest", href: "/digest" },
      { label: "Reports", href: "/reports" },
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
