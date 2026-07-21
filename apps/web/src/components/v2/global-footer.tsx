import Link from "next/link";
import { V2_PRODUCTS_NAV, V2_SOLUTIONS_NAV } from "@/lib/v2/nav";

/** Quiet 3-column footer: platform / methodology + sources / contact. */
export function GlobalFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="type-label mb-3">Platform</div>
          <ul className="space-y-1.5">
            {[
              ["News", "/v2/news"],
              ["Markets & Coverage", "/v2/coverage"],
              ["Network & Threads", "/v2/network"],
              ["Universe Map", "/v2/universe"],
              ["Reports & Insights", "/v2/reports"],
              ["Styleguide", "/v2/styleguide"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href!} className="type-small text-ink-secondary transition-colors hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
            {V2_PRODUCTS_NAV.slice(0, 3).map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="type-small text-ink-secondary transition-colors hover:text-ink">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="type-label mb-3">Methodology & sources</div>
          <p className="type-small max-w-[36ch] text-ink-secondary">
            Every fact carries its source. 84 monitored sources — registers, gazettes, filings,
            press — pass a human review gate before anything publishes. The timeline is
            append-only; corrections are new facts, never silent edits.
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>
              <Link href="/v2/about#methodology" className="type-small text-ink-secondary transition-colors hover:text-ink">
                Methodology
              </Link>
            </li>
            <li>
              <Link href="/v2/products/enterprise-data" className="type-small text-ink-secondary transition-colors hover:text-ink">
                Enterprise Data & MCP
              </Link>
            </li>
            {V2_SOLUTIONS_NAV.slice(0, 2).map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="type-small text-ink-secondary transition-colors hover:text-ink">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="type-label mb-3">Contact</div>
          <p className="type-small max-w-[36ch] text-ink-secondary">
            Continuum Alternatives — the map of European alternative assets. Deepest coverage in
            Central and South-Eastern Europe.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/v2/about#pricing"
              className="type-label bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:opacity-90"
            >
              Subscribe
            </Link>
            <Link href="/v2/about#contact" className="type-label px-2 py-1.5 text-ink-secondary transition-colors hover:text-ink">
              Contact
            </Link>
          </div>
          <div className="type-mono mt-6 text-ink-muted">
            PROTOTYPE BUILD · FRONTEND-V2 · MOCK DATA LAYER
          </div>
        </div>
      </div>
    </footer>
  );
}
