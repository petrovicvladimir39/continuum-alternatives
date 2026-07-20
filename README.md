# Continuum Alternatives

Monorepo for Continuum Alternatives — the map of European alternative assets: private equity, venture capital, private credit, distressed, and the institutions around them. It is a pnpm workspace containing the Next.js web app (`apps/web`) and the `@continuum/db`, `@continuum/pipeline`, and `@continuum/shared` TypeScript packages.

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

## Universe seeding (Phase 15)

Curated CSV import + live verification for the regional player universe.

CSV contract (`data/universe-seed.csv`), header exactly:

```
name,kind,country,city,website,tags,capital_note
```

- `name` — official firm name (display form; diacritics/Cyrillic welcome)
- `kind` — always `organization` in curated seed files
- `country` — 2-letter ISO code of the real HQ country
- `city` — real HQ city (stored on the org detail)
- `website` — REQUIRED official homepage (http/https); the verification gate fetches it
- `tags` — semicolon-separated values from `ENTITY_TAGS` (`@continuum/shared`)
- `capital_note` — optional one-liner, stored as the entity summary on creation

Commands:

- `pnpm universe:import -- data/universe-seed.csv` — idempotent: each row is
  resolved against the corpus (`resolveEntity`); matched rows merge missing
  city/website and union tags; ambiguous rows are skipped and reported; new
  rows are created `status='provisional'` with tag `needs_verification`.
- `pnpm universe:verify` — the activation gate: fetches each provisional org's
  homepage (ContinuumBot UA, 15s timeout, 1s politeness). PASS when >=60% of
  `companyNameCore` name tokens appear in the page text OR the domain contains
  a core token (>=3 chars) - then `status='active'`, tag dropped, and an audit
  note stored in `organizations.verification_note`. Failures stay provisional
  and never reach the public site.
