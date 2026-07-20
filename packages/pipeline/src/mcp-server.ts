import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  getPublicProfile,
  listAskFeed,
  listClassificationsForEntity,
  listWatchlist,
  searchPublic,
  strategyCoverage,
  type PublicKind,
} from "@continuum/db";
import { assetClassBySlug, CHANNELS, meetsCoverageThreshold } from "@continuum/shared";

/**
 * The Continuum MCP server (Phase 33D) — READ-ONLY tools over the public
 * record, mirroring the REST v1 shapes. Every tool output carries source
 * names/URLs so agents can cite what they read. Constructed per-request
 * with the authenticated key's member context; my_watchlist is the only
 * member-scoped tool and sees ONLY the key owner's own watchlist.
 *
 * Tool descriptions are written for AGENT consumption: precise contracts,
 * parameter semantics spelled out, honest coverage caveats.
 */

const ORIGIN = "https://continuumalternatives.com";
const PUBLIC_KINDS: PublicKind[] = ["organization", "fund_vehicle", "deal", "event"];

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

const TOOLS = [
  {
    name: "search_entities",
    description:
      "Search the Continuum Alternatives record of ~14,600 register-verified European alternative-asset entities (PE/VC firms, credit funds, servicers, debtors, deals, funds, events) by name or alias. Returns matching ACTIVE entities with slug (use with get_entity/get_timeline), kind, country, tags, and profile URL. Coverage is deepest in Central and South-Eastern Europe.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or alias text, e.g. 'Uljanik' or 'B2 Kapital'." },
        kind: {
          type: "string",
          enum: ["organization", "fund_vehicle", "deal", "event"],
          description: "Optional filter to one entity kind.",
        },
        country: { type: "string", description: "Optional ISO-2 country code filter, e.g. 'RS'." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_entity",
    description:
      "Full profile of one entity by slug: identity, tags, APPROVED taxonomy classifications, website/city/founded year, the steward's own statement when present, and record stats (fact count, connection count, latest activity date). Use search_entities first when you only have a name.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Entity slug from search_entities." } },
      required: ["slug"],
    },
  },
  {
    name: "get_timeline",
    description:
      "The entity's APPROVED timeline facts in date order — insolvencies, asset sales, deals, mandates — each with occurred_on date and its SOURCE (name + URL, or 'internal record'). Cite these sources when reporting facts. Optional since (YYYY-MM-DD) filters to facts occurring on/after that date.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Entity slug." },
        since: { type: "string", description: "Optional YYYY-MM-DD lower bound on occurred_on." },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_facts",
    description:
      "Newest APPROVED facts across the whole record, each with its entity and source. Filters: channel (one of distressed, private_credit, vc_founders, pe, lp_institutional, vendors), asset_class (taxonomy slug like private_equity, private_credit, real_assets), country (ISO-2), since (YYYY-MM-DD, recorded date), limit (max 200, default 50).",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: [...CHANNELS], description: "Audience channel filter." },
        asset_class: { type: "string", description: "Taxonomy asset-class slug." },
        country: { type: "string", description: "ISO-2 country code." },
        since: { type: "string", description: "YYYY-MM-DD — facts RECORDED on/after this date." },
        limit: { type: "number", description: "Max rows, ≤200 (default 50)." },
      },
    },
  },
  {
    name: "get_coverage",
    description:
      "The honest coverage table: approved entity counts and 90-day signal counts per (asset class, strategy), with a covered flag (≥15 entities OR ≥10 signals/90d). Use it to judge whether the record can answer a question before asserting completeness.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "my_watchlist",
    description:
      "The API key owner's OWN watched entities with latest recorded activity dates. Scoped strictly to the authenticated key — returns nobody else's data.",
    inputSchema: { type: "object", properties: {} },
  },
];

/** Per-request server bound to the authenticated member. */
export function createContinuumMcpServer(context: { memberId: string }): Server {
  const server = new Server(
    { name: "continuum-alternatives", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    switch (request.params.name) {
      case "search_entities": {
        const query = String(args.query ?? "").trim();
        if (query === "") {
          return errorResult("query is required");
        }
        let hits = await searchPublic(query);
        if (typeof args.kind === "string") {
          hits = hits.filter((hit) => hit.kind === args.kind);
        }
        if (typeof args.country === "string" && args.country !== "") {
          hits = hits.filter((hit) => hit.country === String(args.country).toUpperCase());
        }
        return textResult({
          results: hits.map((hit) => ({
            slug: hit.slug,
            kind: hit.kind,
            name: hit.name,
            country: hit.country,
            tags: hit.tags,
            url: `${ORIGIN}${hit.href ?? ""}`,
          })),
          total: hits.length,
        });
      }
      case "get_entity": {
        const profile = await profileBySlug(String(args.slug ?? ""));
        if (profile === null) {
          return errorResult("No active entity with that slug.");
        }
        const classifications = (await listClassificationsForEntity(profile.entity.id)).filter(
          (row) => row.status === "approved",
        );
        return textResult({
          slug: profile.entity.slug,
          kind: profile.entity.kind,
          name: profile.entity.name,
          country: profile.entity.country,
          summary: profile.entity.summary,
          tags: profile.tags,
          classifications: classifications.map((row) => ({
            asset_class: row.assetClass,
            strategy: row.strategy === "" ? null : row.strategy,
          })),
          website: profile.organization?.website ?? null,
          city: profile.organization?.hqCity ?? null,
          founded_year: profile.organization?.foundedYear ?? null,
          steward_statement: profile.organization?.stewardStatement ?? null,
          stats: {
            facts: profile.factsCount,
            connections: profile.connectionsCount,
            latest_activity_on: profile.latestActivityOn,
          },
          url: `${ORIGIN}/companies/${profile.entity.slug}`,
        });
      }
      case "get_timeline": {
        const profile = await profileBySlug(String(args.slug ?? ""));
        if (profile === null) {
          return errorResult("No active entity with that slug.");
        }
        const since = typeof args.since === "string" ? args.since : "";
        const facts = profile.facts
          .filter((fact) => since === "" || fact.occurredOn >= since)
          .map((fact) => ({
            occurred_on: fact.occurredOn,
            title: fact.title,
            body: fact.body,
            channels: fact.channels,
            source:
              fact.citation === null
                ? { name: "internal record", url: null }
                : { name: fact.citation.sourceName, url: fact.citation.url },
          }));
        return textResult({ entity: profile.entity.name, facts, total: facts.length });
      }
      case "list_facts": {
        const channel = typeof args.channel === "string" ? args.channel : "";
        if (channel !== "" && !(CHANNELS as readonly string[]).includes(channel)) {
          return errorResult(`channel must be one of: ${CHANNELS.join(", ")}`);
        }
        const assetClass = typeof args.asset_class === "string" ? args.asset_class : "";
        if (assetClass !== "" && assetClassBySlug(assetClass) === null) {
          return errorResult("unknown asset_class slug");
        }
        const since = typeof args.since === "string" ? args.since : "";
        const sinceMs = since === "" ? null : Date.parse(`${since}T00:00:00Z`);
        const limit = Math.min(200, Math.max(1, Number(args.limit ?? 50) || 50));
        const feed = await listAskFeed({
          ...(channel !== "" ? { channels: [channel] } : {}),
          ...(assetClass !== "" ? { assetClasses: [assetClass] } : {}),
          ...(typeof args.country === "string" && args.country !== ""
            ? { countries: [String(args.country).toUpperCase()] }
            : {}),
          ...(sinceMs !== null && !Number.isNaN(sinceMs)
            ? { recordedWithinHours: Math.max(1, Math.ceil((Date.now() - sinceMs) / 3_600_000)) }
            : {}),
          limit,
        });
        return textResult({
          facts: feed.items.map((item) => ({
            occurred_on: item.occurredOn,
            title: item.title,
            fact_type: item.factType,
            entity: { name: item.entityName, slug: item.entitySlug, country: item.entityCountry },
            source: { name: item.sourceName, url: item.sourceUrl },
          })),
          total_matching: feed.total,
          returned: feed.items.length,
        });
      }
      case "get_coverage": {
        const rows = await strategyCoverage();
        return textResult({
          note: "covered = ≥15 approved entities OR ≥10 signals in 90 days. Uncovered cells mean the record is thin there — say so rather than extrapolating.",
          coverage: rows.map((row) => ({
            asset_class: row.assetClass,
            strategy: row.strategy === "" ? "(class level)" : row.strategy,
            entities: row.entities,
            signals_90d: row.signals,
            covered: meetsCoverageThreshold({ entities: row.entities, signals: row.signals }),
          })),
        });
      }
      case "my_watchlist": {
        const rows = await listWatchlist(context.memberId);
        return textResult({
          watchlist: rows.map((row) => ({
            name: row.name,
            slug: row.slug,
            country: row.country,
            latest_activity_on: row.latestActivity,
            url: row.href === null ? null : `${ORIGIN}${row.href}`,
          })),
          total: rows.length,
        });
      }
      default:
        return errorResult(`Unknown tool: ${request.params.name}`);
    }
  });

  return server;
}

async function profileBySlug(slug: string) {
  if (slug === "") {
    return null;
  }
  for (const kind of PUBLIC_KINDS) {
    const profile = await getPublicProfile(slug, kind);
    if (profile !== null) {
      return profile;
    }
  }
  return null;
}
