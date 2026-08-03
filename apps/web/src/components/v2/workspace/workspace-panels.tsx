"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MOCK_ENTITIES, mockFeedPage } from "@continuum/shared";
import { fmtDate, timeAgo } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * Workspace panels — mock-driven, session/localStorage-backed. Watchlists,
 * the personalized feed and alerts derive from the same watched-entity set,
 * so interactions cohere. Cutover swaps localStorage for member records.
 */

const WATCHED_KEY = "v2-watched-entities";
const DEFAULT_WATCHED = ["vistula-growth-partners", "aegean-yield-partners", "moselle-clo-management", "douro-savings-bank", "helvetia-renewables-management"];

export function useWatched(): [string[], (slugs: string[]) => void] {
  const [watched, setWatched] = useState<string[]>(DEFAULT_WATCHED);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WATCHED_KEY);
      if (raw !== null) {
        setWatched(JSON.parse(raw) as string[]);
      }
    } catch {
      // keep defaults
    }
  }, []);
  const update = (slugs: string[]) => {
    setWatched(slugs);
    try {
      window.localStorage.setItem(WATCHED_KEY, JSON.stringify(slugs));
    } catch {
      // session-local only
    }
  };
  return [watched, update];
}

export function WorkspaceDashboard() {
  const [watched] = useWatched();
  const items = useMemo(() => {
    const set = new Set(watched);
    return mockFeedPage({ pageSize: 400 }).items.filter((i) => set.has(i.entitySlug)).slice(0, 12);
  }, [watched]);
  const alerts = items.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface">
        <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
          <span className="type-label">Alerts · on approval</span>
          <span className="type-mono text-ink-muted">{alerts.length} UNSEEN</span>
        </div>
        {alerts.length === 0 ? (
          <div className="terminal-empty m-3">[ 0 ALERTS — WATCH ENTITIES TO RECEIVE THEM ]</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="border-b border-line px-3 py-2 last:border-b-0">
              <div className="type-small">{a.title}</div>
              <div className="type-data mt-0.5 text-ink-muted" suppressHydrationWarning>
                {a.entityName} · {timeAgo(a.recordedAt)}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="border border-line">
        <div className="flex items-baseline justify-between border-b border-line bg-surface px-3 py-2">
          <span className="type-label">Your feed · watched entities</span>
          <Link href="/v2/workspace/watchlists" className="type-mono text-ink-muted transition-colors hover:text-ink">
            MANAGE →
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="terminal-empty m-3">[ 0 SIGNALS FROM WATCHED ENTITIES · 60D ]</div>
        ) : (
          items.map((item) => {
            const accent = v2Accent(item.entityAssetClass, item.entityStrategySlug);
            return (
              <div key={item.id} className={`border-b border-line bg-surface px-3 py-2.5 last:border-b-0 ${accent?.left ?? ""}`}>
                <div className="type-small">{item.title}</div>
                <div className="type-data mt-0.5 text-ink-muted">
                  {item.entityName} · {fmtDate(item.occurredOn)} · {item.sourceName}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

export function WorkspaceWatchlists() {
  const [watched, setWatched] = useWatched();
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    if (query.trim().length < 2) {
      return [];
    }
    const q = query.trim().toLowerCase();
    const set = new Set(watched);
    return MOCK_ENTITIES.filter((e) => !set.has(e.slug) && e.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, watched]);

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface p-3">
        <div className="type-label">Add to watchlist</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities…"
          className="type-small mt-2 w-full max-w-[360px] border border-line bg-surface px-2 py-1.5 outline-none placeholder:text-ink-muted focus:border-line-strong"
        />
        {candidates.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {candidates.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setWatched([...watched, e.slug]);
                  setQuery("");
                }}
                className="type-label cursor-pointer border border-line px-2 py-0.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
              >
                + {e.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="border border-line">
        <div className="border-b border-line bg-surface px-3 py-2">
          <span className="type-label">Watched entities · {watched.length}</span>
        </div>
        {watched.length === 0 ? (
          <div className="terminal-empty m-3">[ WATCHLIST EMPTY — ADD ENTITIES ABOVE ]</div>
        ) : (
          watched.map((slug) => {
            const entity = MOCK_ENTITIES.find((e) => e.slug === slug);
            if (entity === undefined) {
              return null;
            }
            const cls = v2ClassFor(entity.assetClass);
            return (
              <div key={slug} className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2 last:border-b-0">
                {cls !== null ? (
                  <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>{cls.code}</span>
                ) : null}
                <span className="type-small min-w-0 truncate">{entity.name}</span>
                <span className="type-data text-ink-muted">{entity.city} · {entity.country}</span>
                <button
                  type="button"
                  onClick={() => setWatched(watched.filter((s) => s !== slug))}
                  className="type-label ml-auto cursor-pointer text-ink-muted transition-colors hover:text-negative"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

type SavedQuery = { name: string; q: string; classSlug: string; role: string; country: string; tier: string };

export function WorkspaceQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  useEffect(() => {
    try {
      setQueries(JSON.parse(window.localStorage.getItem("v2-saved-queries") ?? "[]") as SavedQuery[]);
    } catch {
      setQueries([]);
    }
  }, []);
  return (
    <section className="border border-line">
      <div className="border-b border-line bg-surface px-3 py-2">
        <span className="type-label">Saved screener queries · {queries.length}</span>
      </div>
      {queries.length === 0 ? (
        <div className="terminal-empty m-3">
          [ 0 SAVED QUERIES — SAVE ONE FROM THE COMPANY INTELLIGENCE SCREENER ]
        </div>
      ) : (
        queries.map((s, i) => (
          <Link
            key={i}
            href={`/v2/products/company-intelligence?q=${encodeURIComponent(s.q)}&class=${encodeURIComponent(s.classSlug)}`}
            className="flex items-baseline justify-between border-b border-line bg-surface px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50"
          >
            <span className="type-small">{s.name}</span>
            <span className="type-mono text-ink-muted">OPEN →</span>
          </Link>
        ))
      )}
    </section>
  );
}

export function WorkspaceSettings() {
  const [keys, setKeys] = useState<string[]>([]);
  const [linkedin, setLinkedin] = useState(false);
  useEffect(() => {
    try {
      setKeys(JSON.parse(window.localStorage.getItem("v2-api-keys") ?? "[]") as string[]);
      setLinkedin(window.localStorage.getItem("v2-linkedin") === "1");
    } catch {
      // defaults
    }
  }, []);

  const issueKey = () => {
    // Mock key — random-looking but clearly fake; production issues real
    // hashed keys via the account system.
    const suffix = Array.from({ length: 18 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]).join("");
    const next = [...keys, `ca_mock_${suffix}`].slice(-3);
    setKeys(next);
    try {
      window.localStorage.setItem("v2-api-keys", JSON.stringify(next));
    } catch {
      // session-local
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="type-h3">API keys</h2>
          <button type="button" onClick={issueKey} className="type-label cursor-pointer border border-line px-2.5 py-1 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
            Issue key
          </button>
        </div>
        <p className="type-small mt-1 text-ink-secondary">
          60 requests/minute per key. Production shows the raw key once and stores a hash; these
          mock keys are session-local.
        </p>
        <div className="mt-3 space-y-1.5">
          {keys.length === 0 ? (
            <div className="type-mono text-ink-muted">[ NO KEYS ISSUED ]</div>
          ) : (
            keys.map((k) => (
              <div key={k} className="type-mono border border-line px-2 py-1.5">{k}</div>
            ))
          )}
        </div>
      </section>

      <section className="border border-line bg-surface p-4">
        <h2 className="type-h3">LinkedIn permissions</h2>
        <p className="type-small mt-1 max-w-[480px] text-ink-secondary">
          Import your connections to light up warm-intro paths in the network graph. Off by
          default; import is explicit and revocable.
        </p>
        <button
          type="button"
          onClick={() => {
            const next = !linkedin;
            setLinkedin(next);
            try {
              window.localStorage.setItem("v2-linkedin", next ? "1" : "0");
            } catch {
              // session-local
            }
          }}
          className={`type-label mt-3 cursor-pointer border px-3 py-1.5 transition-colors ${
            linkedin ? "border-ink text-ink" : "border-line text-ink-secondary hover:border-line-strong"
          }`}
        >
          {linkedin ? "Connected · revoke" : "Grant import permission"}
        </button>
      </section>
    </div>
  );
}
