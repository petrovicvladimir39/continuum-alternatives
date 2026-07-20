/**
 * iCal feed builder (Phase 31B) — pure, fixture-tested with a parse
 * round-trip in verify-events. All-day VEVENTs (DTEND exclusive per RFC
 * 5545), stable UIDs so subscribed calendars update in place, CRLF line
 * endings, 75-octet folding left out deliberately (our lines stay short;
 * SUMMARY/LOCATION are escaped and truncated instead).
 */

export type IcsEvent = {
  /** Stable identifier — the entity id. */
  uid: string;
  name: string;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD (inclusive)
  city: string | null;
  country: string | null;
  url: string | null;
  expected: boolean;
};

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function compact(date: string): string {
  return date.replaceAll("-", "");
}

/** Exclusive DTEND: the day AFTER the inclusive end date, computed in UTC. */
export function exclusiveEnd(endsOn: string): string {
  const date = new Date(`${endsOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function buildIcsCalendar(events: IcsEvent[], generatedAt: Date): string {
  const stamp = `${generatedAt.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Continuum Alternatives//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Continuum Alternatives — Events",
  ];
  for (const event of events) {
    const location = [event.city, event.country].filter((part) => part !== null).join(", ");
    // Expected dates say so IN the entry — a calendar must not state a
    // pattern-derived date as confirmed.
    const summary = event.expected ? `${event.name} (dates expected)` : event.name;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@continuumalternatives.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(event.startsOn)}`,
      `DTEND;VALUE=DATE:${compact(exclusiveEnd(event.endsOn))}`,
      `SUMMARY:${icsEscape(summary).slice(0, 200)}`,
    );
    if (location !== "") {
      lines.push(`LOCATION:${icsEscape(location)}`);
    }
    if (event.url !== null) {
      lines.push(`URL:${event.url}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export type ParsedIcs = {
  valid: boolean;
  events: { uid: string; dtstart: string; dtend: string; summary: string }[];
};

/** Minimal strict reader — the verify round-trip, not a general parser. */
export function parseIcsCalendar(text: string): ParsedIcs {
  const lines = text.split("\r\n").filter((line) => line !== "");
  if (lines[0] !== "BEGIN:VCALENDAR" || lines[lines.length - 1] !== "END:VCALENDAR") {
    return { valid: false, events: [] };
  }
  const events: ParsedIcs["events"] = [];
  let current: Record<string, string> | null = null;
  let depth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      if (current !== null) {
        return { valid: false, events: [] }; // nested VEVENT — malformed
      }
      current = {};
      depth += 1;
    } else if (line === "END:VEVENT") {
      if (current === null) {
        return { valid: false, events: [] };
      }
      if (!current.UID || !current.DTSTART || !current.DTEND || !current.SUMMARY || !current.DTSTAMP) {
        return { valid: false, events: [] };
      }
      events.push({
        uid: current.UID,
        dtstart: current.DTSTART,
        dtend: current.DTEND,
        summary: current.SUMMARY,
      });
      current = null;
      depth -= 1;
    } else if (current !== null) {
      const colon = line.indexOf(":");
      if (colon > 0) {
        const key = line.slice(0, colon).split(";")[0]!;
        current[key] = line.slice(colon + 1);
      }
    }
  }
  return { valid: depth === 0 && current === null, events };
}
