import type { Metadata } from "next";
import { MOCK_EVENTS } from "@continuum/shared";
import { EventCard } from "@/components/v2/network/event-card";

export const metadata: Metadata = { title: "Events — Network" };

/** Industry summits, roundtables and dinners with RSVP + iCal export. */
export default function EventsPage() {
  const events = [...MOCK_EVENTS].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="type-label">Network</div>
          <h1 className="type-display mt-2">Events</h1>
        </div>
        <a
          href="/v2/network/events/calendar.ics"
          className="type-label border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
        >
          Add to calendar (.ics)
        </a>
      </div>
      <p className="type-small mt-2 max-w-[560px] text-ink-secondary">
        {events.length} industry gatherings across the map. RSVP state is session-local in the
        prototype; attendance networking wires in at cutover.
      </p>
      <div className="mt-6 border border-line">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
