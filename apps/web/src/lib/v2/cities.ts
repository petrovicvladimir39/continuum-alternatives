import { MOCK_ENTITIES, type MockEntity } from "@continuum/shared";

/** City ecosystem groupings derived from the mock entity set. */

export type CityInfo = {
  slug: string;
  name: string;
  country: string;
  entities: MockEntity[];
  lat: number;
  lng: number;
};

export function citySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let cache: CityInfo[] | null = null;

export function cityEcosystems(): CityInfo[] {
  if (cache !== null) {
    return cache;
  }
  const byCity = new Map<string, MockEntity[]>();
  for (const e of MOCK_ENTITIES) {
    const list = byCity.get(e.city) ?? [];
    list.push(e);
    byCity.set(e.city, list);
  }
  cache = [...byCity.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([name, entities]) => ({
      slug: citySlug(name),
      name,
      country: entities[0]!.country,
      entities,
      lat: entities[0]!.lat,
      lng: entities[0]!.lng,
    }))
    .sort((a, b) => b.entities.length - a.entities.length);
  return cache;
}

export function cityBySlug(slug: string): CityInfo | null {
  return cityEcosystems().find((c) => c.slug === slug) ?? null;
}
