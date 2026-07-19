"use client";

import { useState, useTransition } from "react";
import { searchEntitiesForPicker } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "./form-styles";

type Hit = { slug: string; name: string; kind: string };

export function EntityPicker({
  label,
  name,
  kindFilter,
  error,
}: {
  label: string;
  name: string;
  kindFilter?: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[] | null>(null);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = () => {
    startTransition(async () => {
      setResults(await searchEntitiesForPicker(query, kindFilter));
    });
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <input type="hidden" name={name} value={selected?.slug ?? ""} />
      {selected ? (
        <div className="flex items-center gap-2 text-[13px]">
          <span>
            {selected.name} <span className="type-data text-ink-muted">({selected.slug})</span>
          </span>
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => setSelected(null)}
          >
            change
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
              placeholder="Search by name"
            />
            <button
              type="button"
              onClick={runSearch}
              className="rounded-sm border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink hover:bg-ink/6"
            >
              {pending ? "…" : "Search"}
            </button>
          </div>
          {results !== null && (
            <div className="mt-1 border border-line bg-surface">
              {results.length === 0 ? (
                <div className="px-2 py-1.5 text-[13px] text-ink-muted">No matches.</div>
              ) : (
                results.map((hit) => (
                  <button
                    key={hit.slug}
                    type="button"
                    onClick={() => {
                      setSelected(hit);
                      setResults(null);
                    }}
                    className="block w-full px-2 py-1.5 text-left text-[13px] hover:bg-[#F4F2EC]"
                  >
                    {hit.name}{" "}
                    <span className="type-data text-ink-muted">
                      ({hit.kind} · {hit.slug})
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {error ? <p className={errorClass}>{error}</p> : null}
    </div>
  );
}
