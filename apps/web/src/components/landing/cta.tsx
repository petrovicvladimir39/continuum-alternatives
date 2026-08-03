"use client";

/** Aceternity template closing CTA, ported faithfully. */

import Link from "next/link";
import { motion } from "motion/react";
import { LandingButton } from "./button";

export function LandingCta() {
  return (
    <div
      id="contact"
      className="relative w-full overflow-hidden bg-neutral-50 px-4 py-24 dark:bg-neutral-900 md:px-8 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:64px_100%] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px)]"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-gray-700 dark:text-neutral-200 md:text-6xl">
          Map the market
          <br />
          before it announces itself.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base text-neutral-600 dark:text-neutral-300">
          Built on 32,000+ register-verified institutions across 39 European
          countries — with every signal carrying its source.
        </p>
        <p className="mt-6 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Deepest coverage in Central & South-Eastern Europe
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LandingButton as={Link} href="/v2" variant="dark" className="w-48">
            Open the terminal
          </LandingButton>
          <LandingButton as={Link} href="/v2/news" variant="primary" className="w-48">
            Read the wire
          </LandingButton>
        </div>
      </motion.div>
    </div>
  );
}
