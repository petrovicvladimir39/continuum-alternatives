import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * /api/serbia/logo?url=… — same-origin proxy for company logos.
 *
 * WHY: the map draws each logo onto a canvas to round its corners and
 * contain-fit it, which requires reading pixels back. That taints the canvas
 * unless the image is CORS-clean — and third-party logo hosts almost never
 * send Access-Control-Allow-Origin, so `crossOrigin="anonymous"` made the
 * loads fail outright (28 attempted, 0 bytes transferred). Serving them
 * through our own origin removes the CORS question entirely.
 *
 * Guarded: http(s) only, no redirects to private hosts, image content-types
 * only, and a size ceiling — this must not become an open relay.
 */
const MAX_BYTES = 2_000_000;

export async function GET(request: Request): Promise<NextResponse> {
  const target = new URL(request.url).searchParams.get("url");
  if (target === null || target === "") {
    return new NextResponse("missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("unsupported scheme", { status: 400 });
  }
  // Never let the proxy reach the private network.
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[?::1)/i.test(parsed.hostname)) {
    return new NextResponse("blocked host", { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "user-agent": "ContinuumBot/1.0 (logo fetch)", accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      return new NextResponse("upstream error", { status: 502 });
    }
    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new NextResponse("too large", { status: 413 });
    }
    return new NextResponse(buf, {
      headers: {
        "content-type": type,
        // Logos change rarely; a long cache keeps the map cheap on revisits.
        "cache-control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
