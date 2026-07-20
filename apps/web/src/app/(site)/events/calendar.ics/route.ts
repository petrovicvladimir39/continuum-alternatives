import { buildIcsCalendar } from "@continuum/shared";
import { icalEvents } from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * /events/calendar.ics (Phase 31B) — the subscribable feed. Approved
 * upcoming events only; UID = entity id, stable forever, so edits update
 * subscribers' calendars in place instead of duplicating.
 */
export async function GET(): Promise<Response> {
  const events = await icalEvents();
  const ics = buildIcsCalendar(
    events.map((event) => ({
      uid: event.entityId,
      name: event.name,
      startsOn: event.startsOn,
      endsOn: event.endsOn,
      city: event.city,
      country: event.country,
      url: event.url,
      expected: event.expected,
    })),
    new Date(),
  );
  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="continuum-events.ics"',
      "cache-control": "public, max-age=3600",
    },
  });
}
