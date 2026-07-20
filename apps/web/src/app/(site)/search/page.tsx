import type { Metadata } from "next";
import Link from "next/link";
import { countEmbeddedEntities, searchPublic, type PublicSearchHit } from "@continuum/db";
import { embedQuery, voyageClient } from "@continuum/pipeline";
import { Tag } from "@/components/ui/tag";
import { countryName, KIND_LABELS_ANY } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search companies, funds, and deals across Europe's alternative-asset record.",
};

async function runSearch(query: string): Promise<{ hits: PublicSearchHit[]; semantic: boolean }> {
  // Semantic leg only when a Voyage key is configured AND embeddings exist;
  // otherwise plain ILIKE/alias matching. Server-rendered — no client JS.
  let queryEmbedding: number[] | null = null;
  const client = voyageClient();
  if (client !== null && (await countEmbeddedEntities()) > 0) {
    try {
      queryEmbedding = await embedQuery(client, query);
    } catch {
      queryEmbedding = null;
    }
  }
  const hits = await searchPublic(query, queryEmbedding);
  return { hits, semantic: queryEmbedding !== null };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const { hits, semantic } = query === "" ? { hits: [], semantic: false } : await runSearch(query);

  return (
    <div className="py-10">
      <h1 className="type-h1">Search</h1>
      <form action="/search" method="get" className="mt-6 max-w-xl">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Company, fund, or deal name…"
            className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-[14px] placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-sm border border-line-strong bg-surface px-4 py-2 text-[13px] font-medium hover:border-accent hover:text-accent"
          >
            Search
          </button>
        </div>
      </form>

      {query !== "" ? (
        <div className="mt-8">
          <p className="type-small text-ink-muted">
            {hits.length} result{hits.length === 1 ? "" : "s"} for “{query}”
            {semantic ? " (name and semantic match)" : ""}
          </p>
          {hits.length > 0 ? (
            <table className="mt-3 w-full border-collapse text-left text-[13px] leading-[1.45] [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:leading-[1.3] [&_th]:font-medium [&_th]:tracking-wide [&_th]:uppercase [&_th]:text-ink-muted [&_tbody_tr:hover]:bg-[#F4F2EC] [&_tr]:border-b [&_tr]:border-line">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Country</th>
                  <th>Tags</th>
                  <th>Match</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((hit) => (
                  <tr key={hit.id}>
                    <td>
                      {hit.href !== null ? (
                        <Link href={hit.href} className="font-medium hover:text-accent">
                          {hit.name}
                        </Link>
                      ) : (
                        hit.name
                      )}
                    </td>
                    <td>{KIND_LABELS_ANY[hit.kind] ?? hit.kind}</td>
                    <td>{countryName(hit.country) ?? "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {hit.tags.slice(0, 3).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    </td>
                    <td className="text-ink-muted">{hit.match === "semantic" ? "semantic" : "name"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-ink-secondary">
              No matches. Try a shorter fragment of the name.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
