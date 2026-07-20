/**
 * Server/edge Sentry init (Phase 23C). Graceful no-op without SENTRY_DSN.
 * PII scrubbing stays at SDK defaults (sendDefaultPii: false — no IPs, no
 * cookies, no user identifiers).
 */
export async function register(): Promise<void> {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export async function onRequestError(...args: unknown[]): Promise<void> {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — passthrough to Sentry's captureRequestError signature
  Sentry.captureRequestError(...args);
}
