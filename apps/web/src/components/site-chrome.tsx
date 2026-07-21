import type { ReactNode } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  classifiedLabel,
  frontHrefFor,
  meetsCoverageThreshold,
  VERTICALS,
  type NavLeaf,
} from "@continuum/shared";
import { getMemberByClerkId, strategyCoverage, unseenOutboxCount } from "@continuum/db";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type HeaderIdentity } from "@/components/site-header";

/**
 * FRONTEND-V2 structural extraction: the production header/footer chrome that
 * used to live in the ROOT layout, moved verbatim into a shared server
 * component so the (v2) route group can render its own shell. Used by the
 * (site), admin and ecosystem layouts — rendered output is unchanged.
 */

/**
 * Coverage-gated Markets ▾ extras (Phase 26C): taxonomy strategies above
 * the render threshold whose front is NOT one of the curated six join the
 * dropdown dynamically. Below threshold they exist only on /coverage.
 */
async function marketExtras(): Promise<NavLeaf[]> {
  try {
    const coverage = await strategyCoverage();
    const curatedHrefs = new Set(VERTICALS.map((v) => `/markets/${v.slug}`));
    const extras: NavLeaf[] = [];
    for (const row of coverage) {
      if (!meetsCoverageThreshold(row)) {
        continue;
      }
      const href = frontHrefFor(row.assetClass, row.strategy);
      if (curatedHrefs.has(href) || extras.some((e) => e.href === href)) {
        continue;
      }
      extras.push({ label: classifiedLabel(row.assetClass, row.strategy), href });
    }
    return extras.sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

// Clerk is active only when both keys exist (Phase 24A). Without them the
// public site runs untouched and /admin + /account 404 in the middleware.
const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

async function headerIdentity(): Promise<HeaderIdentity> {
  if (!clerkEnabled) {
    return { status: "off" };
  }
  const { userId } = await auth();
  if (userId === null) {
    return { status: "anon" };
  }
  const user = await currentUser();
  const name =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Account";
  // Phase 28D: unseen-updates count — a quiet number beside the name, never
  // a badge bubble.
  let unseen = 0;
  try {
    const member = await getMemberByClerkId(userId);
    if (member !== null) {
      unseen = await unseenOutboxCount(member.id);
    }
  } catch {
    unseen = 0;
  }
  return { status: "signed_in", name, unseen };
}

export async function SiteChrome({ children }: { children: ReactNode }) {
  const [identity, extras] = await Promise.all([headerIdentity(), marketExtras()]);
  return (
    <>
      <SiteHeader identity={identity} marketExtras={extras} />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
