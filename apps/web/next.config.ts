import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// The monorepo root .env is the single source of env truth; Next only auto-loads
// env files from the app directory, so load the root file here for dev/build.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@continuum/db", "@continuum/pipeline", "@continuum/shared"],
  async redirects() {
    // Phase 25A: the map moved into the IA as /ecosystem.
    return [{ source: "/map", destination: "/ecosystem", permanent: true }];
  },
};

// Sentry (Phase 23C): the runtime SDK initializes only when SENTRY_DSN is
// set (instrumentation files); the build-time wrapper — source-map upload —
// engages only when SENTRY_AUTH_TOKEN is present, so local/dev builds stay
// untouched and fail nothing when Sentry is unconfigured.
async function withOptionalSentry(config: NextConfig): Promise<NextConfig> {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return config;
  }
  const { withSentryConfig } = await import("@sentry/nextjs");
  return withSentryConfig(config, {
    ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
    ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
    silent: true,
  });
}

export default withOptionalSentry(nextConfig);
