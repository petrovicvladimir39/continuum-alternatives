import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createContinuumMcpServer } from "@continuum/pipeline";
import { apiAuth, apiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * /api/mcp (Phase 33D) — Streamable-HTTP-compatible MCP endpoint,
 * STATELESS: each POST carries one JSON-RPC message (or batch); the
 * response is application/json. No session state, no SSE stream — every
 * request re-authenticates via the same API keys as REST v1 and gets a
 * fresh per-request server bound to the key owner's member context.
 */

class StatelessTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private pending = new Map<string | number, (message: JSONRPCMessage) => void>();

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    const id = (message as { id?: string | number }).id;
    if (id !== undefined && this.pending.has(id)) {
      this.pending.get(id)!(message);
      this.pending.delete(id);
    }
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  /** Feed one incoming message; resolves with the response for requests. */
  async handle(message: JSONRPCMessage, timeoutMs = 25_000): Promise<JSONRPCMessage | null> {
    const record = message as { id?: string | number; method?: string };
    if (record.id === undefined || record.method === undefined) {
      // Notification (e.g. notifications/initialized) — no response due.
      this.onmessage?.(message);
      return null;
    }
    const response = new Promise<JSONRPCMessage>((resolve, reject) => {
      this.pending.set(record.id!, resolve);
      setTimeout(() => reject(new Error("MCP handler timeout")), timeoutMs);
    });
    this.onmessage?.(message);
    return response;
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await apiAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Body must be JSON-RPC.");
  }

  const server = createContinuumMcpServer({ memberId: auth.memberId });
  const transport = new StatelessTransport();
  await server.connect(transport);
  try {
    const messages = Array.isArray(body) ? body : [body];
    const responses: JSONRPCMessage[] = [];
    for (const message of messages) {
      const response = await transport.handle(message as JSONRPCMessage);
      if (response !== null) {
        responses.push(response);
      }
    }
    if (responses.length === 0) {
      return new Response(null, { status: 202 }); // notifications only
    }
    return new Response(JSON.stringify(Array.isArray(body) ? responses : responses[0]), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } finally {
    await server.close();
  }
}

/** No server-initiated stream in v1 — documented; clients POST only. */
export async function GET(): Promise<Response> {
  return new Response("MCP endpoint: POST JSON-RPC here. Docs: /docs/mcp", { status: 405 });
}
