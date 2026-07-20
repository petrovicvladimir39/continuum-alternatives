import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  attendanceCounts,
  getMemberByClerkId,
  myAttendance,
  outgoingRequestTargets,
  visibleAttendees,
  CONTACT_REQUESTS_PER_DAY,
} from "@continuum/db";
import { Button } from "@/components/ui/button";
import {
  sendContactRequestAction,
  setAttendanceAction,
  setVisibilityAction,
} from "@/lib/attendance-actions";

/**
 * Attendance module (Phase 31C) — consent-first. Visibility is OPT-IN,
 * default OFF, and only the member flips it: nobody appears on an attendee
 * list because they clicked "attending". Aggregate counts always render
 * (they identify nobody); names are visible rows only. Contact requests run
 * visible→visible — you show yourself to ask others who did the same.
 */
export async function AttendanceModule({
  eventEntityId,
  backPath,
  contactLimitHit,
}: {
  eventEntityId: string;
  backPath: string;
  /** ?cr=limit — the rate-limit redirect landed here. */
  contactLimitHit: boolean;
}) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  const [counts, attendees] = await Promise.all([
    attendanceCounts(eventEntityId),
    visibleAttendees(eventEntityId),
  ]);

  let memberId: string | null = null;
  let mine: Awaited<ReturnType<typeof myAttendance>> = null;
  let requested = new Set<string>();
  if (clerkEnabled) {
    const { userId } = await auth();
    if (userId !== null) {
      const member = await getMemberByClerkId(userId);
      if (member !== null) {
        memberId = member.id;
        mine = await myAttendance(member.id, eventEntityId);
        requested = await outgoingRequestTargets(member.id, eventEntityId);
      }
    }
  }
  const viewerVisible = mine?.visible === true;
  const total = counts.attending + counts.interested;

  return (
    <section className="mt-10" id="attendance">
      <h2 className="type-h2">Attendance</h2>
      {total > 0 ? (
        <p className="type-data mt-2 text-[13px] text-ink-secondary">
          {counts.attending} attending · {counts.interested} interested
        </p>
      ) : null}

      {clerkEnabled && memberId === null ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          <Link href="/sign-in" className="hover:text-accent">
            Sign in
          </Link>{" "}
          to set your attendance.
        </p>
      ) : null}

      {memberId !== null ? (
        <div className="mt-3 border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["attending", "Attending"],
                ["interested", "Interested"],
              ] as const
            ).map(([value, label]) => (
              <form key={value} action={setAttendanceAction}>
                <input type="hidden" name="eventEntityId" value={eventEntityId} />
                <input type="hidden" name="backPath" value={backPath} />
                {/* Clicking your current status clears it. */}
                <input type="hidden" name="status" value={mine?.status === value ? "" : value} />
                <button
                  type="submit"
                  className={`rounded-sm border px-2.5 py-1 text-[12px] font-medium ${
                    mine?.status === value
                      ? "border-line-strong text-ink"
                      : "border-line text-ink-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {label}
                </button>
              </form>
            ))}
          </div>
          {mine !== null ? (
            <form action={setVisibilityAction} className="mt-2.5">
              <input type="hidden" name="eventEntityId" value={eventEntityId} />
              <input type="hidden" name="backPath" value={backPath} />
              <input type="hidden" name="visible" value={mine.visible ? "0" : "1"} />
              <button type="submit" className="flex items-baseline gap-1.5 text-[13px] text-ink-secondary hover:text-accent">
                <span
                  aria-hidden
                  className={`inline-block h-3 w-3 translate-y-[1px] border ${
                    mine.visible ? "border-accent bg-accent" : "border-line-strong"
                  }`}
                />
                Show me on the attendee list
              </button>
              <p className="type-small mt-1 text-ink-muted">
                Off by default — only you can put your name here. Visible members can send each
                other contact requests.
              </p>
            </form>
          ) : null}
        </div>
      ) : null}

      {attendees.length > 0 ? (
        <div className="mt-4">
          <h3 className="type-label">On the list</h3>
          {contactLimitHit ? (
            <p className="mt-1 text-[12px] text-ink-secondary">
              Contact-request limit reached — {CONTACT_REQUESTS_PER_DAY} per day.
            </p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {attendees.map((attendee) => {
              const line = [attendee.roleTitle, attendee.organization]
                .filter((part) => part !== null && part !== "")
                .join(" · ");
              const isSelf = attendee.memberId === memberId;
              const alreadyRequested = requested.has(attendee.memberId);
              return (
                <li key={attendee.memberId} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                  <span className="font-medium text-ink">{attendee.name}</span>
                  {line !== "" ? <span className="text-ink-muted">{line}</span> : null}
                  <span className="type-small text-ink-muted">{attendee.status}</span>
                  {viewerVisible && !isSelf ? (
                    alreadyRequested ? (
                      <span className="type-small text-ink-muted">requested</span>
                    ) : (
                      <details className="inline">
                        <summary className="cursor-pointer list-none text-[12px] text-accent hover:underline [&::-webkit-details-marker]:hidden">
                          request contact
                        </summary>
                        <form action={sendContactRequestAction} className="mt-1.5 flex max-w-md flex-wrap items-end gap-2">
                          <input type="hidden" name="toMemberId" value={attendee.memberId} />
                          <input type="hidden" name="eventEntityId" value={eventEntityId} />
                          <input type="hidden" name="backPath" value={backPath} />
                          <input
                            name="message"
                            maxLength={280}
                            placeholder="Optional note (280 chars)"
                            className="min-w-[220px] flex-1 border border-line bg-surface px-2 py-1 text-[12px] outline-none focus:border-line-strong"
                          />
                          <Button type="submit" variant="ghost">
                            Send
                          </Button>
                        </form>
                      </details>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
          {memberId !== null && !viewerVisible ? (
            <p className="type-small mt-2 text-ink-muted">
              Contact requests are between listed members — show yourself on the list to send one.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
