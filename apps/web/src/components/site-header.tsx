"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@continuum/shared";

/**
 * Site IA (Phase 19): wordmark left · primary nav with active-state underline
 * (1px, per styleguide — elevation and emphasis by hairline only) · Search as
 * an icon-free right-aligned input-shaped link.
 *
 * Identity (Phase 24D): deliberately quiet on a public news site — signed-out
 * shows only a right-aligned "Sign in" text link (nothing when Clerk is not
 * configured); signed-in shows the display name linking to /account.
 */
export type HeaderIdentity =
  | { status: "off" }
  | { status: "anon" }
  | { status: "signed_in"; name: string };

export function SiteHeader({ identity = { status: "off" } }: { identity?: HeaderIdentity }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ||
    (href === "/feed" && pathname === "/feed");

  return (
    <header className="border-b border-line bg-ground">
      <div className="mx-auto flex h-[52px] max-w-[1200px] items-center gap-8 px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
          <span className="font-serif text-[18px] font-medium text-ink">Continuum</span>
          <span className="text-[15px] text-ink-secondary">Alternatives</span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap border-b pb-0.5 text-[13px] ${
                isActive(item.href)
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-secondary hover:text-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/search"
          className="hidden shrink-0 rounded-sm border border-line bg-surface px-3 py-1 text-[13px] text-ink-muted hover:border-accent hover:text-accent sm:block"
        >
          Search…
        </Link>
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
