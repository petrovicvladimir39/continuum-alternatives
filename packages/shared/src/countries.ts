/**
 * The platform's geographic scope: all of Europe. EU27 + United Kingdom,
 * Switzerland, Norway, Iceland + the non-EU Balkans/Eastern countries already
 * in the corpus. Import validation, country filters, and map bounds all read
 * from this constant — it is the single definition of "Europe" platform-wide.
 */
export const EUROPE_COUNTRY_NAMES: Record<string, string> = {
  // EU27
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SK: "Slovakia",
  SI: "Slovenia",
  ES: "Spain",
  SE: "Sweden",
  // Non-EU Western Europe
  GB: "United Kingdom",
  CH: "Switzerland",
  NO: "Norway",
  IS: "Iceland",
  LI: "Liechtenstein",
  // Non-EU Balkans / Eastern Europe (existing corpus countries)
  AL: "Albania",
  BA: "Bosnia and Herzegovina",
  MD: "Moldova",
  ME: "Montenegro",
  MK: "North Macedonia",
  RS: "Serbia",
  UA: "Ukraine",
  XK: "Kosovo",
};

export const EUROPE_COUNTRIES = Object.keys(EUROPE_COUNTRY_NAMES);

export function isEuropeCountry(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(EUROPE_COUNTRY_NAMES, code.toUpperCase());
}

/**
 * All-Europe map fit: Iceland to Cyprus, Portugal to eastern Ukraine.
 * [[west, south], [east, north]] — MapLibre LngLatBoundsLike.
 */
export const EUROPE_MAP_BOUNDS: [[number, number], [number, number]] = [
  [-24.5, 34.5],
  [40.5, 71.0],
];
