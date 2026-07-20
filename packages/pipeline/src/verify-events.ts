import "./env";
import { buildIcsCalendar, exclusiveEnd, parseIcsCalendar } from "@continuum/shared";
import {
  attendanceCounts,
  contactRequestsToday,
  createContactRequest,
  db,
  eventBySlug,
  eventFilterOptions,
  importEvent,
  isVisibleAttendee,
  listContactRequestsFor,
  listOutbox,
  listPastEvents,
  listProvisionalEvents,
  listUpcomingEvents,
  approveEvent,
  rejectEvent,
  resolveOrganizationByName,
  respondContactRequest,
  setAttendance,
  setAttendanceVisibility,
  sql,
  upsertMemberProfile,
  visibleAttendees,
} from "@continuum/db";
import {
  parseCsv,
  parseEventDateRange,
  parseSmithNovak,
  parseTmaEurope,
  rowToImport,
} from "./events-parse";

/**
 * Verify: Phase 31 — events + attendance + contact. CSV validation +
 * expected flag, iCal round-trip, visibility matrix (opt-in enforced),
 * pair uniqueness + rate limit + silent decline, prep org-only rule,
 * upcoming/past boundary.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_events_";
const SLUG = "verify-events-fx-";

async function cleanup(): Promise<void> {
  await db.execute(sql`
    DELETE FROM alert_outbox WHERE kind = 'contact_request' AND ref_id IN
      (SELECT id FROM contact_requests WHERE event_entity_id IN
        (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"}))
  `);
  await db.execute(sql`
    DELETE FROM contact_requests WHERE event_entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM event_attendance WHERE event_entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM entity_classifications WHERE entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM events WHERE entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM people WHERE entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
}

function futureDate(daysAhead: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  await cleanup();

  console.log("— date-range parser —");
  check(
    JSON.stringify(parseEventDateRange("29-30 September 2026")) ===
      JSON.stringify({ startsOn: "2026-09-29", endsOn: "2026-09-30" }),
    "same-month range",
  );
  check(
    JSON.stringify(parseEventDateRange("24 November 2026")) ===
      JSON.stringify({ startsOn: "2026-11-24", endsOn: "2026-11-24" }),
    "single day",
  );
  check(
    JSON.stringify(parseEventDateRange("23-24 Sep, 2026")) ===
      JSON.stringify({ startsOn: "2026-09-23", endsOn: "2026-09-24" }),
    "abbreviated month + comma",
  );
  check(
    JSON.stringify(parseEventDateRange("30 September - 2 October 2026")) ===
      JSON.stringify({ startsOn: "2026-09-30", endsOn: "2026-10-02" }),
    "cross-month range",
  );
  check(parseEventDateRange("TBA 2026") === null, "garbage → null, never a guess");

  console.log("\n— site parsers (probe-fixture snippets) —");
  const smithFixture = `<div class="gtitle">NPL Global</div><div class="gclaim">x</div><div class="gdate">London&nbsp; &bull;&nbsp; 29-30 September 2026</div><div><a href="/conferences/npl-global-2026.html" title="See details">`;
  const smith = parseSmithNovak(smithFixture);
  check(smith.cards.length === 1, "smithnovak card parses");
  check(smith.cards[0]!.city === "London" && smith.cards[0]!.country === "GB", "city → country resolved");
  check(smith.cards[0]!.url.startsWith("https://www.smithnovak.com/"), "relative link absolutized");
  const tmaFixture = `class="x event-card__date">23-24 Sep, 2026</div><span class="x event-card__location">Romania</span><h3 class="x event-card__title">Summit &#038; Forum</h3><a href="https://www.tma-europe.org/events/summit/">
    class="x event-card__date">27-30 Oct, 2026</div><span class="x event-card__location">United States</span><h3 class="x event-card__title">US Annual</h3><a href="https://www.tma-europe.org/events/us/">`;
  const tma = parseTmaEurope(tmaFixture);
  check(tma.cards.length === 1, "tma: European card parses");
  check(tma.cards[0]!.name === "Summit & Forum" && tma.cards[0]!.country === "RO", "entities decoded, country mapped");
  check(tma.skipped.some((line) => line.includes("United States")), "non-European location skipped, reported");

  console.log("\n— CSV import validation + expected flag —");
  const csv = parseCsv('a,"b,with comma",c\n"quoted ""x""",y,z\n');
  check(csv.length === 2 && csv[0]![1] === "b,with comma" && csv[1]![0] === 'quoted "x"', "quoted CSV fields parse");
  const badFormat = rowToImport(["X Conf", "2026-09-01", "", "", "", "banquet", "", "https://x.test", "", ""]);
  check("error" in badFormat, "unknown format refused");
  const invalidUrl = await importEvent(
    { name: `${SLUG}nourl`, startsOn: "2026-09-01", endsOn: null, city: null, country: null, format: "in_person", venue: null, url: "not-a-url", classes: [], expected: false },
  );
  check(invalidUrl.outcome === "invalid", "official URL required");
  const invalidClass = await importEvent(
    { name: `${SLUG}badclass`, startsOn: "2026-09-01", endsOn: null, city: null, country: null, format: "in_person", venue: null, url: "https://x.test", classes: ["not_a_class"], expected: false },
  );
  check(invalidClass.outcome === "invalid", "unknown asset class refused");
  const proposed = await importEvent(
    { name: `${SLUG}proposed`, startsOn: futureDate(30), endsOn: futureDate(31), city: "Vienna", country: "AT", format: "in_person", venue: null, url: "https://x.test/e", classes: ["private_equity"], expected: true },
  );
  check(proposed.outcome === "created", "valid row imports");
  const dup = await importEvent(
    { name: `${SLUG}proposed`, startsOn: futureDate(30), endsOn: null, city: null, country: null, format: "in_person", venue: null, url: "https://x.test/e", classes: [], expected: false },
  );
  check(dup.outcome === "duplicate", "same name+year deduplicates by slug");
  const provisional = await listProvisionalEvents();
  const mine = provisional.find((event) => event.slug.startsWith(SLUG + "proposed"));
  check(mine !== undefined && mine.expected, "expected flag lands and surfaces in review");
  check((await listUpcomingEvents()).every((event) => !event.slug.startsWith(SLUG)), "PROPOSED events render nowhere public");

  console.log("\n— review approve/reject —");
  if (proposed.outcome !== "created") {
    throw new Error("fixture import failed");
  }
  await approveEvent(proposed.entityId);
  const approved = await eventBySlug(proposed.slug);
  check(approved !== null, "approve → live on /events");
  check(approved !== null && approved.classes.includes("private_equity"), "approve also approves class rows");
  const toReject = await importEvent(
    { name: `${SLUG}reject`, startsOn: futureDate(40), endsOn: null, city: null, country: null, format: "online", venue: null, url: "https://x.test/r", classes: ["private_credit"], expected: false },
  );
  if (toReject.outcome !== "created") {
    throw new Error("reject fixture failed");
  }
  await rejectEvent(toReject.entityId);
  check((await listProvisionalEvents()).every((event) => event.entityId !== toReject.entityId), "reject deletes the proposal");
  await rejectEvent(proposed.entityId);
  check((await eventBySlug(proposed.slug)) !== null, "reject refuses ACTIVE events (provisional-only)");

  console.log("\n— upcoming/past boundary + filters —");
  const past = await importEvent(
    { name: `${SLUG}past`, startsOn: "2025-03-01", endsOn: "2025-03-02", city: null, country: "DE", format: "in_person", venue: null, url: "https://x.test/p", classes: [], expected: false },
    { approve: true },
  );
  const ongoing = await importEvent(
    { name: `${SLUG}ongoing`, startsOn: futureDate(-1), endsOn: futureDate(1), city: null, country: "FR", format: "hybrid", venue: null, url: "https://x.test/o", classes: [], expected: false },
    { approve: true },
  );
  check(past.outcome === "created" && ongoing.outcome === "created", "boundary fixtures import approved");
  const upcoming = await listUpcomingEvents();
  const pastList = await listPastEvents();
  check(upcoming.some((event) => event.slug.startsWith(SLUG + "ongoing")), "running event is still upcoming-relevant");
  check(!upcoming.some((event) => event.slug.startsWith(SLUG + "past")), "ended event leaves Upcoming");
  check(pastList.some((event) => event.slug.startsWith(SLUG + "past")), "ended event lands in Past");
  check(
    (await listUpcomingEvents({ country: "FR" })).some((event) => event.slug.startsWith(SLUG + "ongoing")) &&
      !(await listUpcomingEvents({ country: "AT" })).some((event) => event.slug.startsWith(SLUG + "ongoing")),
    "country filter",
  );
  check(
    (await listUpcomingEvents({ format: "hybrid" })).some((event) => event.slug.startsWith(SLUG + "ongoing")),
    "format filter",
  );
  const upcomingSorted = upcoming.map((event) => event.startsOn);
  check(
    upcomingSorted.every((date, index) => index === 0 || date >= upcomingSorted[index - 1]!),
    "Upcoming sorts soonest-first",
  );
  const options = await eventFilterOptions();
  check(options.countries.includes("FR") && options.countries.includes("DE"), "filter options carry live countries");
  check(options.months.length > 0, "filter options carry live months");

  console.log("\n— iCal well-formedness (parse round-trip) —");
  const approvedUpcoming = await listUpcomingEvents();
  const ics = buildIcsCalendar(
    approvedUpcoming.map((event) => ({
      uid: event.entityId, name: event.name, startsOn: event.startsOn, endsOn: event.endsOn,
      city: event.city, country: event.country, url: event.url, expected: event.expected,
    })),
    new Date("2026-07-20T12:00:00Z"),
  );
  const parsed = parseIcsCalendar(ics);
  check(parsed.valid, "calendar parses back cleanly (BEGIN/END balanced, required props present)");
  check(parsed.events.length === approvedUpcoming.length, "one VEVENT per approved upcoming event");
  check(
    parsed.events.every((event) => event.uid.endsWith("@continuumalternatives.com")),
    "UIDs are stable entity-id@domain",
  );
  check(exclusiveEnd("2026-09-30") === "2026-10-01", "DTEND is exclusive (+1 day, month rollover)");
  check(exclusiveEnd("2026-12-31") === "2027-01-01", "DTEND exclusive across year end");
  const expectedIcs = buildIcsCalendar(
    [{ uid: "u1", name: "Expected Conf", startsOn: "2027-06-07", endsOn: "2027-06-10", city: null, country: null, url: null, expected: true }],
    new Date("2026-07-20T12:00:00Z"),
  );
  check(expectedIcs.includes("SUMMARY:Expected Conf (dates expected)"), "expected dates say so IN the entry");
  const escaped = buildIcsCalendar(
    [{ uid: "u2", name: "A, B; C", startsOn: "2026-09-01", endsOn: "2026-09-01", city: null, country: null, url: null, expected: false }],
    new Date("2026-07-20T12:00:00Z"),
  );
  check(escaped.includes("SUMMARY:A\\, B\\; C"), "commas/semicolons escaped");

  console.log("\n— attendance visibility matrix (opt-in, hard) —");
  const eventId = ongoing.outcome === "created" ? ongoing.entityId : "";
  const ana = await upsertMemberProfile({ clerkUserId: `${FIX}ana`, email: "ev-a@test.test", displayName: "Ana Fixture" });
  const ben = await upsertMemberProfile({ clerkUserId: `${FIX}ben`, email: "ev-b@test.test", displayName: "Ben Fixture" });
  const cal = await upsertMemberProfile({ clerkUserId: `${FIX}cal`, email: "ev-c@test.test", displayName: "Cal Fixture" });
  await setAttendance(ana.id, eventId, "attending");
  await setAttendance(ben.id, eventId, "attending");
  await setAttendance(cal.id, eventId, "interested");
  const counts = await attendanceCounts(eventId);
  check(counts.attending === 2 && counts.interested === 1, "aggregate counts include EVERYONE");
  check((await visibleAttendees(eventId)).length === 0, "default visibility OFF — named list empty");
  check(!(await isVisibleAttendee(ana.id, eventId)), "contact gate sees ana invisible");
  await setAttendanceVisibility(ana.id, eventId, true);
  await setAttendanceVisibility(ben.id, eventId, true);
  const listed = await visibleAttendees(eventId);
  check(listed.length === 2 && listed.every((row) => row.name.includes("Fixture")), "opt-in members appear with display name");
  check(!listed.some((row) => row.memberId === cal.id), "cal (invisible) stays OFF the list");
  await setAttendance(ana.id, eventId, "interested");
  check((await isVisibleAttendee(ana.id, eventId)), "status switch preserves visibility choice");

  console.log("\n— contact requests: pair uniqueness + rate limit + silent decline —");
  check((await createContactRequest({ fromMemberId: ana.id, toMemberId: ben.id, eventEntityId: eventId, message: "coffee?" })) === "created", "visible→visible request lands");
  check((await createContactRequest({ fromMemberId: ana.id, toMemberId: ben.id, eventEntityId: eventId, message: "again" })) === "duplicate", "one per pair per event — ever");
  check((await contactRequestsToday(ana.id)) === 1, "daily rate-limit counter counts");
  const benInbox = await listOutbox(ben.id, { unsentOnly: true });
  check(benInbox.some((item) => item.kind === "contact_request"), "recipient gets the outbox row");
  const benView = (await listContactRequestsFor(ben.id)).find((row) => row.direction === "incoming");
  check(benView !== undefined && benView.counterpartEmail === null, "NO email revealed while pending");
  // Decline: silent — the sender's outbox stays untouched.
  await respondContactRequest(benView!.id, ben.id, false);
  const anaOutboxAfterDecline = await listOutbox(ana.id, { unsentOnly: true });
  check(!anaOutboxAfterDecline.some((item) => item.kind === "contact_request"), "decline notifies NOBODY (silent)");
  check(
    (await listContactRequestsFor(ana.id)).find((row) => row.direction === "outgoing")?.counterpartEmail === null,
    "declined request reveals nothing",
  );
  // Accept path with a fresh pair: ben → ana.
  check((await createContactRequest({ fromMemberId: ben.id, toMemberId: ana.id, eventEntityId: eventId, message: null })) === "created", "reverse direction is its own pair");
  const anaIncoming = (await listContactRequestsFor(ana.id)).find(
    (row) => row.direction === "incoming" && row.status === "pending",
  );
  await respondContactRequest(anaIncoming!.id, ana.id, true);
  const benAfterAccept = (await listContactRequestsFor(ben.id)).find((row) => row.direction === "outgoing" && row.status === "accepted");
  const anaAfterAccept = (await listContactRequestsFor(ana.id)).find((row) => row.direction === "incoming" && row.status === "accepted");
  check(benAfterAccept?.counterpartEmail === "ev-a@test.test", "acceptance reveals recipient's email to sender");
  check(anaAfterAccept?.counterpartEmail === "ev-b@test.test", "acceptance reveals sender's email to recipient");
  check(
    (await listOutbox(ben.id, { unsentOnly: true })).some((item) => item.kind === "contact_request"),
    "acceptance notifies the sender via outbox",
  );
  check(!(await respondContactRequest(anaIncoming!.id, ana.id, false)), "responses are final (pending-only)");
  check(!(await respondContactRequest(benView!.id, cal.id, true)), "only the recipient can respond");

  console.log("\n— prep-brief org-only rule —");
  const orgFx = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Events Org Fixture', ${SLUG + "org"}, 'active') RETURNING id
  `);
  await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('person', 'Verify Events Person Fixture', ${SLUG + "person"}, 'active')
  `);
  const orgHit = await resolveOrganizationByName("Verify Events Org Fixture");
  check(orgHit !== null && orgHit.id === String(orgFx.rows[0]!.id), "stated org resolves to the corpus entity");
  check((await resolveOrganizationByName("Verify Events Person Fixture")) === null, "PEOPLE never resolve — briefs are org-only");
  check((await resolveOrganizationByName("Nonexistent Firm XYZ")) === null, "no match → honest null (no fuzzy guess)");

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-events: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-events: PASS — events + attendance + contact green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});
