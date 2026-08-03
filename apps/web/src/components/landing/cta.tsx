"use client";

/**
 * Landing CTA band — Aceternity pattern under the 2026-08-03 front-page
 * amendment. Quiet full-bleed close with the two real calls to action.
 */

import Link from "next/link";
import { motion } from "motion/react";

export function LandingCta() {
  return (
    <div className="relative -mx-6 mt-4 overflow-hidden border-t border-line bg-surface px-6 py-16 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px)] bg-[size:64px_100%] opacity-40"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <h2 className="font-serif text-2xl font-medium tracking-tight md:text-4xl">
          See the market others map by hand.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-secondary">
          The weekly digest carries the wire — fund closes, NPL trades,
          insolvencies — with every fact linked to its source.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/subscribe"
            className="w-44 rounded-sm bg-accent px-4 py-2 text-center text-[13px] font-medium text-accent-ink transition hover:bg-[color-mix(in_srgb,var(--color-accent)_94%,var(--color-ink))]"
          >
            Get the digest
          </Link>
          <Link
            href="/universe"
            className="w-44 rounded-sm border border-line-strong bg-surface px-4 py-2 text-center text-[13px] font-medium text-ink transition hover:bg-ink/5"
          >
            Explore the universe
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
