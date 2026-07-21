"use client";

import { useState } from "react";
import { monogramFor } from "@continuum/shared";

/**
 * Entity logo in a 1px-bordered square. Falls back to a serif monogram on
 * ground when there is no logo URL or the image fails to load (client onError
 * swap — the only reason this is a client component).
 */
const SIZES = { sm: 20, md: 32, lg: 48, xl: 72 } as const;
const FONT = { sm: 11, md: 16, lg: 24, xl: 32 } as const;

export function EntityLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const px = SIZES[size];
  const showImage = logoUrl !== null && !failed;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-ground"
      style={{ width: px, height: px }}
    >
      {showImage ? (
        // Plain <img> on purpose: external favicon URL, no next/image optimization wanted.
        <img
          src={logoUrl}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain"
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        <span
          className="font-serif font-medium text-ink-secondary"
          style={{ fontSize: FONT[size], lineHeight: 1 }}
        >
          {monogramFor(name)}
        </span>
      )}
    </span>
  );
}
