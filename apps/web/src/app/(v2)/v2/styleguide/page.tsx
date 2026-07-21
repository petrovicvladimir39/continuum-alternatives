import type { Metadata } from "next";
import { ALT_TAXONOMY } from "@continuum/shared";
import { DISTRESSED_ACCENT, V2_CLASSES, V2_STRATEGY_COUNT } from "@/lib/v2/taxonomy";
import { ThemeToggle } from "@/components/v2/theme";

export const metadata: Metadata = {
  title: "Styleguide (v2)",
};

/**
 * /v2/styleguide — THE CONTRACT. Every v2 surface derives from what renders
 * here: type scale, both modes, all nine class accents with specimen cards,
 * table row, stat block, chip set, terminal empty state. If it is not on
 * this page, it is not in the system.
 */

function SpecimenCard({ classSlug }: { classSlug: string }) {
  const cls = V2_CLASSES.find((c) => c.slug === classSlug)!;
  return (
    <article className={`border border-line bg-surface ${cls.accent.left}`}>
      <div className="px-4 py-3">
        <div className={`type-label ${cls.accent.text}`}>{cls.label}</div>
        <h3 className="type-h3 mt-1">
          Hanseatic closes mid-market Fund IV at €640m hard cap
        </h3>
        <p className="type-small mt-1 text-ink-secondary">
          Oversubscribed against a €500m target · Regulatory filing
        </p>
        <div className="type-data mt-2 flex items-baseline justify-between text-ink-muted">
          <span>Berlin · DE</span>
          <span>14:32 CET</span>
        </div>
      </div>
    </article>
  );
}

function ModePanel({ mode }: { mode: "light" | "dark" }) {
  return (
    <div className="v2-root border border-line" data-v2-theme={mode}>
      <div className="bg-ground px-4 py-4 text-ink">
        <div className="type-label mb-3">{mode} mode</div>
        <SpecimenCard classSlug="private-equity" />
        <div className="mt-3 flex flex-wrap gap-2">
          {V2_CLASSES.slice(0, 5).map((c) => (
            <span key={c.slug} className={`type-label px-2 py-0.5 ${c.accent.chip}`}>
              {c.code}
            </span>
          ))}
        </div>
        <div className="terminal-empty mt-3">[ 0 MATCHING ENTITIES IN QUERY ]</div>
      </div>
    </div>
  );
}

const TABLE_ROWS: [string, string, string, string, string, string][] = [
  ["Vistula Growth Partners", "private-equity", "Warsaw · PL", "€2.4bn", "34", "2026-07-18"],
  ["Danube Credit Partners", "private-credit", "Vienna · AT", "€1.1bn", "21", "2026-07-15"],
  ["Ægir Structured Finance", "structured", "Copenhagen · DK", "€860m", "12", "2026-07-11"],
  ["Helvetia Renewables Mgmt", "climate", "Zurich · CH", "€720m", "9", "2026-07-09"],
];

export default function StyleguidePage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-24">
      {/* Local masthead — the real GlobalHeader ships in the shell step. */}
      <header className="flex items-baseline justify-between border-b border-line py-4">
        <div className="type-label">Continuum Alternatives — Frontend V2</div>
        <ThemeToggle />
      </header>

      <h1 className="type-display mt-10">Styleguide</h1>
      <p className="type-body mt-3 max-w-[640px] text-ink-secondary">
        The contract for the v2 presentation layer. Serif is Newsreader (headlines, editorial);
        sans is Instrument Sans (UI and data, tabular-nums for every metric and timestamp).
        Radius 0px everywhere. No shadows — depth is 1px neutral hairlines. Text left, numbers
        right. Nine asset classes, {V2_STRATEGY_COUNT} strategies: the taxonomy is the spine.
      </p>

      {/* ── Type scale ────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">01 · Type scale</h2>
        <div className="mt-6 space-y-5">
          <div className="type-display">Display 40 — The map of European alternatives</div>
          <div className="type-h1">Heading 1 · 30 serif — NPL market shifts south</div>
          <div className="type-h2">Heading 2 · 22 serif — Iberian sellers return</div>
          <div className="type-h3">Heading 3 · 16 sans medium — Fund closes this week</div>
          <p className="type-body max-w-[560px]">
            Body 14 sans — Provenance-backed items carry their source citation and a recorded-at
            timestamp; nothing publishes below its confidence threshold without review.
          </p>
          <p className="type-small max-w-[560px] text-ink-secondary">
            Small 13 — secondary context lines, citation strings, footnotes.
          </p>
          <div className="type-label">Label 11 uppercase — kickers, column heads</div>
          <div className="type-data">Data 13 tabular — €1,240.5m · 14:32:07 · +2.8x</div>
          <div className="type-mono">MONO 12 — TERMINAL FRAGMENTS AND SYSTEM STATES</div>
        </div>
      </section>

      {/* ── Both modes ────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">02 · Both modes</h2>
        <p className="type-small mt-3 max-w-[560px] text-ink-secondary">
          Ground #fcfbf9 light / #121212 dark. Hairlines neutral-200 / neutral-800. The toggle in
          the masthead flips the whole page; these panels are pinned for comparison.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ModePanel mode="light" />
          <ModePanel mode="dark" />
        </div>
      </section>

      {/* ── Nine accents ─────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">03 · Asset-class accents — all nine</h2>
        <p className="type-small mt-3 max-w-[640px] text-ink-secondary">
          Harmonized muted hues at matched saturation. Usage law: accents appear ONLY in 4px
          left-border indicator slots, chips, 2px top rules, and map/graph encodings — never as
          text color for content, never as background washes behind copy.
        </p>
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="type-label py-2 pr-4 font-medium">Code</th>
              <th className="type-label py-2 pr-4 font-medium">Class</th>
              <th className="type-label py-2 pr-4 font-medium">Swatch</th>
              <th className="type-label py-2 pr-4 font-medium">Chip</th>
              <th className="type-label py-2 pr-4 font-medium">Top rule</th>
              <th className="type-label py-2 text-right font-medium">Strategies</th>
            </tr>
          </thead>
          <tbody>
            {V2_CLASSES.map((c) => (
              <tr key={c.slug} className="border-b border-line">
                <td className="type-data py-2.5 pr-4">{c.code}</td>
                <td className="type-body py-2.5 pr-4">{c.label}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block h-3 w-8 ${c.accent.swatch}`} />
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`type-label px-2 py-0.5 ${c.accent.chip}`}>{c.label}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block w-16 pt-1 ${c.accent.top}`} />
                </td>
                <td className="type-data py-2.5 text-right">{strategyCount(c.taxonomySlug)}</td>
              </tr>
            ))}
            <tr className="border-b border-line">
              <td className="type-data py-2.5 pr-4">PC·D</td>
              <td className="type-body py-2.5 pr-4">
                NPL / Distressed <span className="type-small text-ink-muted">(strategy variant)</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className={`inline-block h-3 w-8 ${DISTRESSED_ACCENT.swatch}`} />
              </td>
              <td className="py-2.5 pr-4">
                <span className={`type-label px-2 py-0.5 ${DISTRESSED_ACCENT.chip}`}>Distressed</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className={`inline-block w-16 pt-1 ${DISTRESSED_ACCENT.top}`} />
              </td>
              <td className="type-data py-2.5 text-right">2</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {V2_CLASSES.map((c) => (
            <SpecimenCard key={c.slug} classSlug={c.slug} />
          ))}
        </div>
      </section>

      {/* ── Table row ─────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">04 · Table row</h2>
        <p className="type-small mt-3 text-ink-secondary">
          Text left, numbers right, tabular-nums. Row hover is a color change only.
        </p>
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th className="type-label py-2 pr-4 font-medium">Entity</th>
              <th className="type-label py-2 pr-4 font-medium">Class</th>
              <th className="type-label py-2 pr-4 font-medium">Location</th>
              <th className="type-label py-2 pr-4 text-right font-medium">AUM</th>
              <th className="type-label py-2 pr-4 text-right font-medium">Signals</th>
              <th className="type-label py-2 text-right font-medium">Last fact</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map(([name, cls, loc, aum, signals, last]) => {
              const c = V2_CLASSES.find((x) => x.slug === cls)!;
              return (
                <tr key={name} className="border-b border-line transition-colors hover:bg-surface">
                  <td className="type-body py-2.5 pr-4">{name}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`type-label px-2 py-0.5 ${c.accent.chip}`}>{c.code}</span>
                  </td>
                  <td className="type-small py-2.5 pr-4 text-ink-secondary">{loc}</td>
                  <td className="type-data py-2.5 pr-4 text-right">{aum}</td>
                  <td className="type-data py-2.5 pr-4 text-right">{signals}</td>
                  <td className="type-data py-2.5 text-right">{last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Stat block ────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">05 · Stat block</h2>
        <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {(
            [
              ["Entities", "30,500"],
              ["Countries", "39"],
              ["Asset classes", "9"],
              ["Strategies", String(V2_STRATEGY_COUNT)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-4">
              <div className="type-label">{label}</div>
              <div className="type-data mt-1 text-[22px] leading-7">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Chip set + buttons ────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">06 · Chips & actions</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {V2_CLASSES.map((c) => (
            <span key={c.slug} className={`type-label px-2 py-0.5 ${c.accent.chip}`}>
              {c.label}
            </span>
          ))}
          <span className={`type-label px-2 py-0.5 ${DISTRESSED_ACCENT.chip}`}>NPL / Distressed</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="type-label border border-line px-2 py-0.5 text-ink-secondary">Geography · PL</span>
          <span className="type-label border border-line px-2 py-0.5 text-ink-secondary">AUM &gt; €1bn</span>
          <span className="type-label border border-line bg-surface px-2 py-0.5 text-ink">Verified</span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button type="button" className="type-label cursor-pointer bg-primary px-4 py-2 text-primary-foreground transition-colors hover:opacity-90">
            Subscribe
          </button>
          <button type="button" className="type-label cursor-pointer border border-line px-4 py-2 text-ink transition-colors hover:border-line-strong">
            Sign in
          </button>
          <button type="button" className="type-label cursor-pointer px-2 py-2 text-ink-secondary transition-colors hover:text-ink">
            Ghost action
          </button>
        </div>
      </section>

      {/* ── Terminal empty state ──────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="type-label border-b border-line pb-2">07 · Terminal empty state</h2>
        <p className="type-small mt-3 max-w-[560px] text-ink-secondary">
          Reserved for when a user&apos;s filter genuinely returns nothing — never a default page
          state. Default state is always full.
        </p>
        <div className="terminal-empty mt-4">[ 0 MATCHING ENTITIES IN QUERY — CLEAR FILTERS TO RESET ]</div>
      </section>
    </div>
  );
}

function strategyCount(taxonomySlug: string): number {
  return ALT_TAXONOMY.find((c) => c.slug === taxonomySlug)?.strategies.length ?? 0;
}
