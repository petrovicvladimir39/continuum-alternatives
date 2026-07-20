/**
 * Logo resolution (Phase 16) — free and cached. We store only the resolved
 * EXTERNAL favicon URL: Google's s2 favicon service is reliable, Google-cached,
 * and keyless at 128px. Higher-res Clearbit-style logo APIs are paid — skipped.
 * Self-hosting fetched binaries (Cloudflare R2) is BACKLOG; no bytes stored.
 */
export function resolveLogo(website: string | null): string | null {
  if (website === null || website === "") {
    return null;
  }
  let host: string;
  try {
    host = new URL(website).hostname;
  } catch {
    return null;
  }
  if (host === "") {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}
