/**
 * Market verticals (Phase 25C) — the six /markets/[vertical] fronts.
 * One config drives routing, metadata, channel filters, entity-tag scopes,
 * and the vertical-specific modules each front renders.
 */

export type VerticalModule =
  | "auctions"
  | "court_rankings"
  | "latest_deals"
  | "fund_closes"
  | "institutions_list"
  | "advisor_league"
  | "directory_link";

export type Vertical = {
  slug: string;
  label: string;
  /** One-line scope sentence under the serif header. */
  scope: string;
  channels: string[];
  /** ENTITY_TAGS values that define membership for "top entities" rows. */
  tags: string[];
  factTypes: string[];
  modules: VerticalModule[];
};

export const VERTICALS: Vertical[] = [
  {
    slug: "private-equity",
    label: "Private Equity",
    scope: "Buyouts, growth equity, and the managers behind them across Europe.",
    channels: ["pe"],
    tags: ["gp_pe", "gp_secondaries", "gp_search_fund", "gp_infra", "gp_re"],
    factTypes: ["acquisition", "fund_close"],
    modules: ["latest_deals"],
  },
  {
    slug: "venture-capital",
    label: "Venture Capital",
    scope: "Rounds, funds, and the venture ecosystem from seed to growth.",
    channels: ["vc_founders"],
    tags: ["gp_vc", "cvc", "accelerator", "incubator", "angel_network"],
    factTypes: ["funding_round", "fund_close"],
    modules: ["latest_deals"],
  },
  {
    slug: "private-credit",
    label: "Private Credit",
    scope: "Direct lending, credit funds, and non-bank finance across Europe.",
    channels: ["private_credit"],
    tags: ["gp_credit", "non_bank_lender", "leasing", "factoring", "bank"],
    factTypes: ["credit_event", "fund_close"],
    modules: ["latest_deals"],
  },
  {
    slug: "distressed",
    label: "Distressed & Special Situations",
    scope: "Insolvencies, NPL portfolios, auctions, and workout activity — court-sourced.",
    channels: ["distressed"],
    tags: ["gp_distressed", "servicer", "state_amc", "bank_workout_unit", "collection_agency"],
    factTypes: ["insolvency_opened", "asset_sale_announced"],
    modules: ["auctions", "court_rankings"],
  },
  {
    slug: "lps-institutions",
    label: "LPs & Institutions",
    scope: "Fund closes, commitments, and the institutions that anchor the market.",
    channels: ["lp_institutional"],
    tags: [
      "lp_pension", "lp_insurance", "lp_dfi", "lp_family_office", "lp_fof",
      "lp_swf", "lp_endowment_foundation", "lp_corporate",
    ],
    factTypes: ["fund_close"],
    modules: ["fund_closes", "institutions_list"],
  },
  {
    slug: "service-providers",
    label: "Service Providers",
    scope: "Advisors, law firms, servicers, and administrators — mandates and league activity.",
    channels: ["vendors"],
    tags: [
      "advisor_ma", "law_firm", "insolvency_practitioner", "restructuring_advisor",
      "fund_admin", "placement_agent", "accounting", "valuer",
    ],
    factTypes: ["advisor_mandate", "servicing_mandate"],
    modules: ["advisor_league", "directory_link"],
  },
];

export function verticalBySlug(slug: string): Vertical | null {
  return VERTICALS.find((vertical) => vertical.slug === slug) ?? null;
}
