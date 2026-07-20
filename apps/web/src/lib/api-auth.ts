import { canExport } from "@continuum/shared";
import {
  authenticateApiKey,
  checkRateLimit,
  recordApiUsage,
  resolveMemberTier,
} from "@continuum/db";

/**
 * API v1 auth (Phase 33C): Bearer key → sha256 lookup → founding check →
 * rate limit → usage rollup. Keys exist only for founding members; a key
 * whose owner lapsed stops working (checked per request, honestly).
 */

export type ApiContext = { keyId: string; memberId: string };

export function apiError(status: number, message: string): Response {
  return new Response(JSON.stringify({ api_version: "v1", error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function apiJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ api_version: "v1", ...body }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function apiAuth(request: Request): Promise<ApiContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (raw === "") {
    return apiError(401, "Missing Authorization: Bearer <api key>. Keys: /account/api");
  }
  const key = await authenticateApiKey(raw);
  if (key === null) {
    return apiError(401, "Invalid or revoked API key.");
  }
  const tier = await resolveMemberTier(key.memberId);
  if (!canExport(tier)) {
    return apiError(403, "API access is a founding-member feature. See /pricing");
  }
  if (!(await checkRateLimit(key.keyId))) {
    return apiError(429, "Rate limit: 60 requests/minute per key. Slow down and retry.");
  }
  await recordApiUsage(key.keyId);
  return key;
}
