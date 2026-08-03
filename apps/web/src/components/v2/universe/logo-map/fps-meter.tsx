"use client";

import { useEffect, useState } from "react";

/** Debug FPS overlay (?debug=1) — rAF delta over a rolling 1s window. */
export function FpsMeter() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let raf = 0;
    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute right-2 top-2 z-10 border border-line bg-ground/90 px-2 py-1 text-[11px] tabular-nums text-ink">
      {fps} fps
    </div>
  );
}
