"use client";

import { useState } from "react";
import type { MockEvent } from "@continuum/shared";
import { fmtDate } from "@/lib/v2/format";

const FORMAT_LABEL: Record<string, string> = {
  conference: "CONFERENCE",
  roundtable: "ROUNDTABLE",
  dinner: "DINNER",
  summit: "SUMMIT",
  webinar: "WEBINAR",
};

/** Event row with a session-local RSVP toggle (real RSVPs at cutover). */
export function EventCard({ event }: { event: MockEvent }) {
  const [going, setGoing] = useState(false);
  return (
    <div className="border-b border-line bg-surface px-4 py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="type-h3 min-w-0">{event.name}</h3>
        <span className="type-mono shrink-0 text-ink-muted">{FORMAT_LABEL[event.format]}</span>
      </div>
      <div className="type-data mt-0.5 text-ink-secondary">
        {fmtDate(event.startsOn)} · {event.city}, {event.country}
      </div>
      <p className="type-small mt-1.5 max-w-[640px] text-ink-secondary">{event.description}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setGoing((v) => !v)}
          className={`type-label cursor-pointer border px-2.5 py-1 transition-colors ${
            going ? "border-ink text-ink" : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
          }`}
        >
          {going ? "RSVP’d ✓" : "RSVP"}
        </button>
        <span className="type-data text-ink-muted">{event.rsvpCount + (going ? 1 : 0)} attending</span>
      </div>
    </div>
  );
}
