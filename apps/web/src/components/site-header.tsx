"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TREE, type NavLeaf } from "@continuum/shared";
import { QuickSearch } from "@/components/quick-search";

/**
 * Site IA (Phase 25A): wordmark left · primary nav tree with CSS-only
 * dropdowns (native details/summary — no JS libraries, hairline-bordered
 * panels) · quiet identity right. Mobile: the bar wraps and open panels
 * render as plain full-width lists — no hamburger theatrics.
 *
 * Identity (Phase 24D): signed-out shows only a quiet "Sign in" text link
 * (nothing when Clerk is unconfigured); signed-in shows the display name.
 */
export type HeaderIdentity =
  | { status: "off" }
  | { status: "anon" }
  | { status: "signed_in"; name: string };

export function SiteHeader({
  identity = { status: "off" },
  marketExtras = [],
}: {
  identity?: HeaderIdentity;
  /** Coverage-gated taxonomy fronts appended to Markets ▾ (Phase 26C). */
  marketExtras?: NavLeaf[];
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const leafClass = (href: string) =>
    `whitespace-nowrap border-b pb-0.5 text-[13px] ${
      isActive(href)
        ? "border-ink font-medium text-ink"
        : "border-transparent text-ink-secondary hover:text-accent"
    }`;

  return (
    <header className="border-b border-line bg-ground">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2.5 sm:h-[52px] sm:flex-nowrap sm:py-0">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
          <span className="font-serif text-[18px] font-medium text-ink">Continuum</span>
          <span className="text-[15px] text-ink-secondary">Alternatives</span>
        </Link>
        <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1 sm:flex-nowrap">
          {NAV_TREE.map((node) =>
            "items" in node ? (
              // key includes pathname so navigation re-renders (and closes) panels.
              <details key={`${node.label}-${pathname}`} className="relative">
                <summary
                  className={`cursor-pointer list-none whitespace-nowrap border-b border-transparent pb-0.5 text-[13px] marker:hidden ${
                    node.items.some((item) => isActive(item.href))
                      ? "font-medium text-ink"
                      : "text-ink-secondary hover:text-accent"
                  } [&::-webkit-details-marker]:hidden`}
                >
                  {node.label} <span className="text-[10px] text-ink-muted">▾</span>
                </summary>
                <div className="left-0 top-full z-50 mt-1 w-full border border-line bg-surface py-1 sm:absolute sm:w-auto sm:min-w-[230px]">
                  {(node.label === "Markets" ? [...node.items, ...marketExtras] : node.items).map((item) => (
                    <Link
                      key={`${node.label}:${item.href}`}
                      href={item.href}
                      className={`block whitespace-nowrap px-3 py-1.5 text-[13px] ${
                        isActive(item.href)
                          ? "font-medium text-ink"
                          : "text-ink-secondary hover:bg-ground hover:text-accent"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link key={node.href} href={node.href} className={leafClass(node.href)}>
                {node.label}
              </Link>
            ),
          )}
        </nav>
        <QuickSearch />
        {identity.status === "signed_in" ? (
          <Link
            href="/account"
            className="shrink-0 whitespace-nowrap text-[13px] text-ink-secondary hover:text-accent"
          >
            {identity.name}
          </Link>
        ) : identity.status === "anon" ? (
          <Link
            href="/sign-in"
            className="shrink-0 whitespace-nowrap text-[13px] text-ink-muted hover:text-accent"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </header>
  );
}
