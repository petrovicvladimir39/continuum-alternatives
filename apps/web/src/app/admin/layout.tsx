import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { anomalies, db, edges, eq, sql, timelineFacts } from "@continuum/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const navLinkClass = "block px-2 py-1.5 text-[13px] text-ink-secondary hover:text-accent";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [factCount, edgeCount, anomalyCount] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(timelineFacts)
      .where(eq(timelineFacts.status, "proposed")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(edges)
      .where(eq(edges.status, "proposed")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(anomalies)
      .where(eq(anomalies.status, "new")),
  ]);
  const pending = (factCount[0]?.n ?? 0) + (edgeCount[0]?.n ?? 0);
  const newAnomalies = anomalyCount[0]?.n ?? 0;

  return (
    <div className="flex w-full flex-1">
      <aside className="w-[200px] shrink-0 border-r border-line px-4 py-6">
        <div className="type-label mb-3 px-2">Admin</div>
        <nav>
          <Link href="/admin/universe" className={navLinkClass}>
            Universe
          </Link>
          <Link href="/admin/entities" className={navLinkClass}>
            Entities
          </Link>
          <Link href="/admin/edges" className={navLinkClass}>
            Edges
          </Link>
          <Link href="/admin/timeline" className={navLinkClass}>
            Timeline
          </Link>
          <Link
            href="/admin/review"
            className={`${navLinkClass} flex items-baseline justify-between`}
          >
            <span>Review</span>
            {pending > 0 ? <span className="type-data text-ink-muted">{pending}</span> : null}
          </Link>
          <Link href="/admin/sources" className={navLinkClass}>
            Sources
          </Link>
          <Link href="/admin/documents" className={navLinkClass}>
            Documents
          </Link>
          <Link href="/admin/digests" className={navLinkClass}>
            Digests
          </Link>
          <Link href="/admin/contacts" className={navLinkClass}>
            Contacts
          </Link>
          <Link
            href="/admin/anomalies"
            className={`${navLinkClass} flex items-baseline justify-between`}
          >
            <span>Anomalies</span>
            {newAnomalies > 0 ? (
              <span className="type-data text-ink-muted">{newAnomalies}</span>
            ) : null}
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-6 py-6">{children}</div>
    </div>
  );
}
