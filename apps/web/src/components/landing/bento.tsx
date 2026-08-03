"use client";

/**
 * Landing bento grid — Aceternity features pattern under the 2026-08-03
 * front-page amendment. Four cards on a 5-column grid; the visuals are the
 * real product (tier ladder, cobe globe over CEE/SEE, live wire lines, the
 * review gate) — no stock screenshots.
 */

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import createGlobe from "cobe";
import type { HeroWireItem } from "./hero";

export function LandingBento({ facts, items }: { facts: number; items: HeroWireItem[] }) {
  return (
    <div className="-mx-6 border-t border-line bg-surface px-4 py-16 md:px-8 md:py-20">
      <h2 className="mx-auto w-fit text-center font-serif text-2xl font-medium tracking-tight text-ink md:text-4xl">
        Verified at the source
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm text-ink-secondary">
        Every institution enters from an official register. Every market signal
        carries its source. Nothing publishes below its confidence threshold
        without human review.
      </p>
      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:auto-rows-[22rem] md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardContent>
            <CardTitle>Four tiers of provenance</CardTitle>
            <CardDescription>
              Commercial registers and regulators activate immediately; gazettes,
              exchanges and directories stay provisional until website-verified.
            </CardDescription>
          </CardContent>
          <CardBody>
            <TierLadder />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardContent>
            <CardTitle>39 countries, deepest in CEE/SEE</CardTitle>
            <CardDescription>
              From Warsaw to Athens before Paris and London — coverage led by the
              markets others skip.
            </CardDescription>
          </CardContent>
          <CardBody className="flex items-end justify-center">
            <Globe />
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardContent>
            <CardTitle>A wire, not a feed</CardTitle>
            <CardDescription>
              {facts.toLocaleString("en-US")} recorded facts — deals, fund closes,
              NPL sales, insolvencies — each one dated and cited.
            </CardDescription>
          </CardContent>
          <CardBody>
            <div className="mx-4 mb-4 h-full overflow-hidden rounded-lg border border-line bg-ground p-3">
              {items.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-line py-2 last:border-b-0">
                  <span className="text-[11px] tabular-nums text-ink-muted">{item.occurredOn}</span>
                  <p className="truncate text-[12px] font-medium">{item.title}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-3">
          <CardContent>
            <CardTitle>The review gate</CardTitle>
            <CardDescription>
              Extraction proposes; a human approves. Press-derived facts remain
              invisible to the public until they clear review — the map never
              states a guess as fact.
            </CardDescription>
          </CardContent>
          <CardBody>
            <ReviewFlow />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

const TIERS = [
  ["Tier 1", "Commercial registers", "KRS · ARES · ONRC · APR · AJPES"],
  ["Tier 2", "Financial regulators", "KNF · HANFA · CSSF · FINMA · AMF"],
  ["Tier 3", "Official gazettes", "RESA · Bundesanzeiger · BALO"],
  ["Tier 4", "Exchanges & corporate", "GPW · ZSE · BSE · Euronext"],
] as const;

function TierLadder() {
  return (
    <div className="mx-4 mb-4 flex h-full flex-col justify-end gap-2">
      {TIERS.map(([tier, label, examples], i) => (
        <motion.div
          key={tier}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.1 }}
          className="flex items-baseline gap-3 rounded-lg border border-line bg-ground px-4 py-2.5"
        >
          <span className="type-label shrink-0">{tier}</span>
          <span className="text-[13px] font-medium">{label}</span>
          <span className="ml-auto hidden truncate text-[11px] text-ink-muted lg:inline">
            {examples}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const STAGES = ["Extracted", "Proposed", "Reviewed", "Published"] as const;

function ReviewFlow() {
  return (
    <div className="mx-4 mb-6 flex h-full items-end">
      <div className="flex w-full items-center gap-2">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.15 }}
              className={[
                "flex-1 rounded-lg border px-3 py-3 text-center text-[12px] font-medium",
                i === STAGES.length - 1
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-ground text-ink",
              ].join(" ")}
            >
              {stage}
            </motion.div>
            {i < STAGES.length - 1 ? (
              <span className="shrink-0 text-ink-muted" aria-hidden>
                →
              </span>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** CEE/SEE capitals + the western financial centers, sized by coverage depth. */
const GLOBE_MARKERS: { location: [number, number]; size: number }[] = [
  { location: [52.23, 21.01], size: 0.08 }, // Warsaw
  { location: [50.08, 14.44], size: 0.07 }, // Prague
  { location: [44.43, 26.1], size: 0.07 }, // Bucharest
  { location: [37.98, 23.73], size: 0.06 }, // Athens
  { location: [47.5, 19.04], size: 0.06 }, // Budapest
  { location: [42.7, 23.32], size: 0.05 }, // Sofia
  { location: [45.81, 15.98], size: 0.05 }, // Zagreb
  { location: [44.79, 20.45], size: 0.06 }, // Belgrade
  { location: [48.15, 17.11], size: 0.04 }, // Bratislava
  { location: [46.05, 14.51], size: 0.04 }, // Ljubljana
  { location: [54.69, 25.28], size: 0.04 }, // Vilnius
  { location: [56.95, 24.11], size: 0.04 }, // Riga
  { location: [59.44, 24.75], size: 0.04 }, // Tallinn
  { location: [49.61, 6.13], size: 0.05 }, // Luxembourg
  { location: [52.52, 13.4], size: 0.04 }, // Berlin
  { location: [51.51, -0.13], size: 0.04 }, // London
  { location: [48.86, 2.35], size: 0.04 }, // Paris
];

function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 4.7; // start facing Europe
    let raf = 0;
    if (!canvasRef.current) {
      return;
    }
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi,
      theta: 0.35,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 4,
      baseColor: [0.92, 0.91, 0.87],
      markerColor: [23 / 255, 69 / 255, 107 / 255],
      glowColor: [0.98, 0.97, 0.95],
      markers: GLOBE_MARKERS,
    });
    const spin = () => {
      phi += 0.002;
      globe.update({ phi });
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 340, height: 340, maxWidth: "100%", aspectRatio: 1 }}
      className={className}
    />
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className={[
        "flex flex-col justify-between overflow-hidden rounded-[24px] border border-line bg-ground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </motion.div>
  );
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={["min-h-0 flex-1 overflow-hidden", className].filter(Boolean).join(" ")}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-sans text-[16px] font-medium">{children}</h3>;
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-secondary">{children}</p>;
}
