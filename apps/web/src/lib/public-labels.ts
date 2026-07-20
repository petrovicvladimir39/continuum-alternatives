import type { PublicKind } from "@continuum/db";

export const KIND_LABELS: Record<PublicKind, string> = {
  organization: "Company",
  fund_vehicle: "Fund",
  deal: "Deal",
};

export const KIND_LABELS_ANY: Record<string, string> = {
  ...KIND_LABELS,
  person: "Person",
  asset: "Asset",
  event: "Event",
};

export const COUNTRY_NAMES: Record<string, string> = {
  AL: "Albania",
  AT: "Austria",
  GB: "United Kingdom",
  LU: "Luxembourg",
  US: "United States",
  BA: "Bosnia and Herzegovina",
  BG: "Bulgaria",
  CZ: "Czechia",
  EE: "Estonia",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  LT: "Lithuania",
  LV: "Latvia",
  MD: "Moldova",
  ME: "Montenegro",
  MK: "North Macedonia",
  PL: "Poland",
  RO: "Romania",
  RS: "Serbia",
  SI: "Slovenia",
  SK: "Slovakia",
  UA: "Ukraine",
  XK: "Kosovo",
};

export function countryName(code: string | null): string | null {
  if (code === null) {
    return null;
  }
  return COUNTRY_NAMES[code] ?? code;
}

/**
 * Deterministic display of a stored numeric amount (parseRegionalAmount output).
 * Formatting only — no arithmetic, no unit conversion.
 */
export function formatAmount(amount: string, currency: string | null): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return currency === null ? amount : `${currency} ${amount}`;
  }
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return currency === null ? formatted : `${currency} ${formatted}`;
}

export const DEAL_TYPE_LABELS: Record<string, string> = {
  vc_round: "VC round",
  pe_buyout: "PE buyout",
  growth_equity: "Growth equity",
  acquisition: "Acquisition",
  exit: "Exit",
  npl_sale: "NPL sale",
  credit_facility: "Credit facility",
  refinancing: "Refinancing",
  insolvency_process: "Insolvency process",
  restructuring: "Restructuring",
  fund_close: "Fund close",
};

export const CHANNEL_TAG_VARIANTS: Record<string, "neutral" | "equity" | "credit" | "distressed"> =
  {
    distressed: "distressed",
    private_credit: "credit",
    vc_founders: "equity",
    pe: "equity",
    lp_institutional: "neutral",
    vendors: "neutral",
  };

export const SITE_ORIGIN = "https://continuumalternatives.com";
