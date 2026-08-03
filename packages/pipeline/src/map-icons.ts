import { twoLetterMonogram } from "@continuum/shared";

/**
 * LOGO-PIN MAP — icon naming shared by the atlas builder (S2) and the tile
 * export (S4). The two MUST agree or pins render blank.
 */

export const MAP_CLASS_HEX: Record<string, string> = {
  "private-equity": "#47b598",
  "private-credit": "#c69a3d",
  "real-assets": "#a3a441",
  "hedge-funds": "#9a7bc0",
  structured: "#4da4a8",
  esoteric: "#b06aa4",
  collectibles: "#c0708f",
  climate: "#5aa878",
  digital: "#8486c9",
  neutral: "#6e6a62",
};

export function mapClassSlug(raw: string | null): string {
  return raw !== null && MAP_CLASS_HEX[raw] !== undefined ? raw : "neutral";
}

export function iconNameFor(opts: {
  hasLogo: boolean;
  slug: string;
  classSlug: string | null;
  name: string;
}): string {
  if (opts.hasLogo) {
    return `logo-${opts.slug}`;
  }
  return `mono-${mapClassSlug(opts.classSlug)}-${twoLetterMonogram(opts.name)}`;
}
