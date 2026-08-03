"use client";

/**
 * Aceternity template navbar: full-width at top, shrinks into a floating
 * blurred pill past 100px of scroll. Lucide icons for the mobile menu,
 * v2 theme toggle (data-v2-theme) instead of next-themes.
 */

import React, { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useV2Theme } from "@/components/v2/theme";
import { LandingButton } from "./button";
import { LandingLogo } from "./logo";

const NAV_ITEMS = [
  { name: "Features", link: "/#features" },
  { name: "Pricing", link: "/#pricing" },
  { name: "News", link: "/v2/news" },
  { name: "Universe", link: "/v2/universe" },
];

type NavProps = { navItems: typeof NAV_ITEMS; visible: boolean };

export function LandingNavbar() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 100);
  });

  return (
    <motion.div ref={ref} className="fixed inset-x-0 top-0 z-50 w-full">
      <DesktopNav visible={visible} navItems={NAV_ITEMS} />
      <MobileNav visible={visible} navItems={NAV_ITEMS} />
    </motion.div>
  );
}

function ModeToggle() {
  const { theme, setTheme } = useV2Theme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-600 transition hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function DesktopNav({ navItems, visible }: NavProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "44%" : "100%",
        y: visible ? 20 : 0,
      }}
      transition={{ type: "spring", stiffness: 200, damping: 50 }}
      style={{ minWidth: "800px" }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-transparent px-4 py-2 lg:flex",
        visible && "bg-white/80 dark:bg-neutral-950/80",
      )}
    >
      <LandingLogo />
      <motion.div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-zinc-600 lg:flex">
        {navItems.map((navItem, idx) => (
          <Link
            onMouseEnter={() => setHovered(idx)}
            className="relative px-4 py-2 text-neutral-600 dark:text-neutral-300"
            key={navItem.link}
            href={navItem.link}
          >
            {hovered === idx && (
              <motion.div
                layoutId="hovered"
                className="absolute inset-0 h-full w-full rounded-full bg-gray-100 dark:bg-neutral-800"
              />
            )}
            <span className="relative z-20">{navItem.name}</span>
          </Link>
        ))}
      </motion.div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <AnimatePresence mode="popLayout" initial={false}>
          {!visible && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: [0, 0, 1] }}
              exit={{ x: 100, opacity: [0, 0, 0] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <LandingButton as={Link} href="/v2/workspace" variant="secondary" className="hidden md:block">
                Log in
              </LandingButton>
            </motion.div>
          )}
        </AnimatePresence>
        <LandingButton as={Link} href="/v2" variant="dark" className="hidden md:block">
          Open the terminal
        </LandingButton>
      </div>
    </motion.div>
  );
}

function MobileNav({ navItems, visible }: NavProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(10px)" : "none",
        boxShadow: visible
          ? "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset"
          : "none",
        width: visible ? "90%" : "100%",
        y: visible ? 20 : 0,
        borderRadius: open ? "4px" : "2rem",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
      }}
      transition={{ type: "spring", stiffness: 200, damping: 50 }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-2 lg:hidden",
        visible && "bg-white/80 dark:bg-neutral-950/80",
      )}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <LandingLogo />
        <div className="flex items-center gap-2">
          <ModeToggle />
          {open ? (
            <X className="text-black dark:text-white" onClick={() => setOpen(false)} />
          ) : (
            <Menu className="text-black dark:text-white" onClick={() => setOpen(true)} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] dark:bg-neutral-950"
          >
            {navItems.map((navItem) => (
              <Link
                key={navItem.link}
                href={navItem.link}
                onClick={() => setOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300"
              >
                <motion.span className="block">{navItem.name}</motion.span>
              </Link>
            ))}
            <LandingButton
              as={Link}
              onClick={() => setOpen(false)}
              href="/v2"
              variant="primary"
              className="block w-full md:hidden"
            >
              Open the terminal
            </LandingButton>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
