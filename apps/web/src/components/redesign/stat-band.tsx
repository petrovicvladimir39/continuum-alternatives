"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Header key-stat row. Count-up is an ENHANCEMENT only: SSR markup carries
 * the final value (SEO + no-JS correct), the mount animation runs 0→target
 * for genuine counts only (never years, dates, or monetary strings — those
 * render verbatim; no arithmetic ever happens on amounts), and a fallback
 * timer guarantees the final value even where rAF is throttled.
 */

export type StatItem = { value: string; label: string; countUp?: boolean };

function CountUp({ target }: { target: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (reduce || target === 0) {
      return;
    }
    setDisplay(0);
    const controls = animate(0, target, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => setDisplay(target),
    });
    const guarantee = setTimeout(() => setDisplay(target), 800);
    return () => {
      controls.stop();
      clearTimeout(guarantee);
    };
  }, [target, reduce]);

  return <span className="tabular-nums">{display.toLocaleString("en-US")}</span>;
}

export function AnimatedStatBand({ items }: { items: StatItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      {items.map((item) => {
        const numeric =
          item.countUp === true && /^\d{1,6}$/.test(item.value) ? Number(item.value) : null;
        return (
          <div key={item.label}>
            <div className="text-[22px] leading-[1.2] font-medium tabular-nums">
              {numeric !== null ? <CountUp target={numeric} /> : item.value}
            </div>
            <div className="type-label mt-1">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}
