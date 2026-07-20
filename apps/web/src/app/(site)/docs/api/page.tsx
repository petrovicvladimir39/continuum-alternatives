import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API documentation",
  description:
    "Continuum Alternatives REST API v1 — read-only, cited, versioned access to the European alternative-assets record.",
};

/**
 * /docs/api (Phase 33C) — the complete endpoint reference. Everything
 * listed here exists; nothing exists that is not listed here (no
 * undocumented endpoints — enforced by verify's route inventory).
 */

const ENDPOINTS: { path: string; params: string; returns: string }[] = [
  {
    path: "GET /api/v1/entities",
    params: "kind (organization|fund_vehicle|deal|event, default organization) · country (ISO-2) · tag · class|strategy (taxonomy slug) · q (text) · page",
    returns: "Paginated active entities: slug, name, country, summary, tags, url.",
  },
  {
    path: "GET /api/v1/entities/{slug}",
    params: "—",
    returns: "Profile: identity, tags, approved classifications, website/city/founded, steward statement (if any), stats.",
  },
  {
    path: "GET /api/v1/entities/{slug}/timeline",
    params: "—",
    returns: "Approved facts in date order, each with its source name + URL (or 'internal record').",
  },
  {
    path: "GET /api/v1/entities/{slug}/edges",
    params: "—",
    returns: "Approved relationships: edge type, direction, phrase, counterpart + URL, role, started_on.",
  },
  {
    path: "GET /api/v1/facts",
    params: "channel · class (asset-class slug) · country (ISO-2) · since (YYYY-MM-DD, recorded date) · limit (≤200)",
    returns: "Approved facts across the record, newest first, entity + source attached.",
  },
  {
    path: "GET /api/v1/search",
    params: "q (required)",
    returns: "Name/alias matches over active public entities; match = text|semantic.",
  },
];

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl py-12">
      <h1 className="type-h1">API v1</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-[1.6] text-ink-secondary">
        Read-only JSON access to the record. Every fact carries its source; shapes are stable
        within v1 (breaking changes mean a v2 namespace, never silent edits).
      </p>

      <h2 className="type-h2 mt-8">Authentication</h2>
      <p className="mt-2 text-[13px] leading-[1.6] text-ink-secondary">
        Founding members issue keys on{" "}
        <Link href="/account/api" className="text-accent hover:underline">
          /account/api
        </Link>{" "}
        (the raw key is shown once; we store a hash). Send it as{" "}
        <code className="type-data border border-line bg-surface px-1">
          Authorization: Bearer ca_live_…
        </code>
      </p>
      <pre className="type-data mt-3 overflow-x-auto border border-line bg-surface p-3 text-[12px] leading-[1.6]">
        {`curl -H "Authorization: Bearer ca_live_..." \\
  "https://continuumalternatives.com/api/v1/search?q=uljanik"`}
      </pre>

      <h2 className="type-h2 mt-8">Limits</h2>
      <p className="mt-2 text-[13px] text-ink-secondary">
        60 requests/minute per key (HTTP 429 beyond it). Usage is metered daily per key. No write
        endpoints exist in v1.
      </p>

      <h2 className="type-h2 mt-8">Endpoints</h2>
      <div className="mt-3 space-y-4">
        {ENDPOINTS.map((endpoint) => (
          <div key={endpoint.path} className="border-t border-line pt-3">
            <p className="type-data text-[13px] font-medium">{endpoint.path}</p>
            <p className="type-small mt-1 text-ink-muted">Parameters: {endpoint.params}</p>
            <p className="mt-1 text-[13px] text-ink-secondary">{endpoint.returns}</p>
          </div>
        ))}
      </div>

      <h2 className="type-h2 mt-8">Data coverage — honestly</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-ink-secondary">
        The corpus is ~14,600 register-verified European entities, deepest in Central and
        South-Eastern Europe; timeline density varies by country and register accessibility (see{" "}
        <Link href="/coverage" className="text-accent hover:underline">
          /coverage
        </Link>
        ). Facts are approved-only and cited; where the record is thin, responses are short rather
        than padded.
      </p>

      <p className="mt-8 border-t border-line pt-3 text-[13px] text-ink-secondary">
        Building with an AI agent? The same data speaks MCP —{" "}
        <Link href="/docs/mcp" className="text-accent hover:underline">
          /docs/mcp
        </Link>
        .
      </p>
    </div>
  );
}
