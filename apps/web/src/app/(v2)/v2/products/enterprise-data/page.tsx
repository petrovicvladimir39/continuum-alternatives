import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Enterprise Data & MCP — Products" };

/**
 * P5 — the REAL API + MCP documentation restyled for v2. Endpoint list
 * mirrors /docs/api (Phase 33C): everything listed exists; nothing exists
 * that is not listed.
 */

const ENDPOINTS: { path: string; params: string; returns: string }[] = [
  {
    path: "GET /api/v1/entities",
    params: "kind · country (ISO-2) · tag · class|strategy (taxonomy slug) · q · page",
    returns: "Paginated active entities: slug, name, country, summary, tags, url.",
  },
  {
    path: "GET /api/v1/entities/{slug}",
    params: "—",
    returns: "Profile: identity, tags, approved classifications, website/city/founded, steward statement, stats.",
  },
  {
    path: "GET /api/v1/entities/{slug}/timeline",
    params: "—",
    returns: "Approved facts in date order, each with its source name + URL.",
  },
  {
    path: "GET /api/v1/entities/{slug}/edges",
    params: "—",
    returns: "Approved relationships: edge type, direction, phrase, counterpart + URL, role, started_on.",
  },
  {
    path: "GET /api/v1/facts",
    params: "channel · class · country · since (YYYY-MM-DD) · limit (≤200)",
    returns: "Approved facts across the record, newest first, entity + source attached.",
  },
  {
    path: "GET /api/v1/search",
    params: "q (required)",
    returns: "Name/alias matches over active public entities; match = text|semantic.",
  },
];

const MCP_TOOLS: [string, string][] = [
  ["search_entities", "Find entities by name, alias, geography or classification."],
  ["get_entity", "Full profile with provenance-linked classifications."],
  ["get_timeline", "The entity's approved fact timeline, cited."],
  ["get_edges", "Relationship graph around an entity."],
  ["query_facts", "Cross-record fact queries by channel, class, country, date."],
];

export default function EnterpriseDataPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      <div className="type-label">Products</div>
      <h1 className="type-display mt-2">Enterprise Data & MCP</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Read-only JSON access to the record. Every fact carries its source; shapes are stable
        within v1 — breaking changes mean a v2 namespace, never silent edits. The same data speaks
        MCP for agentic access.
      </p>

      <h2 className="type-h2 mt-10">Authentication</h2>
      <p className="type-small mt-2 text-ink-secondary">
        Founding members issue keys in the workspace (the raw key is shown once; a hash is
        stored). Send it as:
      </p>
      <pre className="type-mono mt-3 overflow-x-auto border border-line bg-surface p-3 leading-[1.7]">
        {`curl -H "Authorization: Bearer ca_live_..." \\
  "https://continuumalternatives.com/api/v1/search?q=uljanik"`}
      </pre>
      <p className="type-small mt-2 text-ink-secondary">
        60 requests/minute per key (HTTP 429 beyond). Usage metered daily. No write endpoints
        exist in v1.
      </p>

      <h2 className="type-h2 mt-10">Endpoints</h2>
      <div className="mt-3 border border-line">
        {ENDPOINTS.map((e) => (
          <div key={e.path} className="border-b border-line px-4 py-3 last:border-b-0">
            <p className="type-data font-medium">{e.path}</p>
            <p className="type-small mt-1 text-ink-muted">Parameters: {e.params}</p>
            <p className="type-small mt-1 text-ink-secondary">{e.returns}</p>
          </div>
        ))}
      </div>

      <h2 className="type-h2 mt-10">MCP server</h2>
      <p className="type-small mt-2 max-w-[620px] text-ink-secondary">
        Agents connect over the Model Context Protocol at <code className="type-mono border border-line px-1">/api/mcp</code> —
        the same approved-only, cited record, exposed as tools:
      </p>
      <div className="mt-3 border border-line">
        {MCP_TOOLS.map(([name, desc]) => (
          <div key={name} className="flex items-baseline gap-4 border-b border-line px-4 py-2.5 last:border-b-0">
            <code className="type-mono w-[160px] shrink-0">{name}</code>
            <span className="type-small text-ink-secondary">{desc}</span>
          </div>
        ))}
      </div>

      <h2 className="type-h2 mt-10">Data coverage — honestly</h2>
      <p className="type-small mt-2 max-w-[620px] text-ink-secondary">
        The corpus is 30,500 entities across 39 countries, deepest in Central and South-Eastern
        Europe; timeline density varies by country and register accessibility (see{" "}
        <Link href="/v2/coverage" className="underline decoration-dotted hover:text-ink">
          coverage
        </Link>
        ). Facts are approved-only and cited; where the record is thin, responses are short rather
        than padded.
      </p>

      <div className="type-mono mt-10 border border-line px-4 py-2.5 text-ink-muted">
        THE API AND MCP SERVER ARE LIVE PRODUCTION SYSTEMS · THIS PAGE RESTYLES THEIR REAL
        DOCUMENTATION
      </div>
    </div>
  );
}
