"use client";

import Link from "next/link";
import { mockFeedPage, MOCK_ENTITY_BY_SLUG, twoLetterMonogram } from "@continuum/shared";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PinProps } from "./logo-map-data";

/**
 * Pin click → shadcn Sheet slide-out with the entity profile. Non-modal so
 * the map behind keeps its pan/zoom state; closing returns you exactly
 * where you were.
 */

const CLASS_LABEL: Record<string, string> = {
  "private-equity": "Private equity",
  "private-credit": "Private credit",
  "real-assets": "Real assets",
  "hedge-funds": "Hedge funds",
  structured: "Structured",
  esoteric: "Esoteric",
  collectibles: "Collectibles",
  climate: "Climate",
  digital: "Digital",
};

export function EntitySheet({
  entity,
  onClose,
}: {
  entity: PinProps | null;
  onClose: () => void;
}) {
  const mock = entity !== null ? MOCK_ENTITY_BY_SLUG.get(entity.slug) : undefined;
  const signals =
    entity !== null && mock !== undefined
      ? mockFeedPage({ pageSize: 5 })
          .items.filter((item) => item.entitySlug === entity.slug)
          .slice(0, 4)
      : [];

  return (
    <Sheet open={entity !== null} onOpenChange={(open) => (!open ? onClose() : undefined)} modal={false}>
      <SheetContent side="right" onInteractOutside={(e) => e.preventDefault()}>
        {entity !== null ? (
          <div className="flex h-full flex-col overflow-y-auto" data-v2-theme="dark">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center border border-line-strong bg-surface text-[16px] font-medium text-ink">
                  {twoLetterMonogram(entity.name)}
                </span>
                <div>
                  <SheetTitle>{entity.name}</SheetTitle>
                  <SheetDescription>
                    {entity.city !== "" ? `${entity.city} · ` : ""}
                    {entity.country}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-secondary">
                  {CLASS_LABEL[entity.cls] ?? entity.cls}
                </span>
                <span className="border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-secondary">
                  {entity.tier}
                </span>
                <span className="border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-secondary">
                  {entity.kind.replace("_", " ")}
                </span>
              </div>
            </SheetHeader>

            <div className="border-t border-line px-5 py-4">
              <p className="type-label mb-2">Key stats</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[11px] text-ink-muted">AUM / book</dt>
                  <dd className="type-data text-ink">
                    {entity.aumM !== null ? `€${Number(entity.aumM).toLocaleString("en-US")}m` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-muted">Strategy</dt>
                  <dd className="type-data text-ink">{mock?.strategy ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-muted">Role</dt>
                  <dd className="type-data capitalize text-ink">{mock?.role ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-muted">Location precision</dt>
                  <dd className="type-data text-ink">city centroid</dd>
                </div>
              </dl>
            </div>

            {signals.length > 0 ? (
              <div className="border-t border-line px-5 py-4">
                <p className="type-label mb-2">Recent signals</p>
                {signals.map((signal) => (
                  <div key={signal.id} className="border-t border-line py-2 first:border-t-0">
                    <span className="text-[11px] tabular-nums text-ink-muted">
                      {signal.occurredOn}
                    </span>
                    <p className="text-[12.5px] leading-snug text-ink">{signal.title}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-auto border-t border-line px-5 py-4">
              <Link
                href={`/companies/${entity.slug}`}
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Open full profile →
              </Link>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
