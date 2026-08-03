import type { Metadata } from "next";
import Link from "next/link";
import { buildMockThreads, MOCK_ENTITIES } from "@continuum/shared";
import { ThreadFeed } from "@/components/v2/network/thread-feed";
import { UniverseWidget } from "@/components/v2/network/universe-widget";
import { EntityHoverCard } from "@/components/v2/entity-hover-card";
import { V2_CLASSES } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "Network & Threads" };

/** P3 — 3-column: nav+watchlists / thread timeline / trending + universe. */
export default function NetworkPage() {
  // Trending = mention frequency across threads (deterministic mock).
  const threads = buildMockThreads();
  const mentionCounts = new Map<string, number>();
  for (const t of threads) {
    for (const p of [t.root, ...t.replies]) {
      for (const m of p.body.matchAll(/@\{([^}]+)\}/g)) {
        mentionCounts.set(m[1]!, (mentionCounts.get(m[1]!) ?? 0) + 1);
      }
    }
  }
  const trending = [...mentionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const focal = MOCK_ENTITIES.find((e) => e.role === "gp")!;

  const WATCHLISTS: [string, number][] = [
    ["NPL · Iberia", 14],
    ["CEE Buyouts", 22],
    ["Cat bond sponsors", 6],
    ["Baltic infrastructure", 9],
  ];

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
      {/* Left: nav + watchlists */}
      <aside className="space-y-6">
        <nav className="border border-line bg-surface">
          {[
            ["Feed", "/v2/network"],
            ["Universe map", "/v2/network/universe-map"],
            ["Members", "/v2/network/members"],
            ["Events", "/v2/network/events"],
          ].map(([label, href]) => (
            <Link key={href} href={href!} className="type-small block border-b border-line px-3 py-2 text-ink-secondary transition-colors last:border-b-0 hover:bg-muted/50 hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <section className="border border-line bg-surface">
          <div className="type-label border-b border-line px-3 py-2">Watchlists</div>
          {WATCHLISTS.map(([name, n]) => (
            <div key={name} className="flex items-baseline justify-between border-b border-line px-3 py-2 last:border-b-0">
              <span className="type-small">{name}</span>
              <span className="type-data text-ink-muted">{n}</span>
            </div>
          ))}
          <div className="type-mono px-3 py-2 text-ink-muted">MOCK · SYNCS AT CUTOVER</div>
        </section>
      </aside>

      {/* Center: timeline */}
      <section className="min-w-0">
        <ThreadFeed />
      </section>

      {/* Right: trending + YourUniverse preview */}
      <aside className="space-y-6">
        <section className="border border-line bg-surface">
          <div className="type-label border-b border-line px-3 py-2">Trending entities</div>
          {trending.map(([name, n]) => (
            <div key={name} className="flex items-baseline justify-between border-b border-line px-3 py-2 last:border-b-0">
              <span className="type-small min-w-0 truncate">
                <EntityHoverCard name={name} />
              </span>
              <span className="type-data ml-2 shrink-0 text-ink-muted">{n}×</span>
            </div>
          ))}
        </section>
        <section className="border border-line bg-surface">
          <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
            <span className="type-label">Your universe</span>
            <Link href="/v2/network/universe-map" className="type-mono text-ink-muted transition-colors hover:text-ink">
              FULL →
            </Link>
          </div>
          <UniverseWidget focalId={focal.id} heightClass="h-[240px]" />
          <div className="border-t border-line px-3 py-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {V2_CLASSES.slice(0, 5).map((c) => (
                <span key={c.slug} className="type-mono flex items-center gap-1 text-ink-muted">
                  <span className={`inline-block h-1.5 w-1.5 ${c.accent.swatch}`} />
                  {c.code}
                </span>
              ))}
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
