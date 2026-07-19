/**
 * Maps taxonomy tags to Tag color variants for admin display:
 * - lending/servicing world (bank, non_bank_lender, servicer, collection_agency) → credit
 * - startup/scaleup → equity
 * - court/insolvency-adjacent (court, insolvency_practitioner, restructuring_advisor,
 *   state_amc) → distressed
 * - everything else, including all gp_* and lp_* tags → neutral
 */
export function tagVariant(tag: string): "neutral" | "equity" | "credit" | "distressed" {
  if (["bank", "non_bank_lender", "servicer", "collection_agency"].includes(tag)) {
    return "credit";
  }
  if (["startup", "scaleup"].includes(tag)) {
    return "equity";
  }
  if (["court", "insolvency_practitioner", "restructuring_advisor", "state_amc"].includes(tag)) {
    return "distressed";
  }
  return "neutral";
}

/**
 * Review status → Tag variant, per Phase 5 spec (positional):
 * approved → neutral, proposed → equity, rejected → distressed.
 */
export function statusVariant(status: string | null): "neutral" | "equity" | "distressed" {
  if (status === "proposed") {
    return "equity";
  }
  if (status === "rejected") {
    return "distressed";
  }
  return "neutral";
}
