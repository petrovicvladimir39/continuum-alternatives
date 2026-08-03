"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { monogramFor } from "@continuum/shared";

/**
 * Dealroom-style newsfeed timeline: central spine with accent dots, cards
 * alternating left/right on desktop, stacked on mobile. Restrained register —
 * 1px borders, class-accent kicker (dot + text, never a filled pill), serif
 * nowhere but where the record demands it. Mount-time stagger; hover lift;
 * prefers-reduced-motion renders static.
 */

export type FeedCard = {
  id: string;
  headline: string;
  contextLine: string | null;
  entityName: string;
  entityHref: string | null;
  metaLine: string;
  kickerLabel: string;
  /** CSS color value for the class/channel accent (token var). */
  accent: string;
  relativeTime: string;
  sourceName: string | null;
  sourceUrl: string | null;
};

function Card({ card }: { card: FeedCard }) {
  const body = (
    <div className="rounded-md border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-ground">
          <span className="font-serif text-[14px] font-medium text-ink">
            {monogramFor(card.entityName)}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug font-medium text-ink">{card.headline}</p>
          <p className="type-small mt-1 text-ink-muted">{card.metaLine}</p>
          {card.contextLine !== null ? (
            <p className="type-small mt-1.5 text-ink-secondary">{card.contextLine}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.025em] uppercase"
              style={{ color: card.accent }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: card.accent }}
              />
              {card.kickerLabel}
            </span>
            <span className="type-data text-ink-muted">{card.relativeTime}</span>
            {card.sourceName !== null ? (
              <span className="type-small text-ink-muted">
                {card.sourceUrl !== null ? (
                  <a
                    href={card.sourceUrl}
                    rel="noopener noreferrer"
                    className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {card.sourceName}
                  </a>
                ) : (
                  card.sourceName
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
  return card.entityHref !== null ? (
    <Link href={card.entityHref} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function FeedTimeline({ cards }: { cards: FeedCard[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      {/* Central spine (desktop) / left rail (mobile). */}
      <div className="absolute top-1 bottom-1 left-[7px] w-px bg-line-strong md:left-1/2" />
      <ol className="space-y-4">
        {cards.map((card, index) => {
          const side = index % 2 === 0 ? "left" : "right";
          return (
            <motion.li
              key={card.id}
              className="relative"
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 8 },
                    animate: { opacity: 1, y: 0 },
                    transition: {
                      duration: 0.2,
                      delay: Math.min(index * 0.045, 0.5),
                      ease: "easeOut" as const,
                    },
                  })}
            >
              {/* Spine dot, colored by the card's class accent. */}
              <span
                className="absolute top-5 left-[3px] z-10 h-[9px] w-[9px] rounded-full border-2 border-surface md:left-[calc(50%-4.5px)]"
                style={{ background: card.accent }}
              />
              <motion.div
                className={`pl-7 md:w-[calc(50%-24px)] md:pl-0 ${
                  side === "left" ? "md:mr-auto" : "md:ml-auto"
                }`}
                {...(reduce ? {} : { whileHover: { y: -2 }, transition: { duration: 0.15 } })}
              >
                <Card card={card} />
              </motion.div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
