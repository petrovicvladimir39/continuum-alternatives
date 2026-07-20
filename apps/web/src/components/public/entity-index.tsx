import Link from "next/link";
import {
  listPublicEntities,
  listPublicFilterOptions,
  PUBLIC_PAGE_SIZE,
  type PublicKind,
} from "@continuum/db";
import { hasCyrillic, transliterateDisplay } from "@continuum/shared";
import { DataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { countryName } from "@/lib/public-labels";

export type IndexSearchParams = { page?: string; country?: string; tag?: string };

function pageHref(
  basePath: string,
  params: { page?: number; country?: string; tag?: string },
): string {
  const query = new URLSearchParams();
  if (params.country !== undefined && params.country !== "") {
    query.set("country", params.country);
  }
  if (params.tag !== undefined && params.tag !== "") {
    query.set("tag", params.tag);
  }
  if (params.page !== undefined && params.page > 1) {
    query.set("page", String(params.page));
  }
  const suffix = query.toString();
  return suffix === "" ? basePath : `${basePath}?${suffix}`;
}

export async function EntityIndex({
  kind,
  basePath,
  title,
  intro,
  searchParams,
}: {
  kind: PublicKind;
  basePath: string;
  title: string;
  intro: string;
  searchParams: IndexSearchParams;
}) {
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const country = searchParams.country ?? "";
  const tag = searchParams.tag ?? "";

  const [listing, options] = await Promise.all([
    listPublicEntities(kind, { page, country, tag }),
    listPublicFilterOptions(kind),
  ]);

  const from = listing.total === 0 ? 0 : (listing.page - 1) * PUBLIC_PAGE_SIZE + 1;
  const to = Math.min(listing.total, listing.page * PUBLIC_PAGE_SIZE);

  return (
    <div className="py-10">
      <h1 className="type-h1">{title}</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">{intro}</p>

      {/* Plain GET form — filters live in searchParams, no client JS. */}
      <form action={basePath} method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="type-label">Country</span>
          <select
            name="country"
            defaultValue={country}
            className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]"
          >
            <option value="">All countries</option>
            {options.countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="type-label">Tag</span>
          <select
            name="tag"
            defaultValue={tag}
            className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]"
          >
            <option value="">All tags</option>
            {options.tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm border border-line-strong bg-surface px-4 py-1.5 text-[13px] font-medium hover:border-accent hover:text-accent"
        >
          Filter
        </button>
        {country !== "" || tag !== "" ? (
          <Link href={basePath} className="type-small text-ink-muted hover:text-accent">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="type-data mt-6 text-ink-muted">
        {listing.total === 0
          ? "No entries match."
          : `Showing ${from}–${to} of ${listing.total}`}
      </p>

      {listing.rows.length > 0 ? (
        <DataTable className="mt-2">
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {listing.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.href !== null ? (
                    <Link href={row.href} className="font-medium hover:text-accent">
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                  {hasCyrillic(row.name) ? (
                    <span className="ml-2 text-ink-muted">{transliterateDisplay(row.name)}</span>
                  ) : null}
                </td>
                <td>{countryName(row.country) ?? "—"}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {row.tags.slice(0, 4).map((value) => (
                      <Tag key={value}>{value}</Tag>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : null}

      {listing.pageCount > 1 ? (
        <nav className="mt-6 flex items-center gap-4">
          {listing.page > 1 ? (
            <Link
              href={pageHref(basePath, { page: listing.page - 1, country, tag })}
              className="type-small hover:text-accent"
            >
              ← Previous
            </Link>
          ) : null}
          <span className="type-data text-ink-muted">
            Page {listing.page} of {listing.pageCount}
          </span>
          {listing.page < listing.pageCount ? (
            <Link
              href={pageHref(basePath, { page: listing.page + 1, country, tag })}
              className="type-small hover:text-accent"
            >
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
