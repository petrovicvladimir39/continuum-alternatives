import { MOCK_EVENTS } from "@continuum/shared";

/** iCal export of the mock event calendar (deterministic). */
export function GET(): Response {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Continuum Alternatives//Frontend V2 Prototype//EN",
    ...MOCK_EVENTS.flatMap((e) => {
      const date = e.startsOn.replace(/-/g, "");
      return [
        "BEGIN:VEVENT",
        `UID:${e.id}@continuumalternatives.com`,
        `DTSTAMP:${date}T080000Z`,
        `DTSTART;VALUE=DATE:${date}`,
        `SUMMARY:${e.name}`,
        `LOCATION:${e.city}, ${e.country}`,
        `DESCRIPTION:${e.description.replace(/,/g, "\\,")}`,
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="continuum-events.ics"',
    },
  });
}
