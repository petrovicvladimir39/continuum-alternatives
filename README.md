# Continuum Alternatives

Monorepo for Continuum Alternatives, a data platform for private capital in emerging Europe. It is a pnpm workspace containing the Next.js web app (`apps/web`) and the `@continuum/db`, `@continuum/pipeline`, and `@continuum/shared` TypeScript packages.

## Prerequisites

- Node 22
- pnpm 9

## Scripts

- `pnpm dev` — run the web app locally (Next.js dev server)
- `pnpm build` — production build of the web app
- `pnpm typecheck` — type-check every package and app
- `pnpm lint` — lint the whole repo with ESLint
- `pnpm format` — format the whole repo with Prettier

## Background jobs (Inngest)

Ingestion is scheduled and executed by Inngest. To run jobs locally, start the
Inngest dev server alongside the app: `npx inngest-cli@latest dev` (UI at
http://localhost:8288) while `pnpm dev` is running; it discovers the app at
http://localhost:3000/api/inngest.

Sources support three fetch methods: `http_simple` (hash-based change detection
on one page), `rss`, and `firecrawl_index` (scrape an index page, follow article
links). Per-source JSON config keys: `maxItemsPerRun` (default 10),
`linkIncludePattern` (regex article links must match, firecrawl_index only),
`articleFetch` (`simple` | `firecrawl`, default `simple`), `language` (2-letter
code stamped onto stored documents).
