"use client";

import Link from "next/link";
import { HoverLift } from "@/components/redesign/motion";
import { EntityLogo } from "@/components/ui/entity-logo";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";

/** Related-entity cards: logo-avatar + hover lift; related logic unchanged. */

export type RelatedHit = {
  id: string;
  name: string;
  href: string | null;
  kindLabel: string;
  countryLabel: string | null;
  tags: string[];
};

function CardBody({ hit }: { hit: RelatedHit }) {
  return (
    <Card size="sm" className="h-full rounded-md ring-0 border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3 px-3">
        <EntityLogo name={hit.name} logoUrl={null} size="md" />
        <div className="min-w-0">
          <div className="type-h3 truncate">{hit.name}</div>
          <p className="type-small mt-0.5 text-ink-muted">
            {hit.kindLabel}
            {hit.countryLabel !== null ? ` · ${hit.countryLabel}` : ""}
          </p>
          {hit.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hit.tags.slice(0, 3).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function RelatedCards({ hits }: { hits: RelatedHit[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {hits.map((hit) => (
        <HoverLift key={hit.id}>
          {hit.href !== null ? (
            <Link href={hit.href} className="block h-full">
              <CardBody hit={hit} />
            </Link>
          ) : (
            <CardBody hit={hit} />
          )}
        </HoverLift>
      ))}
    </div>
  );
}
