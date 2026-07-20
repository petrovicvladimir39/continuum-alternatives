import type { Metadata } from "next";
import Link from "next/link";
import { assetClassBySlug } from "@continuum/shared";
import {
  eventFilterOptions,
  listPastEvents,
  listUpcomingEvents,
  type EventFilters,
} from "@continuum/db";
import { ClassKicker } from "@/components/editorial/class-accent";
import { Tag } from "@/components/ui/tag";
import { countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description:
    "The calendar of European alternative-asset conferences — PE, VC, credit and NPL, real assets — with a subscribable iCal feed.",
};

const FORMAT_LABELS: Record<string, string> = {
  in_person: "in person",
  online: "online",
  hybrid: "hybrid",
};

function eventsHref(
  params: Partial<Record<"tab" | "month" | "country" | "format" | "class", string | undefined>>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  return suffix === "" ? "/events" : `/events?${suffix}`;
}

/**
 * /events (Phase 31B) — Upcoming (soonest first) and Past, filterable, with
 * the subscribable iCal feed. Approved events only; expected dates carry an
 * explicit marker, never silent guesses.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; country?: string; format?: string; class?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "past" ? "past" : "upcoming";
  const filters: EventFilters = {
    ...(params.month ? { month: params.month } : {}),
    ...(params.country ? { country: params.country } : {}),
    ...(params.format ? { format: params.format } : {}),
    ...(params.class ? { assetClass: params.class } : {}),
  };
  const [rows, options] = await Promise.all([
    tab === "past" ? listPastEvents(filters) : listUpcomingEvents(filters),
    eventFilterOptions(),
  ]);
  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="max-w-3xl py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="type-h1">Events</h1>
        <a href="/events/calendar.ics" className="text-[13px] text-accent hover:underline">
          Subscribe (iCal) →
        </a>
      </div>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        European alternative-asset conferences on the record — each one an entity you can watch
        and discuss. Dates marked “expected” follow the event&apos;s annual pattern and await
        confirmation.
      </p>

      <div className="mt-6 flex gap-5 border-b border-line pb-2 text-[13px]">
        <Link
          href={eventsHref({ month: params.month, country: params.country, format: params.format, class: params.class })}
          className={tab === "upcoming" ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}
        >
          Upcoming
        </Link>
        <Link
          href={eventsHref({ ...params, tab: "past" })}
          className={tab === "past" ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}
        >
          Past
        </Link>
      </div>

      {/* Plain GET form — filters in searchParams, no client JS. */}
      <form action="/events" method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {tab === "past" ? <input type="hidden" name="tab" value="past" /> : null}
        <label className="block">
          <span className="type-label">Month</span>
          <select name="month" defaultValue={params.month ?? ""} className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
            <option value="">All months</option>
            {options.months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="type-label">Country</span>
          <select name="country" defaultValue={params.country ?? ""} className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
            <option value="">All countries</option>
            {options.countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="type-label">Format</span>
          <select name="format" defaultValue={params.format ?? ""} className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
            <option value="">All formats</option>
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="type-label">Asset class</span>
          <select name="class" defaultValue={params.class ?? ""} className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
            <option value="">All classes</option>
            {options.classes.map((slug) => (
              <option key={slug} value={slug}>
                {assetClassBySlug(slug)?.label ?? slug}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm border border-line-strong bg-surface px-4 py-1.5 text-[13px] font-medium hover:border-accent hover:text-accent"
        >
          Filter
        </button>
        {hasFilters ? (
          <Link href={eventsHref(tab === "past" ? { tab: "past" } : {})} className="type-small text-ink-muted hover:text-accent">
            Clear
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-8 text-[13px] text-ink-muted">
          {tab === "past" ? "No past events on record." : "No upcoming events match."}
        </p>
      ) : (
        <div className="mt-6">
          {rows.map((event) => (
            <div key={event.entityId} className="border-t border-line py-3.5">
              {event.classes.length > 0 ? (
                <ClassKicker assetClass={event.classes[0]!} strategy={null} />
              ) : null}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="type-data w-[150px] shrink-0 text-ink-muted">
                  {event.startsOn}
                  {event.endsOn !== event.startsOn ? ` → ${event.endsOn}` : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/events/${event.slug}`} className="type-h3 hover:text-accent">
                    {event.name}
                  </Link>
                  <p className="type-small mt-0.5 text-ink-muted">
                    {[event.city, countryName(event.country)].filter(Boolean).join(", ") || "—"}
                    {event.expected ? " · dates expected" : ""}
                  </p>
                </div>
                <Tag variant="neutral">{FORMAT_LABELS[event.format] ?? event.format}</Tag>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
