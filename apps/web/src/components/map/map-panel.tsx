"use client";

import { useState } from "react";
import Link from "next/link";
import type { MapCity, MapEntity, MapEntityCard } from "@continuum/db";
import { EntityLogo } from "@/components/ui/entity-logo";
import { StatBlock } from "@/components/ui/stat-block";
import { Tag } from "@/components/ui/tag";
import { countryName, KIND_LABELS_ANY } from "@/lib/public-labels";

const CAPITAL_TAG_VARIANTS = {
  equity: "equity",
  credit: "credit",
  distressed: "distressed",
  neutral: "neutral",
} as const;

function CapitalTags({ types }: { types: string[] }) {
  return (
    <>
      {types
        .filter((type) => type !== "neutral")
        .map((type) => (
          <Tag
            key={type}
            variant={CAPITAL_TAG_VARIANTS[type as keyof typeof CAPITAL_TAG_VARIANTS] ?? "neutral"}
          >
            {type}
          </Tag>
        ))}
    </>
  );
}

/** City mode: the firm list. Clicking a row opens the in-panel entity card. */
function CityList({
  city,
  members,
  onSelectEntity,
}: {
  city: MapCity;
  members: MapEntity[];
  onSelectEntity: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q === "" ? members : members.filter((m) => m.name.toLowerCase().includes(q));

  return (
    <>
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-serif text-[20px] leading-[1.2] font-medium">{city.city}</h2>
        <p className="type-label mt-1">
          {countryName(city.country) ?? city.country} · {city.count} firm
          {city.count === 1 ? "" : "s"}
        </p>
        {members.length > 12 ? (
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter firms…"
            className="mt-2 w-full rounded-sm border border-line bg-ground px-2 py-1.5 text-[13px] placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        ) : null}
      </div>
      <div>
        {filtered.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => {
              onSelectEntity(member.id);
            }}
            className="flex w-full items-center gap-2.5 border-b border-line px-4 py-2.5 text-left hover:bg-[#F4F2EC]"
          >
            <EntityLogo name={member.name} logoUrl={member.logoUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{member.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className="type-label">{KIND_LABELS_ANY[member.kind] ?? member.kind}</span>
                <CapitalTags types={member.capitalTypes.slice(0, 1)} />
              </span>
            </span>
            <span className="type-data text-ink-muted">{member.factsCount}</span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-ink-muted">No firms match.</p>
        ) : null}
      </div>
    </>
  );
}

/**
 * Entity card — the core interactivity ask: hover = peek (tooltip), click on
 * a firm row = THIS in-panel card, and only the explicit button navigates to
 * the full profile page.
 */
function EntityCardView({
  card,
  cityName,
  onBack,
}: {
  card: MapEntityCard;
  cityName: string;
  onBack: () => void;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <EntityLogo name={card.name} logoUrl={card.logoUrl} size="md" />
        <div className="min-w-0">
          <h2 className="font-serif text-[18px] leading-[1.25] font-medium">{card.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="type-label">{KIND_LABELS_ANY[card.kind] ?? card.kind}</span>
            {card.country !== null ? (
              <>
                <span className="text-ink-muted">·</span>
                <span className="type-label">{countryName(card.country)}</span>
              </>
            ) : null}
            <CapitalTags types={card.capitalTypes} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-8 border-y border-line py-3">
        <StatBlock value={String(card.factsCount)} label="Facts" />
        <StatBlock value={String(card.connectionsCount)} label="Connections" />
        {card.firstSeenYear !== null ? (
          <StatBlock value={String(card.firstSeenYear)} label="First seen" />
        ) : null}
      </div>

      {card.latestFact !== null ? (
        <div className="mt-4">
          <h3 className="type-label">Latest</h3>
          <p className="mt-1.5 text-[13px] leading-[1.45] font-medium">{card.latestFact.title}</p>
          <p className="type-data mt-1 text-ink-muted">
            {card.latestFact.occurredOn}
            {card.latestFact.sourceName !== null ? ` · ${card.latestFact.sourceName}` : ""}
          </p>
        </div>
      ) : null}

      {card.connections.length > 0 ? (
        <div className="mt-4">
          <h3 className="type-label">Connections</h3>
          <ul className="mt-1.5 space-y-1">
            {card.connections.map((connection, index) => (
              <li key={index} className="text-[13px] leading-[1.45]">
                <span className="text-ink-muted">{connection.phrase}</span> {connection.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-left text-[13px] hover:border-accent hover:text-accent"
        >
          ← Back to {cityName}
        </button>
        {card.href !== null ? (
          <Link
            href={card.href}
            className="w-full rounded-sm border border-accent bg-accent px-3 py-2 text-center text-[13px] font-medium text-accent-ink hover:opacity-90"
          >
            Open full profile →
          </Link>
        ) : null}
        <CardWatchButton entityId={card.id} />
      </div>
    </div>
  );
}

/**
 * In-map watch control (Phase 28D). POSTs /api/watchlist; a 401 swaps to
 * the quiet "Sign in to watch" link (no modal); 503 (identity off) hides it.
 */
function CardWatchButton({ entityId }: { entityId: string }) {
  const [state, setState] = useState<"idle" | "watching" | "unwatched" | "signin" | "hidden">("idle");
  if (state === "hidden") {
    return null;
  }
  if (state === "signin") {
    return (
      <Link href="/sign-in" className="text-center text-[12px] text-ink-muted hover:text-accent">
        Sign in to watch
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        void fetch("/api/watchlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entityId }),
        }).then(async (response) => {
          if (response.status === 401) {
            setState("signin");
          } else if (response.status === 503) {
            setState("hidden");
          } else if (response.ok) {
            const payload = (await response.json()) as { watching: boolean };
            setState(payload.watching ? "watching" : "unwatched");
          }
        });
      }}
      className="w-full rounded-sm border border-line-strong px-3 py-1.5 text-center text-[12px] font-medium text-ink hover:border-accent hover:text-accent"
    >
      {state === "watching" ? "Watching ✓" : state === "unwatched" ? "Watch" : "Watch"}
    </button>
  );
}

export type PanelState =
  | { mode: "city"; cityKey: string }
  | { mode: "entity"; entityId: string; cityKey: string };

export function MapPanel({
  state,
  cities,
  entities,
  card,
  onSelectEntity,
  onBackToCity,
  onClose,
}: {
  state: PanelState;
  cities: MapCity[];
  entities: MapEntity[];
  card: MapEntityCard | null;
  onSelectEntity: (id: string) => void;
  onBackToCity: () => void;
  onClose: () => void;
}) {
  const city = cities.find((c) => c.key === state.cityKey);
  if (city === undefined) {
    return null;
  }
  const members = entities.filter((entity) => entity.cityKey === city.key);

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-10 w-[360px] overflow-y-auto border-l border-line bg-surface">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="absolute top-2.5 right-3 z-20 text-[16px] leading-none text-ink-muted hover:text-ink"
      >
        ×
      </button>
      {state.mode === "city" ? (
        <CityList city={city} members={members} onSelectEntity={onSelectEntity} />
      ) : card === null ? (
        <p className="px-4 py-4 text-[13px] text-ink-muted">Loading…</p>
      ) : (
        <EntityCardView card={card} cityName={city.city} onBack={onBackToCity} />
      )}
    </aside>
  );
}
