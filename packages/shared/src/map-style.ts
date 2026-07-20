/**
 * Proprietary map surface (Phase 17): transform the OpenFreeMap positron style
 * at load so the base map reads as a quiet monochrome canvas. We REMOVE every
 * symbol/label layer (place names, POIs, road shields, water labels) EXCEPT
 * country labels — our own city labels are rendered from the city-aggregate
 * data instead, so the only town names on the map are cities we have firms in.
 *
 * Pure function over the MapLibre style JSON; exported for verification.
 */

type StyleLayer = {
  id: string;
  type: string;
  [key: string]: unknown;
};

export type MapStyleLike = {
  layers?: StyleLayer[];
  [key: string]: unknown;
};

/** Keep a symbol layer only when it is a country label. */
export function isCountryLabelLayer(layer: { id: string; type: string }): boolean {
  return layer.type === "symbol" && layer.id.toLowerCase().includes("country");
}

export function stripBaseLabels<T extends MapStyleLike>(style: T): T {
  const layers = (style.layers ?? []).filter(
    (layer) => layer.type !== "symbol" || isCountryLabelLayer(layer),
  );
  return { ...style, layers };
}
