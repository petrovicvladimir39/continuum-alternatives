/**
 * Deterministic parsers for regional numeric/date formats. LLMs never do
 * arithmetic or normalization on amounts — they transcribe raw text and these
 * parsers (plain code) do the rest. Anything ambiguous parses to null; never guess.
 */

/**
 * Parses an explicit numeral amount in regional formats:
 *   "25.000.000,00"  → 25000000.00  (dot thousands, comma decimals)
 *   "1,234,567.89"   → 1234567.89   (comma thousands, dot decimals)
 *   "1 234 567,89"   → 1234567.89   (space thousands)
 *   "25 miliona"     → null         (words never parse)
 */
export function parseRegionalAmount(raw: string): number | null {
  const text = raw.trim().replace(/ /g, " ");
  if (text === "" || !/^[0-9.,\s]+$/.test(text)) {
    return null;
  }
  const compact = text.replace(/\s+/g, " ");

  let integerPart: string;
  let decimalPart = "";

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Both present: the later one is the decimal separator.
    const decimalSep = lastComma > lastDot ? "," : ".";
    const decimalIdx = Math.max(lastComma, lastDot);
    integerPart = compact.slice(0, decimalIdx);
    decimalPart = compact.slice(decimalIdx + 1);
    const thousandsSep = decimalSep === "," ? "." : ",";
    const groups = integerPart.split(thousandsSep);
    if (
      groups.some(
        (group, i) => !/^[0-9 ]+$/.test(group) || (i > 0 && group.replace(/ /g, "").length !== 3),
      )
    ) {
      return null;
    }
    integerPart = groups.join("");
  } else if (lastComma > -1 || lastDot > -1) {
    // Single separator kind: decimal if exactly one occurrence with 1-2 digits
    // after; thousands if every group after the first has exactly 3 digits.
    const sep = lastComma > -1 ? "," : ".";
    const parts = compact.split(sep);
    const tail = parts[parts.length - 1] ?? "";
    if (parts.length === 2 && /^[0-9]{1,2}$/.test(tail.replace(/ /g, ""))) {
      integerPart = parts[0] ?? "";
      decimalPart = tail;
    } else if (parts.slice(1).every((group) => /^[0-9]{3}$/.test(group.replace(/ /g, "")))) {
      integerPart = parts.map((group) => group.replace(/ /g, "")).join("");
    } else {
      return null;
    }
  } else {
    integerPart = compact;
  }

  integerPart = integerPart.replace(/ /g, "");
  decimalPart = decimalPart.replace(/ /g, "");
  if (!/^[0-9]+$/.test(integerPart) || (decimalPart !== "" && !/^[0-9]{1,2}$/.test(decimalPart))) {
    return null;
  }
  const value = Number.parseFloat(
    decimalPart === "" ? integerPart : `${integerPart}.${decimalPart}`,
  );
  return Number.isFinite(value) ? value : null;
}

/** Parses DD.MM.YYYY or YYYY-MM-DD into ISO YYYY-MM-DD; null on anything else. */
export function parseRegionalDate(raw: string): string | null {
  const text = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const regional = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(text);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (regional) {
    day = Number(regional[1]);
    month = Number(regional[2]);
    year = Number(regional[3]);
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
