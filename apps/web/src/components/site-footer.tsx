import Link from "next/link";
import { FOOTER_PLATFORM_LINKS } from "@continuum/shared";

/** Three quiet columns: platform links · data & sources provenance · contact. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-6 py-8 sm:grid-cols-3">
        <div>
          <h2 className="type-label">Platform</h2>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {FOOTER_PLATFORM_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[13px] text-ink-secondary hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="type-label">Data &amp; sources</h2>
          <p className="type-small mt-2.5 leading-[1.55] text-ink-muted">
            Built from primary sources — court and insolvency registries, official gazettes, and
            regional business press. Every fact on the platform cites where it came from; nothing
            publishes without verification.
          </p>
        </div>
        <div>
          <h2 className="type-label">Contact</h2>
          <p className="type-small mt-2.5 text-ink-secondary">
            <a href="mailto:hello@continuumalternatives.com" className="hover:text-accent">
              hello@continuumalternatives.com
            </a>
          </p>
          <p className="type-small mt-4 text-ink-muted">© 2026 Continuum Alternatives</p>
        </div>
      </div>
    </footer>
  );
}
