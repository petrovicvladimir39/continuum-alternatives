"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ⌘K quick-search (Phase 25D) — keyboard-summoned overlay, token-styled,
 * NO libraries (no cmdk/headless-ui). Hits /api/quick-search (entities +
 * published articles), arrow-key navigation, Enter opens, Esc closes.
 * The header "Search…" affordance is the click target for the same overlay.
 */

type QuickHit = { label: string; sub: string; href: string };

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setHits([]);
      setSelected(0);
    }
  }, [open]);

  const search = useCallback((value: string) => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (value.trim() === "") {
        setHits([]);
        return;
      }
      void fetch(`/api/quick-search?q=${encodeURIComponent(value.trim())}`)
        .then((response) => (response.ok ? (response.json() as Promise<{ hits: QuickHit[] }>) : { hits: [] }))
        .then((payload) => {
          setHits(payload.hits);
          setSelected(0);
        })
        .catch(() => setHits([]));
    }, 180);
  }, []);

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((current) => Math.min(current + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[selected];
      if (hit !== undefined) {
        setOpen(false);
        router.push(hit.href);
      } else if (query.trim() !== "") {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden shrink-0 rounded-sm border border-line bg-surface px-3 py-1 text-[13px] text-ink-muted hover:border-accent hover:text-accent sm:block"
      >
        Search… <span className="type-data ml-1 text-[11px] text-ink-muted">⌘K</span>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/20 pt-[12vh]"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg border border-line-strong bg-surface"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                search(event.target.value);
              }}
              onKeyDown={onInputKey}
              placeholder="Companies, funds, articles…"
              className="w-full border-b border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted"
            />
            <div className="max-h-[50vh] overflow-y-auto">
              {hits.map((hit, index) => (
                <button
                  key={hit.href}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(hit.href);
                  }}
                  onMouseEnter={() => setSelected(index)}
                  className={`block w-full px-4 py-2 text-left ${
                    index === selected ? "bg-ground" : "bg-surface"
                  }`}
                >
                  <span className="block text-[14px] text-ink">{hit.label}</span>
                  <span className="type-small block text-ink-muted">{hit.sub}</span>
                </button>
              ))}
              {query.trim() !== "" && hits.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-ink-muted">
                  Nothing yet — Enter opens full search.
                </p>
              ) : null}
            </div>
            <p className="border-t border-line px-4 py-1.5 text-[11px] text-ink-muted">
              ↑↓ navigate · Enter open · Esc close
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
