"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Visible, dismissable "PROTOTYPE — mock data" ribbon on every v2 page, so
 * the v2 surface (its imagery and mock claims) is never mistaken for the
 * live record. Dismissal persists per session.
 */
export function PrototypeRibbon() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem("v2-ribbon-dismissed") === "1");
  }, []);

  if (dismissed) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-3 border-b border-line bg-surface px-4 py-1.5">
      <span className="type-mono text-ink-secondary">
        PROTOTYPE — MOCK DATA · entity counts are real (30,500 / 39 countries); feed, thread and
        report content is fixture data
      </span>
      <button
        type="button"
        aria-label="Dismiss prototype notice"
        className="cursor-pointer text-ink-muted transition-colors hover:text-ink"
        onClick={() => {
          window.sessionStorage.setItem("v2-ribbon-dismissed", "1");
          setDismissed(true);
        }}
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
