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
  transpilePackages: ["@continuum/db", "@continuum/shared"],
};

export default nextConfig;
