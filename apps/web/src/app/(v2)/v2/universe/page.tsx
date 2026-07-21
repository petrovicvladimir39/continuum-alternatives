import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_COUNTRIES, MOCK_ENTITIES } from "@continuum/shared";
import { UniverseCanvasClient } from "@/components/v2/universe/universe-client";
import { fmtInt } from "@/lib/v2/format";
import { TOTAL_COUNTRIES, TOTAL_ENTITIES } from "@/lib/v2/coverage";
import { V2_CLASSES } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "Universe" };

/** P4 — the Universe map front: 90vh dark canvas + legend + subroute nav. */
export default function UniversePage() {
  const cities = new Set(MOCK_ENTITIES.map((e) => e.city)).size;
  return (
    <div>
      <UniverseCanvasClient heightClass="h-[90vh]" />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="type-h1">The Universe</h1>
            <p className="type-small mt-1 max-w-[560px] text-ink-secondary">
              {fmtInt(TOTAL_ENTITIES)} entities across {TOTAL_COUNTRIES} countries in the live
              record; this prototype canvas renders the {MOCK_ENTITIES.length}-entity mock set
              across {MOCK_COUNTRIES.length} countries and {cities} cities. Color = asset class;
              radius = AUM.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {[
              ["Full-screen map", "/v2/universe/map"],
              ["Coverage density", "/v2/universe/coverage-map"],
              ["City ecosystems", "/v2/universe/clusters"],
            ].map(([label, href]) => (
              <Link key={href} href={href!} className="type-label border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {V2_CLASSES.map((c) => (
            <span key={c.slug} className="type-small flex items-center gap-1.5 text-ink-secondary">
              <span className={`inline-block h-2 w-2 ${c.accent.swatch}`} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
