import Link from "next/link";
import { db, sql, strategyCoverage } from "@continuum/db";
import { classifiedLabel } from "@continuum/shared";
import { bulkTagAction } from "@/app/admin/actions";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";

export const dynamic = "force-dynamic";

/**
 * Universe control room (reset build Part 5): corpus counts by country /
 * tag / verification class, recent imports, filtered views, bulk tag ops,
 * and CSV downloads wired to the shared export layer.
 */

type Search = {
  country?: string;
  tag?: string;
  status?: string;
  kind?: string;
  /** Taxonomy strategy or asset-class slug (Phase 26D). */
  strategy?: string;
};

export default async function AdminUniversePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const country = params.country?.toUpperCase() ?? "";
  const tag = params.tag ?? "";
  const status = params.status ?? "";
  const kind = params.kind ?? "";
  const strategy = params.strategy ?? "";
  const hasFilter =
    country !== "" || tag !== "" || status !== "" || kind !== "" || strategy !== "";

  const coverage = await strategyCoverage();
  const [byCountry, byClass, byTag, recent] = await Promise.all([
    db.execute(sql`
      SELECT coalesce(e.country, '—') AS country, count(*)::int AS n,
             count(*) FILTER (WHERE e.status = 'active')::int AS active_n
      FROM entities e GROUP BY 1 ORDER BY n DESC
    `),
    db.execute(sql`
      SELECT CASE
               WHEN EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = 'register_verified')
                 THEN 'register_verified'
               WHEN e.status = 'active' THEN 'active (curated/extracted)'
               WHEN EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = 'wikidata')
                 THEN 'provisional (crowd-sourced)'
               ELSE 'provisional (unverified)'
             END AS klass,
             count(*)::int AS n
      FROM entities e GROUP BY 1 ORDER BY n DESC
    `),
    db.execute(sql`
      SELECT t.tag, count(*)::int AS n FROM entity_tags t GROUP BY 1 ORDER BY n DESC LIMIT 30
    `),
    db.execute(sql`
      SELECT e.slug, e.name, e.country, e.status, to_char(e.created_at, 'YYYY-MM-DD') AS created_on
      FROM entities e ORDER BY e.created_at DESC NULLS LAST LIMIT 15
    `),
  ]);

  const filtered = await db.execute(sql`
    SELECT e.slug, e.name, e.country, e.status, e.kind,
           coalesce((SELECT string_agg(t.tag, ';' ORDER BY t.tag)
                       FROM entity_tags t WHERE t.entity_id = e.id), '') AS tags,
           count(*) OVER ()::int AS total
    FROM entities e
    WHERE (${country === "" ? null : country}::text IS NULL OR e.country = ${country === "" ? null : country})
      AND (${kind === "" ? null : kind}::text IS NULL OR e.kind::text = ${kind === "" ? null : kind})
      AND (${status === "" ? null : status}::text IS NULL OR e.status = ${status === "" ? null : status})
      AND (${tag === "" ? null : tag}::text IS NULL OR EXISTS
             (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = ${tag === "" ? null : tag}))
      AND (${strategy === "" ? null : strategy}::text IS NULL OR EXISTS
             (SELECT 1 FROM entity_classifications c WHERE c.entity_id = e.id
                AND c.status = 'approved'
                AND (c.strategy = ${strategy === "" ? null : strategy}
                     OR c.asset_class = ${strategy === "" ? null : strategy})))
    ORDER BY e.country NULLS LAST, e.name
    LIMIT 200
  `);
  const totalMatching = Number(filtered.rows[0]?.total ?? 0);

  // Entity-kind travels as "kind2" — "kind" selects the export dataset.
  const exportQuery = new URLSearchParams({
    ...(country !== "" ? { country } : {}),
    ...(tag !== "" ? { tag } : {}),
    ...(status !== "" ? { status } : {}),
    ...(kind !== "" ? { kind2: kind } : {}),
  }).toString();

  return (
    <div>
      <h1 className="type-h2">Universe</h1>
      <p className="mt-2 max-w-2xl text-[13px] text-ink-secondary">
        The corpus control room. Counts by country, tag, and verification class; filtered views
        with bulk tag operations; CSV downloads from the export layer (also available as
        <span className="type-data"> pnpm export:entities|edges|facts|documents</span>).
      </p>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="border border-line p-3">
          <h2 className="type-label mb-2">By verification class</h2>
          <table className="w-full text-[13px]">
            <tbody>
              {byClass.rows.map((row) => (
                <tr key={String(row.klass)} className="border-t border-line">
                  <td className="py-1">{String(row.klass)}</td>
                  <td className="type-data text-right">{String(row.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-line p-3">
          <h2 className="type-label mb-2">By country</h2>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-[13px]">
              <tbody>
                {byCountry.rows.map((row) => (
                  <tr key={String(row.country)} className="border-t border-line">
                    <td className="py-1">
                      <Link
                        href={`/admin/universe?country=${String(row.country)}`}
                        className="text-accent hover:underline"
                      >
                        {String(row.country)}
                      </Link>
                    </td>
                    <td className="type-data text-right">{String(row.active_n)} active</td>
                    <td className="type-data text-right">{String(row.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border border-line p-3">
          <h2 className="type-label mb-2">Top tags</h2>
          <div className="flex max-h-64 flex-wrap content-start gap-1.5 overflow-y-auto">
            {byTag.rows.map((row) => (
              <Link key={String(row.tag)} href={`/admin/universe?tag=${String(row.tag)}`}>
                <Tag variant="neutral">
                  {String(row.tag)} · {String(row.n)}
                </Tag>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 border border-line p-3">
        <h2 className="type-label mb-2">Classification coverage (mirrors /coverage)</h2>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
          {coverage
            .sort((a, b) => b.entities - a.entities)
            .map((row) => (
              <div
                key={`${row.assetClass}:${row.strategy}`}
                className="flex items-baseline justify-between border-t border-line py-1 text-[12px]"
              >
                <Link
                  href={`/admin/universe?strategy=${row.strategy === "" ? row.assetClass : row.strategy}`}
                  className="truncate text-accent hover:underline"
                >
                  {classifiedLabel(row.assetClass, row.strategy)}
                </Link>
                <span className="type-data ml-2 shrink-0">
                  {row.entities} · {row.signals}s
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-6 border border-line p-3">
        <h2 className="type-label mb-2">Recent imports</h2>
        <table className="w-full text-[13px]">
          <tbody>
            {recent.rows.map((row) => (
              <tr key={String(row.slug)} className="border-t border-line">
                <td className="py-1">
                  <Link
                    href={`/admin/entities/${String(row.slug)}`}
                    className="text-accent hover:underline"
                  >
                    {String(row.name)}
                  </Link>
                </td>
                <td>{String(row.country ?? "")}</td>
                <td>{String(row.status)}</td>
                <td className="type-data text-right">{String(row.created_on ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="type-h3">Filtered view</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className={labelClass} htmlFor="u-country">
              Country
            </label>
            <input id="u-country" name="country" maxLength={2} className={inputClass} defaultValue={country} />
          </div>
          <div>
            <label className={labelClass} htmlFor="u-tag">
              Tag
            </label>
            <input id="u-tag" name="tag" className={inputClass} defaultValue={tag} />
          </div>
          <div>
            <label className={labelClass} htmlFor="u-strategy">
              Strategy / class
            </label>
            <input
              id="u-strategy"
              name="strategy"
              className={inputClass}
              placeholder="e.g. clo, real_assets"
              defaultValue={strategy}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="u-status">
              Status
            </label>
            <select id="u-status" name="status" className={inputClass} defaultValue={status}>
              <option value="">any</option>
              <option value="active">active</option>
              <option value="provisional">provisional</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="u-kind">
              Kind
            </label>
            <select id="u-kind" name="kind" className={inputClass} defaultValue={kind}>
              <option value="">any</option>
              <option value="organization">organization</option>
              <option value="fund_vehicle">fund_vehicle</option>
              <option value="deal">deal</option>
            </select>
          </div>
          <Button type="submit" variant="ghost">
            Filter
          </Button>
        </form>

        <div className="mt-3 flex items-center gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            {totalMatching} matching{hasFilter ? " (filtered)" : ""} — showing first{" "}
            {Math.min(200, totalMatching)}
          </p>
          <a
            href={`/admin/universe/export?kind=entities&${exportQuery}`}
            className="text-[13px] text-accent hover:underline"
          >
            Download entities CSV
          </a>
          <a href="/admin/universe/export?kind=edges" className="text-[13px] text-accent hover:underline">
            Edges CSV
          </a>
          <a href="/admin/universe/export?kind=facts" className="text-[13px] text-accent hover:underline">
            Facts CSV
          </a>
          <a
            href="/admin/universe/export?kind=documents"
            className="text-[13px] text-accent hover:underline"
          >
            Documents CSV
          </a>
        </div>

        {hasFilter && totalMatching > 0 ? (
          <form action={bulkTagAction} className="mt-3 flex items-end gap-3 border border-line p-3">
            <input type="hidden" name="country" value={country} />
            <input type="hidden" name="tag" value={tag} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="kind" value={kind} />
            <div>
              <label className={labelClass} htmlFor="u-bulk-tag">
                Bulk tag op — applies to all {totalMatching} matching
              </label>
              <input id="u-bulk-tag" name="bulkTag" className={inputClass} placeholder="tag_name" />
            </div>
            <select name="op" className={inputClass} defaultValue="add">
              <option value="add">add tag</option>
              <option value="remove">remove tag</option>
            </select>
            <Button type="submit" variant="ghost">
              Apply
            </Button>
          </form>
        ) : null}

        <div className="mt-4">
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.rows.map((row) => (
                <tr key={String(row.slug)}>
                  <td>
                    <Link
                      href={`/admin/entities/${String(row.slug)}`}
                      className="text-accent hover:underline"
                    >
                      {String(row.name)}
                    </Link>
                  </td>
                  <td>{String(row.country ?? "")}</td>
                  <td>{String(row.kind)}</td>
                  <td>{String(row.status)}</td>
                  <td className="max-w-[280px] truncate text-[12px] text-ink-muted">
                    {String(row.tags)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </div>
    </div>
  );
}
