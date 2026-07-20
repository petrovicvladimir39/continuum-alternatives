import Link from "next/link";
import { findEntities } from "@continuum/db";
import { inputClass, linkButtonClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EntityResultRows } from "./rows";

export default async function AdminEntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const hits = q !== undefined && q !== "" ? await findEntities(q) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="type-h2">Entities</h1>
        <Link href="/admin/entities/new" className={linkButtonClass}>
          New entity
        </Link>
      </div>
      <form method="get" className="mt-4 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or alias"
          className={inputClass}
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>
      <div className="mt-6">
        {hits === null ? (
          <p className="text-[13px] text-ink-muted">Search the universe to see results.</p>
        ) : hits.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No entities match “{q}”.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Kind</th>
                <th>Country</th>
                <th>Tags</th>
              </tr>
            </thead>
            <EntityResultRows hits={hits} />
          </DataTable>
        )}
      </div>
    </div>
  );
}
