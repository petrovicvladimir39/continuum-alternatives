"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { MOCK_ENTITIES } from "@continuum/shared";
import {
  V2_MARKETS_NAV,
  V2_PRODUCTS_NAV,
  V2_SOLUTIONS_NAV,
  V2_TOP_NAV,
} from "@/lib/v2/nav";
import { v2Accent } from "@/lib/v2/taxonomy";

/**
 * ⌘K command palette (cmdk) — navigation + entity search against the mock
 * layer. Entities route into the Company Intelligence screener pre-filtered
 * by name; real-data cutover swaps MOCK_ENTITIES for the quick-search API.
 */

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router, setOpen],
  );

  const entityMatches = useMemo(() => {
    if (query.trim().length < 2) {
      return [];
    }
    const q = query.trim().toLowerCase();
    return MOCK_ENTITIES.filter(
      (e) => e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-[560px] border border-line-strong bg-popover text-popover-foreground"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <Command label="Command palette" shouldFilter={true} loop>
          <div className="border-b border-line">
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search entities, markets, products…"
              className="type-body w-full bg-transparent px-4 py-3 outline-none placeholder:text-ink-muted"
            />
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto p-2">
            <Command.Empty>
              <div className="terminal-empty m-2">[ 0 MATCHES IN COMMAND INDEX ]</div>
            </Command.Empty>

            {entityMatches.length > 0 ? (
              <Command.Group
                heading={<GroupHeading>Entities</GroupHeading>}
              >
                {entityMatches.map((e) => {
                  const accent = v2Accent(e.assetClass, null);
                  return (
                    <Command.Item
                      key={e.id}
                      value={`entity ${e.name} ${e.city}`}
                      onSelect={() =>
                        go(`/v2/products/company-intelligence?q=${encodeURIComponent(e.name)}`)
                      }
                      className="group flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 data-[selected=true]:bg-muted"
                    >
                      <span className="type-body flex items-baseline gap-2">
                        <span className={`inline-block h-2.5 w-2.5 self-center ${accent?.swatch ?? "bg-line"}`} />
                        {e.name}
                      </span>
                      <span className="type-small text-ink-muted">
                        {e.city} · {e.country}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ) : null}

            <Command.Group heading={<GroupHeading>Go to</GroupHeading>}>
              {V2_TOP_NAV.map((item) => (
                <PaletteLink key={item.href} label={item.label} href={item.href} go={go} />
              ))}
              <PaletteLink label="Coverage grid" href="/v2/coverage" go={go} />
              <PaletteLink label="Styleguide" href="/v2/styleguide" go={go} />
              <PaletteLink label="Workspace" href="/v2/workspace" go={go} />
            </Command.Group>

            <Command.Group heading={<GroupHeading>Markets</GroupHeading>}>
              {V2_MARKETS_NAV.map((m) => (
                <PaletteLink key={m.href} label={m.label} href={m.href} go={go} />
              ))}
            </Command.Group>

            <Command.Group heading={<GroupHeading>Products</GroupHeading>}>
              {V2_PRODUCTS_NAV.map((p) => (
                <PaletteLink
                  key={p.href}
                  label={p.preview === true ? `${p.label} (preview)` : p.label}
                  href={p.href}
                  go={go}
                />
              ))}
            </Command.Group>

            <Command.Group heading={<GroupHeading>Solutions</GroupHeading>}>
              {V2_SOLUTIONS_NAV.map((s) => (
                <PaletteLink key={s.href} label={s.label} href={s.href} go={go} />
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t border-line px-4 py-2">
            <span className="type-mono text-ink-muted">↑↓ NAVIGATE · ↵ OPEN · ESC CLOSE</span>
            <span className="type-mono text-ink-muted">30,500 ENTITIES INDEXED</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <div className="type-label px-3 pt-3 pb-1">{children}</div>;
}

function PaletteLink({
  label,
  href,
  go,
}: {
  label: string;
  href: string;
  go: (href: string) => void;
}) {
  return (
    <Command.Item
      value={`${label} ${href}`}
      onSelect={() => go(href)}
      className="type-body flex cursor-pointer items-baseline justify-between px-3 py-2 data-[selected=true]:bg-muted"
    >
      <span>{label}</span>
      <span className="type-mono text-ink-muted">{href.replace("/v2", "")}</span>
    </Command.Item>
  );
}
