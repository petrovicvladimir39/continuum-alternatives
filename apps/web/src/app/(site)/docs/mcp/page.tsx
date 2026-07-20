import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP server",
  description:
    "Connect Claude or any MCP client to the Continuum Alternatives record — cited, source-linked answers about European alternative assets.",
};

/** /docs/mcp (Phase 33D) — connection instructions + the full tool list. */

const TOOLS: { name: string; params: string; returns: string }[] = [
  {
    name: "search_entities",
    params: "query (text) · kind? · country? (ISO-2)",
    returns: "Matching active entities with slug, kind, country, tags, profile URL.",
  },
  {
    name: "get_entity",
    params: "slug",
    returns: "Full profile: identity, tags, approved classifications, stats, steward statement.",
  },
  {
    name: "get_timeline",
    params: "slug · since? (YYYY-MM-DD)",
    returns: "Approved facts in date order, EACH with source name + URL.",
  },
  {
    name: "list_facts",
    params: "channel? · asset_class? · country? · since? · limit? (≤200)",
    returns: "Newest approved facts across the record, entity + source attached.",
  },
  {
    name: "get_coverage",
    params: "—",
    returns: "The taxonomy coverage table — which asset classes carry real entity/signal depth.",
  },
  {
    name: "my_watchlist",
    params: "—",
    returns: "The key owner's watched entities with latest activity (scoped to YOUR key).",
  },
];

export default function McpDocsPage() {
  return (
    <div className="max-w-3xl py-12">
      <h1 className="type-h1">MCP server</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-[1.6] text-ink-secondary">
        Your AI can query Continuum. The record — register-verified entities, cited facts,
        approved relationships — is exposed over the Model Context Protocol, so Claude and any
        MCP-capable agent can answer from it with sources attached.
      </p>

      <h2 className="type-h2 mt-8">Connect</h2>
      <p className="mt-2 text-[13px] text-ink-secondary">
        Endpoint: <code className="type-data border border-line bg-surface px-1">https://continuumalternatives.com/api/mcp</code>{" "}
        (Streamable HTTP) · auth via an API key from{" "}
        <Link href="/account/api" className="text-accent hover:underline">
          /account/api
        </Link>{" "}
        as a Bearer header.
      </p>
      <p className="type-label mt-4">Claude (claude.ai / Claude Desktop custom connector)</p>
      <pre className="type-data mt-1 overflow-x-auto border border-line bg-surface p-3 text-[12px] leading-[1.6]">
        {`URL:    https://continuumalternatives.com/api/mcp
Header: Authorization: Bearer ca_live_...`}
      </pre>
      <p className="type-label mt-4">Generic MCP client (TypeScript SDK)</p>
      <pre className="type-data mt-1 overflow-x-auto border border-line bg-surface p-3 text-[12px] leading-[1.6]">
        {`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://continuumalternatives.com/api/mcp"),
  { requestInit: { headers: { Authorization: "Bearer ca_live_..." } } },
);
const client = new Client({ name: "my-agent", version: "1.0.0" });
await client.connect(transport);
const result = await client.callTool({ name: "search_entities", arguments: { query: "uljanik" } });`}
      </pre>

      <h2 className="type-h2 mt-8">Tools</h2>
      <div className="mt-3 space-y-4">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="border-t border-line pt-3">
            <p className="type-data text-[13px] font-medium">{tool.name}</p>
            <p className="type-small mt-1 text-ink-muted">Parameters: {tool.params}</p>
            <p className="mt-1 text-[13px] text-ink-secondary">{tool.returns}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-2xl border-t border-line pt-3 text-[13px] leading-[1.6] text-ink-secondary">
        Same limits and coverage as the REST API (60 req/min/key, read-only, approved data only —
        see{" "}
        <Link href="/docs/api" className="text-accent hover:underline">
          /docs/api
        </Link>
        ). Tool outputs always carry source names and URLs, so your agent can cite what it read.
      </p>
    </div>
  );
}
