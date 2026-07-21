# Continuum Alternatives — master-plan completion report

Phase 34F, 2026-07-21. The honest ledger: what the plan asked for, what shipped, what waits, and
why. Statuses: **built** · **built-differently** (with the reason) · **gated-awaiting-data**
(ships complete, renders when the record earns it) · **backlogged** (with the reason) ·
**operator-pending** (code done, needs a human step).

## The numbers, today

| Measure | Value |
| --- | ---: |
| Active entities | 14,558 (14,555 organizations, 22 events) |
| Register-verified (GLEIF/CSSF/NBS/AMF/BoL registry ids) | 13,532 |
| Countries represented | 33 |
| Approved timeline facts | 636 (9 proposed in queue) |
| Approved edges | 5 (**8,286 proposed `manages` edges await operator review**) |
| Documents | 665 · 5 active sources of 271 catalogued |
| Approved taxonomy classifications | 109 (PE 83 · private credit 17 · real assets 3) |
| Published articles | 1 (News Desk pipeline proven end-to-end) |
| Members / newsletter | 1 dev member · 1 active contact (pre-launch) |
| Verify suites | 32, all green · 26 migrations applied |
| **Lifetime LLM spend** | **$0.033 stored telemetry** (briefs); ≈$0.15 estimated including untracked CLI runs (compose $0.08, extraction benchmarks). Total under $0.25. |

## Stage ledger

### Foundation: record, ingestion, review (reset build, phases 1–22)
- **Built**: bitemporal timeline_facts (append-only, enforced by convention + verify), entity
  graph with 22 edge types, review queue for every machine proposal, register import path
  (RegisterImporter; ambiguous fuzzy always skipped), extraction with digit guards, city-dot map,
  digests with double opt-in, CSV export suite, anomaly scan, sitemaps/SEO.
- **Built-differently**: universe seeding pivoted from manual curation to register harvesting
  (GLEIF et al.) — 700 → 14.6k entities because deterministic keys beat hand-curation.
- **Operator-pending**: 243 discovered newsroom sources + 11 portals INACTIVE until reviewed in
  /admin/sources; CH_API_KEY; Resend domain; Inngest connect (docs/POST-RUN-CHECKLIST.md).

### Audience + identity (23–24)
- **Built**: subscription state machine (pending→active→unsubscribed), Sentry, Clerk identity,
  member_profiles sync, admin role gates, Basic Auth retired.
- **Operator-pending**: Clerk dashboard setup (keys, passkeys, own admin role, webhook secret) —
  **/admin and /account are unreachable until this is done**; it is the single blocking step.

### IA, taxonomy, editorial (25–27)
- **Built**: nav tree + ask bar (deterministic parse, URL-driven), Today strip, saved views,
  6 market fronts + 5 solutions pages, ⌘K search, 9-class taxonomy with coverage gate,
  entity_classifications, 9 AA-checked class accents with usage law enforced by grep-verify,
  /admin/write desk with markdown-subset sanitizer.
- **Gated-awaiting-data**: taxonomy market fronts beyond the four curated ones (coverage gate:
  ≥15 entities or ≥10 signals/90d — real assets sits at 3 entities).

### Member engagement loop (28–30)
- **Built**: watchlists + idempotent alert outbox + daily batch email, saved-view alerts,
  reactions (structured sentiment, never public percentages), anchored flat threads with
  real-name policy, moderation (report → remove-with-stub → 30-day ban toggle),
  /community-guidelines.
- **Backlogged**: thread replies/nesting (deliberate: statements over argument trees; revisit on
  demand), formal ToS/privacy pages (operator + counsel task — nothing false is linked).

### Monetization (29, 33B)
- **Built**: Stripe founding tier with REAL seat counter, entitlement module (single source of
  truth), honest downgrade (over-limit data goes read-only, never deleted), /pricing without
  urgency theatrics, entity briefs (guarded, cached, capped), vendor tier + track-record stories
  under the client-consent law (named only with the client steward's grant).
- **Operator-pending**: Stripe keys + prices (founding, vendor) — every payment surface sits in
  its honest "opens soon" pre-config state; live checkout untested until keys land.

### Events + network (31–32)
- **Built**: events layer (CSV import + 2 tolerant harvesters; 22 real conferences seeded,
  awaiting approval), iCal feed, consent-first attendance (visibility default OFF), contact
  requests with silent declines, LinkedIn import (emails dropped at parse, one-click delete-all),
  warm-path engine (member-scoped by construction), /universe, intro requests.
- **Backlogged**: multi-hop intro chains (v2 when member density justifies), "people you may
  know" (never — privacy law).

### Platform (33)
- **Built**: org claiming + narrow steward powers, REST API v1 (6 endpoints, inventory-checked
  against docs), API keys (hash-only storage), 60/min limiter (Postgres now, Upstash swap
  documented), **MCP server at /api/mcp** (6 cited tools, in-process + HTTP round-trips
  verified), member webhooks (HMAC, auto-deactivate), usage metering rollups.
- **Backlogged**: Stripe metered API pricing (log-only until an enterprise decision exists).

### Intelligence toolkit + ops (34)
- **Built**: time-travel as-of views on both bitemporal dimensions (a backfill never rewrites a
  past view), NPL Monte Carlo simulator (seedable, hand-verified math), chat-with-filing
  (verbatim-substring guard; zero quotes → honest fallback), ask grounding (forced tool call,
  no prose channel, invoke-only-on-weak), watchdog weekly briefs (opt-in, desk guards, empty
  weeks send nothing), scout submissions (review-gated, real citations, credit lines),
  /admin/ops, backup drill (`pnpm ops:backup-check` — PASS today), RUNBOOK.
- **Gated-awaiting-data**: comps engine (complete + tested; renders per class at ≥8
  amount-parsed deals — today's count: 1 deal, so the Building note is the honest UI).
- **Backlogged**: learning digest ranking — click-tracking ethics undecided; open pixels ruled
  out permanently; a `?ref=` click-param is the future candidate, decided only with real volume.
- **Backlogged**: cross-document RAG (returns only with per-quote provenance).

## LLM doctrine — held throughout
Six LLM surfaces exist (extraction, compose, briefs, filing chat, ask grounding, watchdog);
every one is guarded by deterministic code (digit/name/substring checks), review-gated where it
touches the record, capped in dollars per day/week, cached, and honest when capped. No LLM ever
does arithmetic on amounts. Removing ANTHROPIC_API_KEY degrades everything gracefully.

## Standing operator checklist (the launch gate, in order)
1. **Clerk** dashboard setup → unlocks /admin, /account, and every member feature.
2. Review the **8,286 proposed edges** (the graph's density is sitting in the queue).
3. **Resend** domain + RESEND_API_KEY → digests, alerts, watchdog delivery.
4. **Stripe** keys + founding/vendor prices → memberships open.
5. **Inngest** connect + enable crons (alerts-daily, webhooks-deliver, watchdog-weekly).
6. Activate curated **sources** from the 243 discovered (start with 20–30 strongest).
7. CH_API_KEY, approve the 22 seeded events, run `pnpm ops:backup-check` monthly.

## The next 90 days are operations, not code
- **Sources**: activate and babysit ~30 newsrooms/registers; fix parsers as they break
  (/admin/ops shows freshness); target 2,000+ approved facts and 5+ countries with court-depth.
- **Digest cadence**: ship The Continuum Brief weekly, manually approved, from week one —
  consistency beats volume; the compose pipeline drafts, the operator edits.
- **Distribution**: the MCP/API story ("your AI can query Continuum") is the differentiated
  wedge — developer-facing posts + the iCal feed + report PDFs are the three shareable artifacts.
- **First members**: hand-recruit 10–20 founding members from the distressed/NPL community the
  data is deepest in (Serbia/Croatia court coverage is the moat); their watchlists and scout
  submissions are the flywheel. Vendor tier follows the first claimed advisor profiles.
- Revisit ranking, rewards, and metered pricing ONLY when volume makes them real decisions.

*Every claim above is verifiable in the repo: 32 verify suites, /coverage, /admin/ops, and this
file's numbers query straight from the production database.*
