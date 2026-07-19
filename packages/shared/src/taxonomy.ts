/**
 * Entity tag taxonomy — the only valid values for entity_tags.tag,
 * grouped by the nine player categories of the register:
 *
 * 1. Capital managers (GPs & investors):
 *    gp_vc, gp_pe, gp_credit, gp_distressed, gp_re, gp_infra, gp_secondaries,
 *    gp_search_fund, cvc, hedge_fund, angel_network, angel
 * 2. Capital owners (LPs):
 *    lp_pension, lp_insurance, lp_dfi, lp_family_office, lp_fof, lp_swf,
 *    lp_endowment_foundation, lp_corporate
 * 3. Lenders & credit providers:
 *    bank, non_bank_lender, leasing, factoring, bank_workout_unit
 * 4. Servicing & workout:
 *    servicer, collection_agency, state_amc
 * 5. Advisors & professional services:
 *    advisor_ma, placement_agent, law_firm, insolvency_practitioner, accounting,
 *    valuer, fund_admin, dd_provider, restructuring_advisor, exec_search, pr_ir,
 *    notary, re_broker, w_i_insurance, it_vendor, depositary, trust_services
 * 6. State & regulators:
 *    regulator, ministry, agency_investment_promotion, registry_body, court,
 *    central_bank, securities_commission, deposit_insurance, privatization_agency,
 *    eu_institution, tax_authority
 * 7. Ecosystem & market infrastructure:
 *    stock_exchange, incubator, accelerator, university, association,
 *    chamber_of_commerce, tech_park, tech_transfer_office
 * 8. Media, data & research:
 *    media, data_provider, research_house, podcast, awards
 * 9. Companies & vehicles:
 *    startup, scaleup, sme, corporate, spv
 */
export const ENTITY_TAGS = [
  "gp_vc",
  "gp_pe",
  "gp_credit",
  "gp_distressed",
  "gp_re",
  "gp_infra",
  "gp_secondaries",
  "gp_search_fund",
  "cvc",
  "hedge_fund",
  "angel_network",
  "angel",
  "lp_pension",
  "lp_insurance",
  "lp_dfi",
  "lp_family_office",
  "lp_fof",
  "lp_swf",
  "lp_endowment_foundation",
  "lp_corporate",
  "bank",
  "non_bank_lender",
  "leasing",
  "factoring",
  "bank_workout_unit",
  "servicer",
  "collection_agency",
  "state_amc",
  "advisor_ma",
  "placement_agent",
  "law_firm",
  "insolvency_practitioner",
  "accounting",
  "valuer",
  "fund_admin",
  "dd_provider",
  "restructuring_advisor",
  "exec_search",
  "pr_ir",
  "notary",
  "re_broker",
  "w_i_insurance",
  "it_vendor",
  "depositary",
  "trust_services",
  "regulator",
  "ministry",
  "agency_investment_promotion",
  "registry_body",
  "court",
  "central_bank",
  "securities_commission",
  "deposit_insurance",
  "privatization_agency",
  "eu_institution",
  "tax_authority",
  "stock_exchange",
  "incubator",
  "accelerator",
  "university",
  "association",
  "chamber_of_commerce",
  "tech_park",
  "tech_transfer_office",
  "media",
  "data_provider",
  "research_house",
  "podcast",
  "awards",
  "startup",
  "scaleup",
  "sme",
  "corporate",
  "spv",
] as const;

export type EntityTag = (typeof ENTITY_TAGS)[number];
