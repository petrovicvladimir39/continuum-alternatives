# Continuum Alternatives — operations runbook (Phase 34F)

The incident basics. One page per scenario; keep it boring.

## Backups & restore

- **Continuous**: Neon keeps point-in-time recovery (PITR) on the project. Restore = Neon console
  → Branches → "Restore" to a timestamp → repoint `DATABASE_URL`/`DATABASE_URL_UNPOOLED` at the
  restored branch → redeploy on Vercel.
- **Drill**: `pnpm ops:backup-check` — copies a sample of every core table into a scratch schema,
  asserts inventory + counts, drops the schema. Run it monthly and after any migration. Exit 1 =
  investigate before anything else.
- **Logical dump** (belt-and-braces, run from any machine with pg tools):
  `pg_dump "$DATABASE_URL_UNPOOLED" --schema=public -Fc -f continuum-$(date +%F).dump`
  Restore into a scratch database with `pg_restore -d <target> continuum-<date>.dump`, then run
  `pnpm ops:backup-check` against it.

## Source breakage (a register or newsroom stops parsing)

1. /admin/ops → the source's row shows an error status or a flatlined sparkline.
2. /admin/sources → open the source; check `last_run_status` and recent documents.
3. Reproduce locally: the source's fetch method is in `sources.fetch_method`;
   run the matching pipeline command with the source id (see packages/pipeline/src/fetch.ts).
4. If the site changed markup: fix the parser, add/adjust the fixture in the matching verify
   suite, run `pnpm verify`.
5. If the site is gone or paywalled: deactivate the source in /admin/sources (history stays;
   nothing is deleted) and note it in docs/register-catalog.md.

## Key rotation

| Key | Where | Rotation |
| --- | --- | --- |
| `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY` | .env + Vercel env | Issue new in provider console → update both → redeploy. No data impact. |
| Clerk keys + `CLERK_WEBHOOK_SECRET` | Clerk dashboard | Rotate in dashboard → update env → redeploy. Sessions survive publishable-key rotation; secret-key rotation logs everyone out. |
| Stripe keys + `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Roll secret key; webhook secret regenerates with the endpoint. Update env → redeploy → send a test event from the dashboard. |
| Member API keys (`api_keys`) | /account/api | Members self-revoke/issue; operator can revoke any row by setting `revoked_at` in SQL. |
| Member webhook secrets | /account/api | Delete + recreate the hook (secret shown once at creation). |

## Rollback (bad deploy)

1. Vercel → Deployments → previous good build → "Promote to Production" (instant).
2. If a migration is implicated: migrations here are additive-only by convention — prefer
   rolling the APP back and leaving the schema; never drop columns in a hotfix. For data damage,
   PITR-restore a branch (above) and repoint.
3. `timeline_facts` is append-only; application code never UPDATEs/DELETEs there. If bad rows
   were inserted, mark them `status='rejected'` via /admin — do not delete.

## LLM spend anomaly

/admin/ops shows per-surface spend (today + lifetime). Every LLM surface has a deterministic
cap: briefs $2/day, filing chat $1/day, ask grounding $1/day, watchdog $2/week, compose $2/run.
Kill switch = remove `ANTHROPIC_API_KEY` from env; every surface degrades to its honest
"opens soon / try tomorrow" state and nothing crashes.

## Backlogged with reason (standing)

- **Learning digest ranking** — BACKLOG. Click-tracking ethics undecided: open-tracking pixels
  are ruled out permanently; a `?ref=digest` click-param scheme is the candidate if ranking ever
  justifies it. Decide only with real subscriber volume.
