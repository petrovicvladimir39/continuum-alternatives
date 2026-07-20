import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  listContactRequestsFor,
  listOutbox,
  markOutboxSeen,
  upsertMemberProfile,
} from "@continuum/db";
import { ClassKicker } from "@/components/editorial/class-accent";
import { respondContactAction } from "@/lib/attendance-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What changed",
  robots: { index: false, follow: false },
};

const KIND_LABELS: Record<string, string> = {
  fact: "Signal",
  article: "Article",
  edge: "Relationship",
  view_hit: "Saved view",
  post: "Discussion",
  contact_request: "Contact request",
};

/** "What changed" (Phase 28D) — outbox newest-first; viewing marks seen. */
export default async function UpdatesPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound();
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  const [items, contactRequests] = await Promise.all([
    listOutbox(member.id, { limit: 100 }),
    listContactRequestsFor(member.id),
  ]);
  // Viewing IS the acknowledgment — everything unseen becomes seen now.
  await markOutboxSeen(member.id);
  // Contact-request outbox rows drive the counter/email; the actionable
  // cards render here from their own table (accept/decline lives on them).
  const outboxItems = items.filter((item) => item.kind !== "contact_request");

  return (
    <div className="max-w-2xl py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="type-h1">What changed</h1>
        <Link href="/account/watchlist" className="text-[13px] text-accent hover:underline">
          Watchlist settings →
        </Link>
      </div>

      {contactRequests.length > 0 ? (
        <section className="mt-6">
          <h2 className="type-h2">Contact requests</h2>
          <div className="mt-2 space-y-2">
            {contactRequests.map((request) => (
              <div key={request.id} className="border border-line p-3 text-[13px]">
                <p>
                  <span className="font-medium">{request.counterpartName}</span>
                  {request.counterpartLine !== null ? (
                    <span className="text-ink-muted"> · {request.counterpartLine}</span>
                  ) : null}
                  <span className="type-small text-ink-muted">
                    {" "}
                    · {request.direction === "incoming" ? "wants to connect at" : "your request for"}{" "}
                    <Link href={`/events/${request.eventSlug}`} className="text-accent hover:underline">
                      {request.eventName}
                    </Link>
                  </span>
                </p>
                {request.message !== null ? (
                  <p className="mt-1 border-l-2 border-line pl-2 text-ink-secondary">{request.message}</p>
                ) : null}
                {request.direction === "incoming" && request.status === "pending" ? (
                  <div className="mt-2 flex gap-3">
                    {(
                      [
                        ["accept", "Accept — share emails"],
                        ["decline", "Decline"],
                      ] as const
                    ).map(([decision, label]) => (
                      <form key={decision} action={respondContactAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value={decision} />
                        <button
                          type="submit"
                          className={`text-[12px] font-medium hover:underline ${
                            decision === "accept" ? "text-accent" : "text-ink-muted"
                          }`}
                        >
                          {label}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : request.status === "accepted" ? (
                  <p className="mt-1.5 text-[13px] text-ink-secondary">
                    Accepted — reach {request.counterpartName} at{" "}
                    {request.counterpartEmail !== null ? (
                      <a href={`mailto:${request.counterpartEmail}`} className="type-data text-accent hover:underline">
                        {request.counterpartEmail}
                      </a>
                    ) : (
                      "their email (not on file)"
                    )}
                    . {/* Email is where professionals talk — no in-app inbox. */}
                  </p>
                ) : request.direction === "incoming" && request.status === "declined" ? (
                  <p className="type-small mt-1 text-ink-muted">Declined — the sender was not notified.</p>
                ) : request.status === "pending" ? (
                  <p className="type-small mt-1 text-ink-muted">Pending.</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {outboxItems.length === 0 && contactRequests.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-muted">
          Nothing yet. Watch entities or enable saved-view alerts; changes land here and in your
          daily email.
        </p>
      ) : (
        <div className="mt-6">
          {outboxItems.map((item) => (
            <div
              key={item.id}
              className={`border-t border-line py-3 ${item.seenAt === null ? "" : "opacity-80"}`}
            >
              <ClassKicker assetClass={item.assetClass} strategy={item.strategy} />
              <p className="mt-0.5 text-[14px] font-medium leading-[1.4]">
                {item.href !== null ? (
                  <Link href={item.href} className="hover:text-accent">
                    {item.title ?? item.entityName ?? "Update"}
                  </Link>
                ) : (
                  (item.title ?? item.entityName ?? "Update")
                )}
              </p>
              <p className="type-small mt-0.5 text-ink-muted">
                {KIND_LABELS[item.kind] ?? item.kind}
                {item.entityName !== null ? ` · ${item.entityName}` : ""}
                {item.createdAt !== null ? ` · ${item.createdAt.toISOString().slice(0, 10)}` : ""}
                {item.sentAt === null ? " · pending email" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
