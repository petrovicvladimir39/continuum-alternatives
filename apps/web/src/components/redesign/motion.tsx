"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Flagship-redesign motion primitives. Motion law: 150–300ms, ease-out,
 * entrance + hover only — never gratuitous. prefers-reduced-motion renders
 * static equivalents (useReducedMotion), no exceptions.
 */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  // Mount-based (not scroll-gated): content must never stay hidden if
  // IntersectionObserver misbehaves — motion is polish, never a gate.
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Hover-lift wrapper for cards: 1px rise + border emphasis, 150ms. */
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
