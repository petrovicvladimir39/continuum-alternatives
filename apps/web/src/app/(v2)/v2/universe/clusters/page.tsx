import type { Metadata } from "next";
import Link from "next/link";
import { cityEcosystems } from "@/lib/v2/cities";
import { v2ClassFor } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "Clusters — Universe" };

/** City × class clusters computed from the mock set. */
export default function ClustersPage() {
  const cities = cityEcosystems();
  const clusters = cities.flatMap((city) => {
    const byClass = new Map<string, number>();
    for (const e of city.entities) {
      byClass.set(e.assetClass, (byClass.get(e.assetClass) ?? 0) + 1);
    }
    return [...byClass.entries()]
      .filter(([, n]) => n >= 2)
      .map(([classSlug, n]) => ({ city, classSlug, n }));
  });

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8">
      <div className="type-label">Universe</div>
      <h1 className="type-display mt-2">City ecosystems & clusters</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Where the map thickens: cities with concentrated rosters, and the class clusters forming
        inside them. Computed from the record — a cluster exists when at least two entities of the
        same class share a city.
      </p>

      <h2 className="type-label mt-10 border-b border-line pb-2">Cities</h2>
      <div className="grid grid-cols-1 gap-px border-x border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((c) => (
          <Link key={c.slug} href={`/v2/universe/cities/${c.slug}`} className="group bg-surface p-3 transition-colors hover:bg-muted/50">
            <div className="flex items-baseline justify-between">
              <span className="type-h3 group-hover:underline group-hover:decoration-dotted">{c.name}</span>
              <span className="type-mono text-ink-muted">{c.country}</span>
            </div>
            <div className="type-data mt-1 text-ink-secondary">{c.entities.length} entities</div>
          </Link>
        ))}
      </div>

      <h2 className="type-label mt-10 border-b border-line pb-2">Class clusters</h2>
      <table className="w-full border-collapse">
        <tbody>
          {clusters.map(({ city, classSlug, n }) => {
            const cls = v2ClassFor(classSlug);
            return (
              <tr key={`${city.slug}:${classSlug}`} className="border-b border-line transition-colors hover:bg-surface">
                <td className="py-2.5 pr-3">
                  <Link href={`/v2/universe/cities/${city.slug}`} className="type-body hover:underline hover:decoration-dotted">
                    {city.name} · {cls?.label}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">
                  {cls !== null ? (
                    <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>{cls.code}</span>
                  ) : null}
                </td>
                <td className="type-data py-2.5 text-right">{n} entities</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
