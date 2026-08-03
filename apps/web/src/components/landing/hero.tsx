"use client";

/**
 * Landing hero — Aceternity "startup landing" pattern ported under the
 * 2026-08-03 CLAUDE.md front-page amendment. Word-by-word blur-in headline,
 * falling gradient beams with collision bursts over a rotated grid backdrop,
 * and a framed live-wire panel fed with REAL corpus data (no placeholder
 * copy, no remote images). Brand type and color tokens still apply.
 */

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

export type HeroStats = {
  entities: number;
  countries: number;
  facts: number;
  sources: number;
};

export type HeroWireItem = {
  id: string;
  occurredOn: string;
  title: string;
  meta: string;
};

const HEADLINE = "The map of European alternative assets.";

export function LandingHero({ stats, items }: { stats: HeroStats; items: HeroWireItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={parentRef}
      className="relative -mx-6 flex flex-col items-center justify-center overflow-hidden px-4 py-16 md:px-8 md:py-24"
    >
      <BackgroundGrids />
      <CollisionMechanism
        beamOptions={{ initialX: -400, translateX: 600, duration: 7, repeatDelay: 3 }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        beamOptions={{ initialX: -200, translateX: 800, duration: 4, repeatDelay: 3 }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        beamOptions={{ initialX: 200, translateX: 1200, duration: 5, repeatDelay: 3 }}
        containerRef={containerRef}
        parentRef={parentRef}
      />
      <CollisionMechanism
        beamOptions={{ initialX: 400, translateX: 1400, duration: 6, repeatDelay: 3 }}
        containerRef={containerRef}
        parentRef={parentRef}
      />

      <h1 className="text-balance relative z-20 mx-auto mt-4 max-w-4xl text-center font-serif text-4xl font-medium tracking-tight text-ink md:text-6xl">
        {HEADLINE.split(" ").map((word, index) => (
          <motion.span
            key={index}
            initial={{ filter: "blur(10px)", opacity: 0, y: 10 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="inline-block"
          >
            {word}&nbsp;
          </motion.span>
        ))}
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.5 }}
        className="relative z-20 mx-auto mt-4 max-w-lg px-4 text-center text-[15px] leading-[1.6] text-ink-secondary"
      >
        Private equity, venture, private credit and distressed — every institution
        register-verified, every signal sourced. Deepest coverage in Central and
        South-Eastern Europe.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.7 }}
        className="relative z-20 mb-10 mt-7 flex w-full flex-col items-center justify-center gap-3 px-8 sm:flex-row"
      >
        <Link
          href="/universe"
          className="w-44 rounded-sm bg-accent px-4 py-2 text-center text-[13px] font-medium text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--color-accent)_94%,var(--color-ink))]"
        >
          Explore the universe
        </Link>
        <Link
          href="/pricing"
          className="w-44 rounded-sm border border-line-strong bg-surface px-4 py-2 text-center text-[13px] font-medium text-ink transition hover:bg-ink/5"
        >
          See pricing
        </Link>
      </motion.div>

      {/* Framed live-wire panel — the template's "dashboard screenshot" slot,
          filled with the real corpus instead of an image. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.9, ease: "easeOut" }}
        ref={containerRef}
        className="relative z-20 mx-auto w-full max-w-4xl rounded-[32px] border border-line bg-ground/80 p-2 backdrop-blur-lg md:p-3"
      >
        <div className="rounded-[24px] border border-line-strong bg-[#141311] p-5 text-[#e9e6de] md:p-7">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-white/10 pb-4">
            {(
              [
                [stats.entities, "Institutions"],
                [stats.countries, "Countries"],
                [stats.facts, "Recorded facts"],
                [stats.sources, "Sources monitored"],
              ] as const
            ).map(([value, label]) => (
              <span key={label} className="flex items-baseline gap-2">
                <span className="text-xl font-medium tabular-nums md:text-2xl">
                  {value.toLocaleString("en-US")}
                </span>
                <span className="type-label !text-[#8a867c]">{label}</span>
              </span>
            ))}
          </div>
          <div className="mt-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-white/5 py-2.5 last:border-b-0"
              >
                <span className="text-[12px] tabular-nums text-[#8a867c]">{item.occurredOn}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.title}</span>
                <span className="hidden text-[12px] text-[#8a867c] md:inline">{item.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const BackgroundGrids = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 grid h-full w-full -rotate-45 transform select-none grid-cols-2 gap-10 md:grid-cols-4">
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full bg-gradient-to-b from-transparent via-[#f1efe9] to-transparent">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
      <div className="relative h-full w-full">
        <GridLineVertical className="left-0" />
        <GridLineVertical className="left-auto right-0" />
      </div>
    </div>
  );
};

const CollisionMechanism = ({
  parentRef,
  containerRef,
  beamOptions = {},
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  beamOptions?: {
    initialX?: number;
    translateX?: number;
    initialY?: number;
    translateY?: number;
    rotate?: number;
    className?: string;
    duration?: number;
    delay?: number;
    repeatDelay?: number;
  };
}) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({ detected: false, coordinates: null });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top) {
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;
          setCollision({ detected: true, coordinates: { x: relativeX, y: relativeY } });
          setCycleCollisionDetected(true);
          beamRef.current.style.opacity = "0";
        }
      }
    };
    const animationInterval = setInterval(checkCollision, 50);
    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
        if (beamRef.current) {
          beamRef.current.style.opacity = "1";
        }
      }, 2000);
      setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
      }, 2000);
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: beamOptions.initialY ?? "-200px",
          translateX: beamOptions.initialX ?? "0px",
          rotate: beamOptions.rotate ?? -45,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY ?? "800px",
            translateX: beamOptions.translateX ?? "700px",
            rotate: beamOptions.rotate ?? -45,
          },
        }}
        transition={{
          duration: beamOptions.duration ?? 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay ?? 0,
          repeatDelay: beamOptions.repeatDelay ?? 0,
        }}
        className={[
          "absolute left-96 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-[#96690f] via-[#c9a227] to-transparent",
          beamOptions.className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x + 20}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Explosion = (props: React.HTMLProps<HTMLDivElement>) => {
  const spans = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div {...props} className={["absolute z-50 h-2 w-2", props.className].filter(Boolean).join(" ")}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-[4px] w-10 rounded-full bg-gradient-to-r from-transparent via-[#96690f] to-transparent blur-sm"
      />
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: span.directionX, y: span.directionY, opacity: 0 }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-[#96690f] to-[#c9a227]"
        />
      ))}
    </div>
  );
};

const GridLineVertical = ({ className, offset }: { className?: string; offset?: string }) => {
  return (
    <div
      style={
        {
          "--background": "#fafaf8",
          "--color": "rgba(20, 19, 17, 0.14)",
          "--height": "5px",
          "--width": "1px",
          "--fade-stop": "90%",
          "--offset": offset ?? "150px",
          maskComposite: "exclude",
        } as React.CSSProperties
      }
      className={[
        "absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]",
        "bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]",
        "[background-size:var(--width)_var(--height)]",
        "[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]",
        "[mask-composite:exclude]",
        "z-30",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
};
