# Continuum Alternatives — project constitution

The map of European alternative assets (PE, VC, private credit, distressed/NPL) and the institutions around them; deepest coverage in Central and South-Eastern Europe. Monorepo: apps/web (Next.js 15, App Router, Tailwind v4), packages/db, packages/pipeline, packages/shared. pnpm workspaces, strict TypeScript everywhere.

## Stack (decided; never substitute)

Neon Postgres (+ pgvector, PostGIS) with Drizzle ORM · Clerk auth (from Phase 23, not before) · Inngest jobs (from Phase 7) · Langfuse LLM observability (from Phase 10) · Upstash Redis (from Phase 33) · Sentry (from Phase 22) · Voyage embeddings (from Phase 14) · Resend email · Firecrawl crawling · MapLibre GL maps · Vercel hosting. Root Directory on Vercel is apps/web; vercel.json pins framework nextjs.

## Design mandate (binding — REWRITTEN 2026-08-03, operator decision)

The old austerity mandate (no shadows/gradients/radius/motion/dark mode) is REPEALED in full. The visual law is now:

- **Landing ("/", `(landing)` group + `src/components/landing/*`)**: the Aceternity "startup landing" template is the reference design — motion (framer/motion), gradient beams, large radii, layered shadows, lucide icons, dark mode via the v2 theme attribute. Template-faithful porting is the goal, with Continuum content.
- **Product (`(v2)` group)**: the v2 token system in globals.css (`.v2-root`, light + dark via `data-v2-theme`) is the source of truth — v2's own laws (radius 0, neutral hairlines) apply there, plus shadcn/radix, recharts, deck.gl as already adopted on that surface.
- **v2 IS the production presentation layer**, running on the mock design-scaffolding data (`packages/shared/src/mock/*`, fictional entities) until the operator schedules the data cutover. The old DB-backed `(site)` front page is retired; remaining `(site)` routes are legacy until migrated.
- Numeric displays keep tabular-nums. Fonts remain Newsreader + Instrument Sans where the v2 tokens use them; the landing may use the template's default sans stack.

## Rules of engagement

- Work proceeds in numbered phases; build ONLY what the current phase prompt specifies. Never install a package, add a route, or create a table that the prompt does not name.
- LLMs never do arithmetic on amounts; extraction and synthesis only. All monetary math is deterministic code.
- timeline_facts is append-only: application code never UPDATEs or DELETEs rows there.
- Nothing publishes below its confidence threshold without human approval (review queue).
- Secrets live in .env only; .env.example documents every variable; never commit secrets.
- Every phase ends with: pnpm typecheck, lint, build clean; the phase's stated verification checks; a single commit; push to origin main.
