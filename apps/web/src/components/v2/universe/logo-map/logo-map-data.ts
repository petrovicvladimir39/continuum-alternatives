import { MOCK_ENTITIES, twoLetterMonogram, type MockEntity } from "@continuum/shared";

/**
 * LOGO-PIN MAP S3 — feature construction + zoom-tier data. One property
 * contract shared by mock (built client-side from MOCK_ENTITIES) and real
 * (emitted by tiles:build): icon, name, slug, cls, country, tier, kind,
 * city, aumM, sort. `sort` feeds symbol-sort-key — LOWER renders first and
 * wins label collisions, so majors survive and smaller firms fade in.
 */

export type PinProps = {
  icon: string;
  name: string;
  slug: string;
  cls: string;
  country: string;
  tier: string;
  kind: string;
  city: string;
  aumM: number | null;
  sort: number;
};

export type PinFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: PinProps;
};

export type PinCollection = { type: "FeatureCollection"; features: PinFeature[] };

const TIER_WEIGHT: Record<string, number> = { verified: 3000, register: 1500, monitored: 0 };

export function importanceOf(aumM: number | null, tier: string, degree = 0): number {
  return (aumM ?? 0) + (TIER_WEIGHT[tier] ?? 0) + degree * 50;
}

export function mockPinFeature(entity: MockEntity): PinFeature {
  const importance = importanceOf(entity.aumM, entity.tier);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [entity.lng, entity.lat] },
    properties: {
      icon: `mono-${entity.assetClass}-${twoLetterMonogram(entity.name)}`,
      name: entity.name,
      slug: entity.slug,
      cls: entity.assetClass,
      country: entity.country,
      tier: entity.tier,
      kind: entity.kind,
      city: entity.city,
      aumM: entity.aumM,
      sort: -importance,
    },
  };
}

export function mockCollection(): PinCollection {
  return { type: "FeatureCollection", features: MOCK_ENTITIES.map(mockPinFeature) };
}

export type PinFilters = {
  classes: Set<string> | null;
  country: string | null;
  tiers: Set<string> | null;
  kinds: Set<string> | null;
};

export const EMPTY_FILTERS: PinFilters = { classes: null, country: null, tiers: null, kinds: null };

export function applyFilters(all: PinCollection, f: PinFilters): PinCollection {
  const features = all.features.filter((feat) => {
    const p = feat.properties;
    if (f.classes !== null && !f.classes.has(p.cls)) return false;
    if (f.country !== null && p.country !== f.country) return false;
    if (f.tiers !== null && !f.tiers.has(p.tier)) return false;
    if (f.kinds !== null && !f.kinds.has(p.kind)) return false;
    return true;
  });
  return { type: "FeatureCollection", features };
}

/** Country centroids for the z0–5 aggregate tier (39 EUROPE_COUNTRIES). */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  PL: [19.4, 52.1], CZ: [15.5, 49.8], RO: [24.97, 45.85], GR: [23.8, 39.1],
  HU: [19.5, 47.2], BG: [25.5, 42.7], HR: [16.4, 45.5], RS: [20.9, 44.0],
  SK: [19.7, 48.7], SI: [14.8, 46.1], LT: [23.9, 55.2], LV: [24.6, 56.9],
  EE: [25.5, 58.7], BA: [17.8, 44.2], MK: [21.7, 41.6], AL: [20.0, 41.1],
  ME: [19.3, 42.7], XK: [20.9, 42.6], DE: [10.4, 51.1], GB: [-1.5, 52.6],
  FR: [2.5, 46.6], IT: [12.6, 42.8], ES: [-3.7, 40.3], NL: [5.3, 52.2],
  LU: [6.1, 49.8], CH: [8.2, 46.8], SE: [16.3, 62.0], BE: [4.6, 50.6],
  AT: [14.1, 47.6], DK: [9.5, 56.0], NO: [9.0, 61.0], IE: [-8.0, 53.2],
  FI: [26.0, 62.9], PT: [-8.2, 39.6], IS: [-18.6, 64.9], MT: [14.4, 35.9],
  CY: [33.2, 35.0], LI: [9.55, 47.16], UA: [31.2, 49.0],
};

export type CountryAggFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { country: string; count: number };
};

export function countryAggregates(all: PinCollection): {
  type: "FeatureCollection";
  features: CountryAggFeature[];
} {
  const counts = new Map<string, number>();
  for (const feature of all.features) {
    const c = feature.properties.country;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const features: CountryAggFeature[] = [];
  for (const [country, count] of counts) {
    const centroid = COUNTRY_CENTROIDS[country];
    if (centroid !== undefined) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: centroid },
        properties: { country, count },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
