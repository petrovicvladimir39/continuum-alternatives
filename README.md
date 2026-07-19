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
