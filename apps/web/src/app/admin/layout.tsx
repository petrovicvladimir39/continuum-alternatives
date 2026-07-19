import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const navLinkClass = "block px-2 py-1.5 text-[13px] text-ink-secondary hover:text-accent";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-1">
      <aside className="w-[200px] shrink-0 border-r border-line px-4 py-6">
        <div className="type-label mb-3 px-2">Admin</div>
        <nav>
          <Link href="/admin/entities" className={navLinkClass}>
            Entities
          </Link>
          <Link href="/admin/edges" className={navLinkClass}>
            Edges
          </Link>
          <Link href="/admin/timeline" className={navLinkClass}>
            Timeline
          </Link>
          <Link href="/admin/review" className={navLinkClass}>
            Review
          </Link>
          <Link href="/admin/sources" className={navLinkClass}>
            Sources
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-6 py-6">{children}</div>
    </div>
  );
}
