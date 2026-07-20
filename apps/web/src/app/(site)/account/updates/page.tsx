import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  listOutbox,
  markOutboxSeen,
  upsertMemberProfile,
} from "@continuum/db";
import { ClassKicker } from "@/components/editorial/class-accent";

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
  const items = await listOutbox(member.id, { limit: 100 });
  // Viewing IS the acknowledgment — everything unseen becomes seen now.
  await markOutboxSeen(member.id);

  return (
    <div className="max-w-2xl py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="type-h1">What changed</h1>
        <Link href="/account/watchlist" className="text-[13px] text-accent hover:underline">
          Watchlist settings →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-muted">
          Nothing yet. Watch entities or enable saved-view alerts; changes land here and in your
          daily email.
        </p>
      ) : (
        <div className="mt-6">
          {items.map((item) => (
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
