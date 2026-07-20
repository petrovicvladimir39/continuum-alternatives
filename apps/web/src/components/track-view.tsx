"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type PlausibleEvent } from "@/lib/analytics";

/** Fires one Plausible event on mount (page-view-scoped custom events). */
export function TrackView({
  event,
  props,
}: {
  event: PlausibleEvent;
  props?: Record<string, string>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      trackEvent(event, props);
    }
  });
  return null;
}
