const TRANSLITERATIONS: Record<string, string> = {
  đ: "dj",
  ć: "c",
  č: "c",
  š: "s",
  ž: "z",
  ő: "o",
  ű: "u",
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ț: "t",
  ë: "e",
  ä: "a",
  ö: "o",
  ü: "u",
};

function transliterate(value: string): string {
  return value.replace(/[đćčšžőűăâîșțëäöü]/g, (ch) => TRANSLITERATIONS[ch] ?? ch);
}

export function slugify(name: string): string {
  const base = transliterate(name.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base === "" ? "entity" : base;
}

export function normalizeAlias(name: string): string {
  return transliterate(name.toLowerCase())
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}
