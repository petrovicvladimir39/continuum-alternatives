import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { assetClassBySlug, canGenerateBrief } from "@continuum/shared";
import { eventBySlug, getMemberByClerkId, resolveMemberTier } from "@continuum/db";
import { AttendanceModule } from "@/components/attendance-module";
import { DiscussionSection } from "@/components/discussion-section";
import { Tag } from "@/components/ui/tag";
import { WatchBand } from "@/components/watch-band";
import { countryName, SITE_ORIGIN } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  in_person: "in person",
  online: "online",
  hybrid: "hybrid",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await eventBySlug(slug);
  if (event === null) {
    return { title: "Event" };
  }
  return {
    title: event.name,
    description: `${event.name} — ${event.startsOn}${event.city !== null ? `, ${event.city}` : ""}. On the European alternative-assets calendar.`,
    alternates: { canonical: `${SITE_ORIGIN}/events/${slug}` },
  };
}

/**
 * Event entity page (Phase 31B) — the profile pattern for kind 'event':
 * header with prominent dates, the attendance module (31C), meeting prep
 * (31D, founding), and the discussion thread on the 'event' anchor.
 */
export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cr?: string }>;
}) {
  const { slug } = await params;
  const { cr } = await searchParams;
  const event = await eventBySlug(slug);
  if (event === null) {
    notFound();
  }
  const backPath = `/events/${slug}`;

  let prepAllowed = false;
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    const member = userId === null ? null : await getMemberByClerkId(userId);
    prepAllowed = member !== null && canGenerateBrief(await resolveMemberTier(member.id));
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.startsOn,
    endDate: event.endsOn,
    eventAttendanceMode:
      event.format === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    ...(event.city !== null || event.country !== null
      ? {
          location: {
            "@type": "Place",
            name: event.venue ?? event.city ?? countryName(event.country) ?? "",
            address: [event.city, countryName(event.country)].filter(Boolean).join(", "),
          },
        }
      : {}),
    ...(event.url !== null ? { url: event.url } : {}),
  };

  return (
    <article className="max-w-3xl py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="mb-4 text-[13px]">
        <Link href="/events" className="text-accent hover:underline">
          ← Events
        </Link>
      </p>

      <header>
        <h1 className="type-h1">{event.name}</h1>
        <p className="type-data mt-2 text-[15px] text-ink">
          {event.startsOn}
          {event.endsOn !== event.startsOn ? ` → ${event.endsOn}` : ""}
          {event.expected ? (
            <span className="text-ink-muted"> · dates expected, not yet confirmed</span>
          ) : null}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Tag variant="neutral">{FORMAT_LABELS[event.format] ?? event.format}</Tag>
          {event.classes.map((slug_) => (
            <Tag key={slug_} variant="neutral">
              {assetClassBySlug(slug_)?.label ?? slug_}
            </Tag>
          ))}
          {[event.venue, event.city, countryName(event.country)].filter(Boolean).length > 0 ? (
            <span className="type-label">
              {[event.venue, event.city, countryName(event.country)].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {event.url !== null ? (
            <a
              href={event.url}
              rel="noopener noreferrer"
              className="type-small text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
            >
              official site ↗
            </a>
          ) : null}
          <WatchBand entityId={event.entityId} backPath={backPath} />
        </div>
      </header>

      <AttendanceModule
        eventEntityId={event.entityId}
        backPath={backPath}
        contactLimitHit={cr === "limit"}
      />

      {prepAllowed ? (
        <section className="mt-10">
          <h2 className="type-h2">Meeting prep</h2>
          <p className="mt-2 max-w-xl text-[13px] text-ink-secondary">
            Briefs on ORGANIZATIONS in the record — the firms behind the attendee list, or any
            entity you expect to meet. Never about people.
          </p>
          <p className="mt-2 text-[13px]">
            <Link href={`/events/${slug}/prep`} className="text-accent hover:underline">
              Prepare briefs →
            </Link>
          </p>
        </section>
      ) : null}

      <DiscussionSection anchorKind="event" anchorId={event.entityId} backPath={backPath} />
    </article>
  );
}
