import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { MOCK_MEMBERS } from "@continuum/shared";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

/**
 * P9 — Workspace shell. Clerk-gated in production; when Clerk is not
 * configured the prototype falls back to a DEV-labeled mock member so the
 * surface always renders full.
 */

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

async function identity(): Promise<{ name: string; org: string; dev: boolean }> {
  if (clerkEnabled) {
    const user = await currentUser();
    if (user !== null) {
      return {
        name: user.firstName ?? user.username ?? "Member",
        org: "Signed in via Clerk",
        dev: false,
      };
    }
  }
  const mock = MOCK_MEMBERS[0]!;
  return { name: mock.name, org: mock.organization, dev: true };
}

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const who = await identity();
  return (
    <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <div className="border border-line bg-surface p-3">
          <div className="type-body">{who.name}</div>
          <div className="type-small text-ink-secondary">{who.org}</div>
          {who.dev ? (
            <div className="type-mono mt-2 border border-dashed border-line-strong px-2 py-1 text-ink-muted">
              DEV MODE · MOCK MEMBER (CLERK UNSET)
            </div>
          ) : null}
        </div>
        <nav className="mt-4 border border-line bg-surface">
          {[
            ["Dashboard", "/v2/workspace"],
            ["Watchlists", "/v2/workspace/watchlists"],
            ["Saved queries", "/v2/workspace/queries"],
            ["Settings", "/v2/workspace/settings"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href!}
              className="type-small block border-b border-line px-3 py-2 text-ink-secondary transition-colors last:border-b-0 hover:bg-muted/50 hover:text-ink"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
