/**
 * Client Sentry init (Phase 23C). NEXT_PUBLIC_SENTRY_DSN unset → the module
 * does nothing and ships no monitoring code paths. PII scrubbing at SDK
 * defaults (no IPs stored, sendDefaultPii false).
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? Sentry.captureRouterTransitionStart
  : () => undefined;
