"use client";

/**
 * Aceternity template features bento, ported faithfully (neutral palette,
 * rounded-3xl cards, dark variants). Visuals are the real product concepts:
 * tier ladder, cobe globe over Europe, mock wire lines, the review gate.
 */

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";
import { useV2Theme } from "@/components/v2/theme";
import type { WireItem } from "./hero";

export function LandingFeatures({ items }: { items: WireItem[] }) {
  return (
    <div id="features" className="mx-auto w-full bg-white px-4 py-20 dark:bg-neutral-950 md:px-8">
      <Header>
        <h2 className="mx-auto w-fit text-center font-sans text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 md:text-4xl">
          The market, mapped
        </h2>
      </Header>
      <p className="mx-auto mt-4 max-w-lg text-center text-sm text-neutral-600 dark:text-neutral-400">
        One terminal for the institutions, vehicles and signals of European
        private markets — across all nine asset classes.
      </p>
      <div className="mx-auto mt-20 grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[25rem] md:grid-cols-5">
        <Card className="flex flex-col justify-between md:col-span-3">
          <CardContent className="h-40">
            <CardTitle>Verified at the register</CardTitle>
            <CardDescription>
              Institutions enter from commercial registers, regulators, gazettes
              and exchanges — never from rumor.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
            <TierLadder />
          </CardSkeletonBody>
        </Card>

        <Card className="flex flex-col justify-between md:col-span-2">
          <CardContent className="h-40">
            <CardTitle>39 countries, deepest in CEE/SEE</CardTitle>
            <CardDescription>
              Coverage led by the markets others skip — Warsaw to Athens before
              Paris and London.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="flex items-end justify-center">
            <Globe />
          </CardSkeletonBody>
        </Card>

        <Card className="flex flex-col justify-between md:col-span-2">
          <CardContent className="h-40">
            <CardTitle>A wire, not a feed</CardTitle>
            <CardDescription>
              Fund closes, rounds, exits, mandates — dated, sourced and typed
              across nine asset classes.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
            <div className="ml-6 mt-2 h-full w-full rounded-lg border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-800">
              {items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="border-b border-neutral-200 py-2 last:border-b-0 dark:border-neutral-700"
                >
                  <span className="text-[11px] tabular-nums text-neutral-400">{item.when}</span>
                  <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </CardSkeletonBody>
        </Card>

        <Card className="flex flex-col justify-between md:col-span-3">
          <CardContent className="h-40">
            <CardTitle>The review gate</CardTitle>
            <CardDescription>
              Extraction proposes, a human approves. Nothing publishes below its
              confidence threshold — the map never states a guess as fact.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
            <ReviewFlow />
          </CardSkeletonBody>
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
    <div className="mx-6 mb-6 flex h-full flex-col justify-end gap-2">
      {TIERS.map(([tier, label, examples], i) => (
        <motion.div
          key={tier}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.1 }}
          className="flex items-baseline gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-input dark:border-neutral-700 dark:bg-neutral-800 dark:shadow-none"
        >
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-orange-500">
            {tier}
          </span>
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{label}</span>
          <span className="ml-auto hidden truncate text-[11px] text-neutral-400 lg:inline">
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
    <div className="mx-6 mb-8 flex h-full items-end">
      <div className="flex w-full items-center gap-2">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.15 }}
              className={cn(
                "flex-1 rounded-xl border px-3 py-3 text-center text-xs font-bold",
                i === STAGES.length - 1
                  ? "border-orange-500 bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset]"
                  : "border-neutral-200 bg-white text-neutral-700 shadow-input dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:shadow-none",
              )}
            >
              {stage}
            </motion.div>
            {i < STAGES.length - 1 ? (
              <span className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden>
                →
              </span>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** CEE/SEE capitals + western financial centers, sized by coverage depth. */
const GLOBE_MARKERS: { location: [number, number]; size: number }[] = [
  { location: [52.23, 21.01], size: 0.08 },
  { location: [50.08, 14.44], size: 0.07 },
  { location: [44.43, 26.1], size: 0.07 },
  { location: [37.98, 23.73], size: 0.06 },
  { location: [47.5, 19.04], size: 0.06 },
  { location: [42.7, 23.32], size: 0.05 },
  { location: [45.81, 15.98], size: 0.05 },
  { location: [44.79, 20.45], size: 0.06 },
  { location: [48.15, 17.11], size: 0.04 },
  { location: [46.05, 14.51], size: 0.04 },
  { location: [54.69, 25.28], size: 0.04 },
  { location: [56.95, 24.11], size: 0.04 },
  { location: [59.44, 24.75], size: 0.04 },
  { location: [49.61, 6.13], size: 0.05 },
  { location: [52.52, 13.4], size: 0.04 },
  { location: [51.51, -0.13], size: 0.04 },
  { location: [48.86, 2.35], size: 0.04 },
];

function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useV2Theme();

  useEffect(() => {
    let phi = 4.7; // start facing Europe
    let raf = 0;
    if (!canvasRef.current) {
      return;
    }
    const dark = theme === "dark";
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi,
      theta: 0.35,
      dark: dark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: dark ? 6 : 4,
      baseColor: dark ? [0.3, 0.3, 0.3] : [0.92, 0.91, 0.9],
      markerColor: [249 / 255, 115 / 255, 22 / 255],
      glowColor: dark ? [0.15, 0.15, 0.15] : [0.98, 0.97, 0.96],
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
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 340, height: 340, maxWidth: "100%", aspectRatio: 1 }}
      className={className}
    />
  );
}

// ── Template card primitives ────────────────────────────────────────────────

function Header({ children }: { children: React.ReactNode }) {
  return <div className="relative z-20 mx-auto w-fit">{children}</div>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className={cn(
        "group relative isolate overflow-hidden rounded-3xl bg-gray-50 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

function CardSkeletonBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-0 flex-1 overflow-hidden", className)}>{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-base font-medium tracking-tight text-neutral-700 dark:text-neutral-100">
      {children}
    </h3>
  );
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 max-w-xs font-sans text-sm font-normal tracking-tight text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}
