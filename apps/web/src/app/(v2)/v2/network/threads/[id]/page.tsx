import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMockThreads } from "@continuum/shared";
import { ThreadCard } from "@/components/v2/network/thread-feed";

export const metadata: Metadata = { title: "Thread — Network" };

/**
 * Thread detail. Threads regenerate deterministically (content stable,
 * timestamps relative), so ids resolve on every render without a store.
 */
export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = buildMockThreads().find((t) => t.id === id);
  if (thread === undefined) {
    notFound();
  }
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-8">
      <Link href="/v2/network" className="type-label text-ink-secondary transition-colors hover:text-ink">
        ← Network & Threads
      </Link>
      <div className="mt-4 border border-line">
        <ThreadCard thread={thread} detail />
      </div>
      <div className="type-mono mt-4 text-ink-muted">
        REPLIES ARE MOCK · THE COMPOSER ON THE FEED POSTS SESSION-LOCALLY
      </div>
    </div>
  );
}
