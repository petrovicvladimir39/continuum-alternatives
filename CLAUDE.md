# Continuum Alternatives — project constitution

Data platform for alternative investments (PE, VC, private credit, distressed/NPL) in emerging Europe. Monorepo: apps/web (Next.js 15, App Router, Tailwind v4), packages/db, packages/pipeline, packages/shared. pnpm workspaces, strict TypeScript everywhere.

## Stack (decided; never substitute)
Neon Postgres (+ pgvector, PostGIS) with Drizzle ORM · Clerk auth (from Phase 23, not before) · Inngest jobs (from Phase 7) · Langfuse LLM observability (from Phase 10) · Upstash Redis (from Phase 33) · Sentry (from Phase 22) · Voyage embeddings (from Phase 14) · Resend email · Firecrawl crawling · MapLibre GL maps · Vercel hosting. Root Directory on Vercel is apps/web; vercel.json pins framework nextjs.

## Design mandate (binding)
The tokens in apps/web/src/app/globals.css and the /styleguide route are the only visual source of truth. Serif = Newsreader (headings only, 400/500). Sans = Instrument Sans (everything else, 400/500). All numeric/data displays use tabular-nums, right-aligned in tables. PROHIBITED, always: box-shadows, gradients, border-radius above 4px, Inter/system-ui as brand type, component libraries (shadcn/radix), icon libraries, emoji in UI, animations beyond hover color changes, dark mode. Elevation is expressed by 1px borders only.

## Rules of engagement
- Work proceeds in numbered phases; build ONLY what the current phase prompt specifies. Never install a package, add a route, or create a table that the prompt does not name.
- LLMs never do arithmetic on amounts; extraction and synthesis only. All monetary math is deterministic code.
- timeline_facts is append-only: application code never UPDATEs or DELETEs rows there.
- Nothing publishes below its confidence threshold without human approval (review queue).
- Secrets live in .env only; .env.example documents every variable; never commit secrets.
- Every phase ends with: pnpm typecheck, lint, build clean; the phase's stated verification checks; a single commit; push to origin main.
