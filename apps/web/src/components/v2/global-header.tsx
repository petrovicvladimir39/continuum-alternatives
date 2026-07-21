"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { V2_TOP_NAV, type V2NavItem } from "@/lib/v2/nav";
import { v2ClassBySlug } from "@/lib/v2/taxonomy";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme";

/**
 * GlobalHeader — fixed 40px sticky utility bar. Monochrome mark + wordmark
 * left; center nav with hairline dropdowns (Markets ▾ lists all NINE asset
 * classes); ⌘K, theme, Subscribe (solid, sharp), Sign In (ghost) right.
 */

function Mark() {
  // Monochrome mark: two offset squares — continuum, not a logo library.
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="7" width="8" height="8" fill="currentColor" />
    </svg>
  );
}

function DropdownPanel({ items, marketsAccent }: { items: V2NavItem[]; marketsAccent?: boolean }) {
  return (
    <div className="invisible absolute left-1/2 top-full z-50 w-[300px] -translate-x-1/2 border border-line bg-popover opacity-0 transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      {items.map((item) => {
        const cls = marketsAccent === true ? v2ClassBySlug(item.href.split("/").pop() ?? "") : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted ${
              cls !== null ? cls.accent.left : ""
            }`}
          >
            <span className="type-body flex items-baseline justify-between text-ink">
              {item.label}
              {item.preview === true ? (
                <span className="type-mono text-ink-muted">PREVIEW</span>
              ) : null}
            </span>
            {item.hint !== undefined ? (
              <span className="type-small mt-0.5 block text-ink-muted">{item.hint}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function GlobalHeader() {
  const pathname = usePathname();
  const { open, setOpen } = useCommandPalette();

  return (
    <>
      <header className="sticky top-0 z-50 h-10 border-b border-line bg-ground">
        <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4">
          <Link href="/v2" className="flex items-center gap-2 text-ink transition-colors hover:text-ink-secondary">
            <Mark />
            <span className="type-label text-ink">Continuum Alternatives</span>
          </Link>

          <nav className="hidden h-full items-stretch lg:flex" aria-label="Primary">
            {V2_TOP_NAV.map((item) => {
              const active =
                item.label === "News"
                  ? pathname === "/v2" || pathname.startsWith("/v2/news")
                  : pathname.startsWith(item.href.split("#")[0]!) ||
                    (item.children !== undefined &&
                      item.children.some((c) => pathname.startsWith(c.href)));
              return (
                <div key={item.label} className="group relative flex items-stretch">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1 px-3 text-[12px] font-medium tracking-[0.02em] transition-colors ${
                      active ? "text-ink" : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {item.label}
                    {item.children !== undefined ? (
                      <span aria-hidden="true" className="text-[9px] text-ink-muted">
                        ▾
                      </span>
                    ) : null}
                  </Link>
                  {item.children !== undefined ? (
                    <DropdownPanel items={item.children} marketsAccent={item.label === "Markets"} />
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 border border-line px-2 py-1 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Open command palette"
            >
              <Search size={12} strokeWidth={1.5} />
              <span className="type-mono">⌘K</span>
            </button>
            <ThemeToggle className="hidden md:block" />
            <Link
              href="/v2/about#pricing"
              className="type-label bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:opacity-90"
            >
              Subscribe
            </Link>
            <Link
              href="/v2/workspace"
              className="type-label hidden px-2 py-1.5 text-ink-secondary transition-colors hover:text-ink md:block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>
      <CommandPalette open={open} setOpen={setOpen} />
    </>
  );
}
