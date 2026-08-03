"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Tag } from "@/components/ui/tag";

/**
 * The editorial half of the flagship page — the record. Serif year heads,
 * every fact cited, dense vertical rail. Motion is a restrained mount-time
 * stagger (180ms, 40ms steps, capped) — deliberately NOT scroll-gated: the
 * record must never depend on IntersectionObserver to become visible.
 */

export type TimelineCitation = {
  sourceName: string | null;
  documentTitle: string | null;
  url: string | null;
} | null;

export type TimelineFact = {
  id: string;
  occurredOn: string;
  title: string;
  body: string | null;
  channels: string[];
  channelVariants: Record<string, "neutral" | "equity" | "credit" | "distressed">;
  citation: TimelineCitation;
  contributedBy: string | null;
};

function Citation({ citation }: { citation: TimelineCitation }) {
  // Citations are the credibility spine — the line renders for every fact.
  if (citation === null) {
    return <p className="type-small mt-1 text-ink-muted">Source: internal record</p>;
  }
  const label = citation.sourceName ?? citation.documentTitle ?? "Source document";
  return (
    <p className="type-small mt-1 text-ink-muted">
      Source:{" "}
      {citation.url !== null ? (
        <a
          href={citation.url}
          rel="noopener noreferrer"
          className="underline decoration-line-strong underline-offset-2 hover:text-accent"
        >
          {label}
        </a>
      ) : (
        label
      )}
    </p>
  );
}

export function ActivityTimeline({ facts }: { facts: TimelineFact[] }) {
  const reduce = useReducedMotion();
  const byYear = new Map<string, TimelineFact[]>();
  for (const fact of facts) {
    const year = fact.occurredOn.slice(0, 4);
    const list = byYear.get(year) ?? [];
    list.push(fact);
    byYear.set(year, list);
  }
  return (
    <div className="mt-4">
      {[...byYear.entries()].map(([year, yearFacts]) => (
        <div key={year} className="mb-2">
          <h3 className="font-serif text-[18px] leading-[1.25] font-medium">{year}</h3>
          <div className="mt-2 border-l border-line-strong">
            {yearFacts.map((fact, index) => (
              <motion.div
                key={fact.id}
                className="relative pb-5 pl-6"
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 6 },
                      animate: { opacity: 1, y: 0 },
                      transition: {
                        duration: 0.18,
                        delay: Math.min(index * 0.04, 0.24),
                        ease: "easeOut" as const,
                      },
                    })}
              >
                <span className="absolute top-[5px] -left-[4.5px] h-2 w-2 rounded-full border border-surface bg-ink-muted" />
                <div className="type-data text-ink-muted">{fact.occurredOn}</div>
                <h4 className="type-h3 mt-0.5">{fact.title}</h4>
                {fact.body !== null && fact.body !== "" ? (
                  <p className="type-small mt-1 max-w-2xl text-ink-secondary">{fact.body}</p>
                ) : null}
                {fact.channels.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {fact.channels.map((channel) => (
                      <Tag key={channel} variant={fact.channelVariants[channel] ?? "neutral"}>
                        {channel}
                      </Tag>
                    ))}
                  </div>
                ) : null}
                <Citation citation={fact.citation} />
                {fact.contributedBy !== null ? (
                  <p className="type-small text-ink-muted">Contributed by {fact.contributedBy}</p>
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
