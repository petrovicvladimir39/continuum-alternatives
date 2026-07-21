import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mockFeedPage } from "@continuum/shared";
import { UniverseCanvasClient } from "@/components/v2/universe/universe-client";
import { cityBySlug, cityEcosystems } from "@/lib/v2/cities";
import { fmtDate, fmtEuroM } from "@/lib/v2/format";
import { v2ClassFor } from "@/lib/v2/taxonomy";

export function generateStaticParams() {
  return cityEcosystems().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = cityBySlug(slug);
  return { title: city === null ? "Cities" : `${city.name} — Universe` };
}

/** City ecosystem page: centered canvas + the local roster + signals. */
export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = cityBySlug(slug);
  if (city === null) {
    notFound();
  }
  const signals = mockFeedPage({ pageSize: 400 }).items
    .filter((i) => i.entityCity === city.name)
    .slice(0, 8);

  return (
    <div>
      <UniverseCanvasClient heightClass="h-[46vh]" initialCity={{ lat: city.lat, lng: city.lng }} />
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <div className="type-label">
          <Link href="/v2/universe/clusters" className="hover:text-ink">City ecosystems</Link> · {city.country}
        </div>
        <h1 className="type-display mt-2">{city.name}</h1>
        <p className="type-small mt-2 text-ink-secondary">
          {city.entities.length} entities in the prototype set. Full roster at cutover.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[60fr_40fr]">
          <section>
            <div className="type-label border-b border-line pb-2">Roster</div>
            <table className="w-full border-collapse">
              <tbody>
                {city.entities.map((e) => {
                  const cls = v2ClassFor(e.assetClass);
                  return (
                    <tr key={e.id} className="border-b border-line transition-colors hover:bg-surface">
                      <td className="py-2.5 pr-3">
                        <span className="type-body block">{e.name}</span>
                        <span className="type-small text-ink-muted">{e.strategy}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {cls !== null ? (
                          <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>{cls.code}</span>
                        ) : null}
                      </td>
                      <td className="type-data py-2.5 text-right">{fmtEuroM(e.aumM)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <div className="type-label border-b border-line pb-2">Local signals</div>
            {signals.length === 0 ? (
              <div className="terminal-empty mt-3">[ 0 SIGNALS RECORDED FOR {city.name.toUpperCase()} · 60D ]</div>
            ) : (
              signals.map((s) => (
                <div key={s.id} className="border-b border-line py-2 last:border-b-0">
                  <div className="type-small">{s.title}</div>
                  <div className="type-data mt-0.5 text-ink-muted">{fmtDate(s.occurredOn)}</div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
