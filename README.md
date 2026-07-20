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

## Register harvest (reset build)

$0 deterministic ingestion from official registers — no LLM anywhere:

- `pnpm gleif:harvest -- --countries LU,IE,GB --cap 12000` — GLEIF LEI records
  (public JSON API) filtered to `EUROPE_COUNTRIES` + category FUND; LEI is the
  deterministic resolution key; fund→manager relationships from the RR
  golden-copy file become PROPOSED `manages` edges. Resumable cursor in
  `data/.gleif/state.json`; idempotent re-runs.
- `pnpm registers:harvest -- --register cssf|nbs|amf|lb --cap 1500` — national
  regulator registers (accessibility matrix: `docs/register-catalog.md`).
- `pnpm ch:enrich [-- --limit 100]` — Companies House anchors on existing GB
  orgs (needs `CH_API_KEY`; degrades gracefully without it).
- `pnpm wikidata:harvest [-- --cap 500]` — crowd-sourced PE/VC/asset-manager
  anchors; always provisional, activation only via `pnpm universe:verify`.

## Activity discovery (reset build)

- `pnpm sources:discover -- --limit 500` — probes the most-connected orgs'
  websites for newsrooms (RSS autodiscovery + common paths) and creates
  INACTIVE entity-linked sources; activation is an operator decision in
  /admin/sources (bulk-activate with monthly cost estimate).
- `pnpm portals:seed` — probe-first seeding of industry portals (RSS where
  available); paywalled/blocked portals stay documented, skipped.

## Export suite (reset build)

Clean UTF-8-BOM CSVs into `/exports` (gitignored) — the operator's
raw-material files; also downloadable from /admin/universe:

- `pnpm export:entities [-- --country LU --tag register_verified --kind organization --status active]`
- `pnpm export:edges`
- `pnpm export:facts [-- --channel distressed --since 2026-01-01]`
- `pnpm export:documents [-- --source newsroom --since 2026-01-01]`

Targeted extraction (LLM spend, operator-aimed, never blanket):
`pnpm extract:batch -- --source-type newsroom --limit 10 [--dry-run]`.

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
