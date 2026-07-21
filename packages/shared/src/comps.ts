/**
 * Comps coverage gate (Phase 34B) — pure. A multiples/values range built
 * on fewer than COMPS_MIN_DEALS parsed-amount deals is an anecdote wearing
 * a chart; below the gate the UI shows a Building note with the real
 * counts instead. Verify enforces that no class renders under the gate.
 */
export const COMPS_MIN_DEALS = 8;

export function compsRenderable(dealsWithAmounts: number): boolean {
  return dealsWithAmounts >= COMPS_MIN_DEALS;
}
