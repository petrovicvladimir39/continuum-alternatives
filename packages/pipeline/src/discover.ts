/**
 * Pure helpers for newsroom/feed discovery (fixture-tested in verify-discover).
 */

/** RSS/Atom autodiscovery: <link rel="alternate" type="application/rss+xml|atom+xml" href="…">. */
export function discoverFeedUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = /rel=["']?([^"'\s>]+)["']?/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const type = /type=["']?([^"'\s>]+)["']?/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    if (rel !== "alternate" || href === "") {
      continue;
    }
    if (type !== "application/rss+xml" && type !== "application/atom+xml") {
      continue;
    }
    try {
      const absolute = new URL(href, baseUrl).href;
      if (!urls.includes(absolute)) {
        urls.push(absolute);
      }
    } catch {
      // unparseable href — skip
    }
  }
  return urls;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
