# Continuum Alternatives — Advisor Dossier

Prepared 2026-07-21 from the repository at commit `d3cd8f4` ("phase 34: intelligence toolkit +
ops — master plan complete"). **Every figure in this document is derived** — from read-only SQL
against the production Neon database, from counting files/scripts in the repo, or from the
committed docs — and each section says which. Where code and docs disagree, it is flagged
inline with **⚠ DISAGREEMENT**. Nothing here is aspirational; dormant means dormant.

---

## 1. EXECUTIVE SUMMARY

**What it is.** Continuum Alternatives is a provenance-first data platform mapping European
alternative assets — private equity, venture, private credit, distressed/NPL — as a bitemporal
graph of register-verified entities, cited timeline facts, and reviewed relationships, with a
membership layer (watchlists, discussion, warm-intro networking), a paid founding/vendor tier,
and programmatic access via REST API and an MCP server so AI agents can query the record with
citations. Every machine-proposed datum passes a human review gate before publication; every
LLM surface is guarded by deterministic code, capped in dollars, and honest when capped.

**Corpus, live counts** (single SQL sweep, 2026-07-21, **post clean-100 ingest** — same day,
after the 100-source mega-ingest run):

| Measure | Count |
| --- | ---: |
| Active entities | **30,559** (+1,738 provisional awaiting verification) |
| Register-verified (registry id present) | **28,777** (GLEIF · CSSF · NBS · AMF · Bank of Lithuania · FINMA · Finanstilsynet NO · HANFA · AFM · KNF · CNMV · FI.se · Latvijas Banka · FI.ee · ASF RO · FIN-FSA · ESMA central registers) |
| Countries (active entities) | **39** — top: LU 3,671 · NL 2,981 · CH 2,406 · FR 1,391 · BE 1,280 |
| Approved timeline facts | **636** (**61 proposed, now spanning 16 countries** — the RS-only skew is broken at the proposed layer) |
| Approved edges | **5** — with **15,311 PROPOSED** (14,864 register-grade `manages` · 356 DFI `lp_in` · 91 other), awaiting operator review |
| Approved classifications | 109 (846 proposed) · Documents **996** · Published articles 1 |
| Sources | **273 catalogued, 84 active** (25 press + 54 firm newsrooms + registries) · Events seeded 22, 0 approved/public |
| Database | 66.9 MB of the 400 MB tier ceiling |

**Cost.** Lifetime LLM spend in stored telemetry: **$0.0325** (entity briefs; all other LLM
tables at $0.00). Including untracked CLI runs (compose, extraction benchmarks) the committed
estimate is **< $0.25 total** (PLAN-COMPLETION-REPORT). Infra is currently free/hobby-tier:
Neon, Vercel, and keyless map tiles; no paid subscriptions are configured yet.

**Build status.** The 34-phase master plan is complete: 26 migrations, 48 application tables,
72 page routes + 17 API/feed routes, 33 verify programs (6 db + 27 pipeline) — all green in the
latest sweep; typecheck/lint/build clean.

**What stands between here and live, in one line:** no code — a Clerk dashboard setup (which
un-404s /admin and every member feature), then Resend/Stripe/Inngest keys, and one long
operator session in the review queue (**15,311 edges, 61 facts, 846 classifications,
1,738 provisional entities, 22 events** — post clean-100 counts).

---

## 2. BUSINESS OVERVIEW

### Positioning & model
Positioning (from CLAUDE.md, the site's own copy, and nav): *"The map of European alternative
assets"* — pan-European breadth (39-country vocabulary), deepest in Central and South-Eastern
Europe. The funnel as actually implemented:

1. **Free public record** — profiles, feed, news, map, rankings, search. Never gated (verified:
   no public content sits behind sign-in).
2. **Free membership** (Clerk sign-in) — watch 5 entities, 1 alert-enabled saved view, daily
   alerts, discussion/reactions, scout submissions, 3 document-Q&A/day.
3. **Founding membership** — `STRIPE_PRICE_FOUNDING` (price set in Stripe, rendered from
   config; **not yet configured**), seat-capped by `FOUNDING_CAP` (default 100, real counter,
   code-enforced), "locked for life" flag in schema. Unlocks: unlimited watch/alerts, instant
   alerts, CSV export (10/day), entity briefs (20/month), analyst tools, meeting-prep briefs,
   API keys + MCP, webhooks, watchdog weekly brief, unlimited document Q&A.
4. **Vendor tier** — `STRIPE_PRICE_VENDOR` (**not configured**), per-organization subscription
   bought by a claimed org's steward; unlocks reviewed, client-consented track-record stories +
   "Verified vendor" line.
5. **API/MCP** — bundled with founding today; metered enterprise pricing is scaffolded
   (`STRIPE_METER_EVENT_NAME`, log-only until set — a deliberate later decision).

Revenue state today: **zero revenue, zero prices configured, all payment surfaces in their
honest "Memberships open soon" pre-config mode** (code-verified pattern, tested in verify-payments).

### The moat, as it exists in data
- **Exclusive-ish**: the *fact* record is currently Serbian court/insolvency depth — 635 of 636
  approved facts are RS (ALSU insolvency filings, auction notices with case references and
  verbatim excerpts), the kind of primary-source coverage commodity data vendors don't carry.
  The register-accessibility catalog (27 regulators probed, with working routes and documented
  blockers) is itself an asset — reproducible, $0, and hard-won.
- **Commodity**: the 13.5k GLEIF/register entity shells (anyone can harvest GLEIF). The value
  is the *deterministic resolution + review discipline* layered on them, and the 8,286
  fund→manager edges waiting in the queue.
- **Structural**: the citations-everywhere spine (every fact carries its source through UI,
  API, and MCP) is the trust surface competitors bolt on later, if ever.

### Go-to-market state — honest
Derived from the database: **1 member profile (the developer), 1 newsletter contact, 1 digest
sent, 0 active paid subscriptions, 0 API keys, 0 claims, 0 attendance rows, 1 discussion post,
1 reaction (demo/dev fixtures).** Distribution done: effectively none. This is a finished
product with zero users — the honest framing for any advisor conversation.

### The 90-day operating plan (verbatim from PLAN-COMPLETION-REPORT.md)
> - **Sources**: activate and babysit ~30 newsrooms/registers; fix parsers as they break
>   (/admin/ops shows freshness); target 2,000+ approved facts and 5+ countries with court-depth.
> - **Digest cadence**: ship The Continuum Brief weekly, manually approved, from week one —
>   consistency beats volume; the compose pipeline drafts, the operator edits.
> - **Distribution**: the MCP/API story ("your AI can query Continuum") is the differentiated
>   wedge — developer-facing posts + the iCal feed + report PDFs are the three shareable artifacts.
> - **First members**: hand-recruit 10–20 founding members from the distressed/NPL community the
>   data is deepest in (Serbia/Croatia court coverage is the moat); their watchlists and scout
>   submissions are the flywheel. Vendor tier follows the first claimed advisor profiles.
> - Revisit ranking, rewards, and metered pricing ONLY when volume makes them real decisions.

### Competitive framing (capability-derived, not aspirational)
Comparables and the actual difference in the code:
- **Preqin / PitchBook** (institutional alt-assets data): global breadth, analyst-curated, no
  primary-source citation trail per datum, no CEE court depth. Continuum is tiny in breadth but
  every fact is source-linked, and it is queryable by AI agents out of the box (MCP).
- **Debtwire / Reorg** (distressed intelligence): human journalism at premium price points.
  Continuum's distressed layer is registry-fed and deterministic, with an LLM desk that is
  guard-railed rather than authorial — cheaper to run, narrower today (one jurisdiction deep).
- **NPL marketplaces (Debitos etc.)**: transaction venues. Continuum is the record around
  transactions (who, what, when, per the filings), plus tools (NPL simulator ships; comps gated).
- **LinkedIn/affinity-graph tools**: the warm-path engine is deliberately consent-first and
  member-private (structurally scoped SQL) — a feature, but with zero network density today.
Differentiators that exist in code now: citations end-to-end · bitemporal as-of views · MCP
server · consent-first networking · the review-gate discipline. Differentiators that do NOT
exist: breadth, liquidity of members, editorial volume (1 published article).

---

## 3. PRODUCT & DESIGN OVERVIEW

### Surface inventory (from the route tree — 49 public/member pages, 22 admin pages, 17 routes)

**Public record**: `/` (front page: lead, rails, quiet bands) · `/news` (+ `/news/[slug]`) with
the ask bar · `/feed` (all signals, reactions) · `/companies`, `/funds`, `/deals` indices +
`[slug]` profiles (timeline, connections graph, mentions, discussion) · `/ecosystem` (MapLibre
city-dot map) · `/rankings` (as-of capable) · `/markets/[vertical]` (6 fronts) ·
`/solutions/[persona]` (5) · `/events` + `[slug]` + `calendar.ics` (empty until approvals) ·
`/auctions` · `/search` · `/coverage` · `/reports` (+1 gated report) · `/digest` archive ·
`/methodology`, `/about`, `/styleguide`, `/community-guidelines`, `/docs/api`, `/docs/mcp`,
subscribe/confirm/unsubscribe.

**Member**: `/account` (profile, tier, affiliation, LinkedIn import, newsletter) ·
`/account/watchlist` (limits, frequencies, watchdog opt-in) · `/account/updates` (outbox,
contact/intro/consent requests) · `/account/api` (keys, webhooks) · `/universe` (egocentric map
+ warm paths) · `/contribute` (scout form) · `/documents/[id]` (filing Q&A) ·
`/tools/npl-simulator`, `/tools/comps` (founding) · `/companies/[slug]/brief` ·
`/events/[slug]/prep/…` · `/pricing` (+ success/cancelled).

**Admin** (role-gated, 404 to everyone else): review queue (facts/edges/articles/
classifications/events/stories/scouts) · entities/edges/timeline editors · sources (+bulk
activation with cost ceilings) · documents · digests · contacts · universe (exports) · write
desk · moderation · claims · anomalies · **ops** (freshness, spend, backlog).

### The design system (from `apps/web/src/app/globals.css` + /styleguide, verbatim tokens)
- **Type**: Newsreader (serif) for headings only at 400/500 (`type-h1` 30px, `type-h2` 22px);
  Instrument Sans for everything else; `type-label` 11px uppercase; `type-data` 13px
  `tabular-nums` (all numeric displays right-aligned in tables — enforced idiom).
- **Palette**: ground `#fafaf8`, surface `#ffffff`, ink `#141311`/`#5c5952`/`#8a867c`, hairlines
  `#e7e4dc`/`#d2cec3`, ONE interactive accent `#17456b`. Capital-flavor trio for the map
  (equity `#1d7a5f`, credit `#96690f`, distressed `#a4442a`) and NINE taxonomy class accents
  (AA-checked) whose usage is limited by law to kicker/2px-rule/chip — enforced by a grep in
  verify-editorial, not by convention.
- **Laws** (CLAUDE.md, binding): no box-shadows, no gradients, radius ≤4px (`--radius-sm` 2px,
  `--radius-md` 4px), no component libraries, no icon libraries, no emoji in UI, no dark mode,
  no animation beyond hover color. Elevation = 1px borders only. The one client-side JS island
  is the map; everything else is server components + form actions (no optimistic UI).

### Four flows as a user experiences them
1. **Ask the record**: /news → type "npl serbia" → deterministic parser drops removable chips
   (distressed · Serbia) above a filtered article list + live-record rail; save the view
   (signed in) → enable a daily alert on it. If the phrasing defeats the parser, a signed-in
   member's query is silently LLM-grounded into the *same* chips — the UI never changes.
2. **Map to profile**: /ecosystem → one dot per city, colored by capital mix → click → right
   panel lists the city's firms → row click → in-panel card (stats, latest activity) → "Full
   profile" → the entity page: cited timeline, connections graph, mentions with "ask →" into
   document Q&A, discussion below.
3. **Watch to alert**: any profile → Watch → /account/watchlist shows "Watching N of 5" (free)
   with the quiet founding note at the limit → next morning's single batched email lists what
   changed, each item linking back; unseen count sits as a plain number by your name in the header.
4. **Universe to warm path**: /account → "This is my firm" picker + LinkedIn Connections.csv
   upload (consent screen, emails dropped at parse) → /universe re-centers the map on your
   firm/watched/contacts/event layers → click a target → the Path panel renders "You → Acme
   Partners — your contact J. Novak, Partner → advised_on → Target Fund", private hops marked,
   with a consent-gated intro request if the first hop is a participating member.

### Design-maturity assessment — honest
- **Polished**: the editorial system (article template, class accents, news front), entity
  profiles, the map interaction, /pricing's restraint, email templates, the token discipline
  overall (it is genuinely consistent because verify enforces parts of it).
- **Functional-but-plain**: nearly every member surface — /account is a stack of bordered form
  blocks; /account/api, /contribute, admin pages, and the Phase 34 tool pages are dense
  GET-form utilitarianism. The composer/reaction affordances are deliberately quiet to a fault.
- **Scrutinize first** (design advisor): (1) /account information architecture — six phases of
  features accreted into one column; (2) empty states across the member funnel — a new member
  with no data sees a lot of quiet nothing before value; (3) /universe map onboarding — the
  three-step starter exists but the payoff needs data the member must supply; (4) mobile — the
  header wraps and tables scroll, but member surfaces were built desktop-first and it shows;
  (5) the news front's information density when both articles and rails are thin (today's state).

---

## 4. TECHNICAL ARCHITECTURE

### Stack (versions from package.json files)
Next.js `^15.5.0` (App Router, React `^19`) · Tailwind `^4` · TypeScript `^5` strict everywhere
· Drizzle ORM `^0.44` on Neon serverless Postgres `^1.x` (+ pgvector, PostGIS) · Clerk
`^7.5.20` · Stripe `^22.3.2` · Inngest `^3` · @anthropic-ai/sdk `^0.112.3` ·
@modelcontextprotocol/sdk `^1.29.0` · Resend `^6.17.2` · svix `^1.98` · MapLibre GL `^5.24` ·
Sentry `^10.66` · zod `^4.4.3` · Firecrawl `^4.30.1` · voyageai `^0.4` · tesseract.js `^7` ·
unpdf `^1.6.2` · pnpm workspaces (`packageManager: pnpm@11.5.0`).
**⚠ DISAGREEMENT**: README says "Node 22, pnpm 9" — the manifest pins pnpm 11.5; README is stale.

Monorepo: `apps/web` (UI + routes + server actions) · `packages/db` (schema, 26 migrations,
repo layer, resolution engine) · `packages/pipeline` (ingestion, extraction, LLM surfaces,
Inngest functions, 27 verify programs) · `packages/shared` (pure, dependency-free domain logic:
taxonomy, ask parser, entitlements, path engine, simulators, guards' vocabularies).

Deployment topology: Vercel (root `apps/web`, `vercel.json` pins framework) · Neon Postgres
(pooled runtime URL + unpooled for migrations; PITR backups) · Inngest for crons
(sources, alerts-daily 07:00, webhooks-deliver */15, watchdog-weekly Mon 07:30 — **not yet
connected to Vercel**) · Resend (email; domain unverified) · OpenFreeMap positron tiles
(keyless) · Sentry + Plausible + Langfuse env slots (unset) · Upstash Redis slot (unset;
Postgres stands in for rate limiting).

### Data model — 48 application tables (from `pg_tables`, excluding PostGIS's `spatial_ref_sys`), grouped

- **Graph core (11)**: `entities` (kind: organization/person/fund_vehicle/deal/asset/event;
  status active/provisional; embedding vector — currently NULL everywhere), detail tables
  `organizations` / `people` (GDPR-minimal) / `fund_vehicles` / `deals` / `assets` / `events`,
  `aliases` (normalized, resolution substrate), `entity_tags`, `entity_classifications`
  (9-class taxonomy), `edges` (22 typed relations, SOURCE→TARGET semantics, status-gated).
- **Record & pipeline (9)**: `timeline_facts` (**bitemporal**: `occurred_on` vs `recorded_at`;
  **append-only** — application code never UPDATEs/DELETEs, verified), `documents`, `sources`
  (fetch config + cost ceilings), `ingestion_runs`, `anomalies`, `city_geocodes`, `articles`
  (News Desk, review-gated), `digests` + `digest_items`.
- **Audience (1)**: `contacts` (double opt-in state machine, confirmation tokens).
- **Members (8)**: `member_profiles` (Clerk-synced, role/org line, ban field, affiliation FK),
  `member_subscriptions` (Stripe founding), `member_saved_views`, `member_watchlist`,
  `member_alert_prefs` (+watchdog opt-in), `alert_outbox` (idempotent by member+kind+ref),
  `member_private_edges` (**LinkedIn import; deliberately NO email/phone columns**),
  `member_export_log`.
- **Engagement & network (6)**: `item_reactions` (pk member+kind+target), `thread_posts`
  (anchored, flat), `post_reports`, `event_attendance` (visibility opt-in default OFF),
  `contact_requests` (event + intro contexts, pair-unique), `signals` (dormant Phase-3 table).
- **Platform & intelligence (13)**: `org_claims` (one approved per entity via partial unique
  index), `vendor_subscriptions`, `vendor_stories` (client-consent law), `api_keys` (sha256
  only), `api_usage` (daily), `api_rate_windows` (minute), `member_webhooks` (HMAC secrets,
  cursor, failure counter), `entity_briefs` + `brief_generations`, `doc_chats`,
  `ask_groundings`, `member_daily_usage` (all Phase-34 caps), `scout_submissions`,
  `watchdog_briefs`.

Design principles carried through schema comments and verify: bitemporality (as-of views filter
BOTH dimensions), append-only facts, provenance (facts→documents→sources chain renders as
citations in UI/API/MCP), review-gate on every machine write, privacy-by-structure (private
edges only ever queried scoped by owner member id).

### Pipeline, end to end (module names are actual files in `packages/pipeline/src`)
`sources` (fetch.ts: http_simple hash-diff / rss / firecrawl_index; per-source caps) →
`documents` (extract-text.ts incl. PDF via unpdf + OCR via tesseract) → extraction
(extraction/, LLM with **digit guards**: any number not present in the source text drops the
fact; deterministic registry mappers for ALSU et al. in filings-map.ts bypass the LLM entirely)
→ resolution (db/resolve.ts: registry-id exact → alias → pg_trgm fuzzy with benchmark-tuned
thresholds 0.93/0.78; ambiguous NEVER auto-merges) → **review queue** (/admin/review; nothing
below confidence thresholds publishes without a human) → publication (profiles, feed, alerts
fan-out via `alert_outbox`, webhooks, digests). Cost controls: per-source item ceilings,
`extract:batch --dry-run` cost preview, per-run hard budgets in every LLM CLI.

### The six LLM surfaces (all claude-sonnet-4-6, temp 0; per-surface stored spend in parentheses)

| Surface | Guard | Cache | Cap |
| --- | --- | --- | --- |
| Extraction (pipeline) | digit guard vs source text; review queue | n/a | per-run ceilings, dry-run preview |
| News compose ($ untracked CLI, ~$0.08) | guardArticle: length/attribution/digit/name-run checks → DROP | covered-facts set | $2/run hard abort; proposals only |
| Entity briefs ($0.0325) | digit+name guards; zod contract; `[source]` suffix rule | per-entity + data-version hash | 20/member/month, $2/day global |
| Filing chat ($0) | **verbatim-substring quote guard**; zero quotes → honest fallback | per (doc, normalized q) | free 3/day, $1/day global |
| Ask grounding ($0) | forced tool call — no prose channel; closed-vocabulary sanitizer | normalized query + hit counter | 20/member/day, $1/day, invoke-only-on-weak |
| Watchdog weekly ($0) | desk digit/name guards; no-speculation prompt + guard backstop | one per member+week | opt-in, 200/run, $2/week global |

Removing `ANTHROPIC_API_KEY` degrades every surface to an honest disabled state (verified).

### API + MCP
REST v1 (founding-gated Bearer keys, sha256-at-rest, revocable): `/api/v1/entities`,
`/entities/{slug}`, `/{slug}/timeline`, `/{slug}/edges`, `/facts`, `/search` — verify asserts
the route inventory equals the /docs/api list (**no undocumented endpoints, mechanically**).
Rate limit 60/min/key via Postgres minute windows (Upstash swap documented at the single call
site); daily usage rollups per key on /admin. MCP at `/api/mcp` (stateless Streamable-HTTP
JSON-RPC bridge, same keys): `search_entities`, `get_entity`, `get_timeline`, `list_facts`,
`get_coverage`, `my_watchlist` (key-owner-scoped) — every tool output carries source names+URLs;
round-trip tested in-process (InMemoryTransport) and over HTTP. No write endpoints exist.

### Security & privacy posture
- **Auth**: Clerk sessions; middleware protects /admin, /account, /universe, /tools, /documents,
  /contribute; admin additionally requires `publicMetadata.role === "admin"` (non-admins get
  404, no existence hints). Server actions re-derive identity per call; admin actions re-check
  role (actions are network endpoints). Basic Auth fully retired.
- **Webhook ingress**: Clerk via svix signatures; Stripe via `constructEvent`; member-bound
  webhooks egress-signed `t=…,v1=HMAC-SHA256` with replay window, verified in tests.
- **Privacy laws in code**: private edges owner-scoped structurally (adversarial fixture
  asserts member B never touches member A's rows); LinkedIn emails dropped at parse (no
  columns exist to store them); attendance visibility default OFF; watcher counts only at N≥3,
  never identities; person entities are GDPR-minimal and have NO public pages; no tracking
  pixels anywhere (committed prohibition).
- **PII stored**: member email + display name + optional self-stated role/org (Clerk-synced);
  contributed contact names/companies/positions (private edges, owner-deletable in one click);
  newsletter emails with consent timestamps. NOT stored: passwords (Clerk), card data (Stripe),
  emails/phones from uploads, raw API keys (hash only).
- **Secrets**: .env only; .env.example documents all 33 vars; none committed (checked).

### Test posture — 33 verify programs, all green
db (6): `verify` (schema/graph core), `verify-cli`, `verify-admin` (review workflow),
`verify-resolve` (resolution benchmark), `verify-public`, `verify-public2` (feed/auctions/
rankings). pipeline (27): ingestion (`pipeline`, `crawl`, `registry`, `extract`, `filings`,
`gleif`, `discover`), record features (`anomalies`, `digest`, `map2`, `enrich`, `export`,
`articles`, `balance` — anti-skew, `site` — IA pins, `audience`, `identity`, `ask`, `taxonomy`,
`editorial` — incl. the class-accent usage grep, `alerts`), and the membership/platform era
(`payments` — entitlement matrix + webhook fixtures + seat truth, `engagement` — sanitizer
injection + moderation + bans, `events` — iCal round-trip + visibility matrix, `universe` —
adversarial private-edge scoping + path determinism, `platform` — consent law + key auth + MCP
round-trip + endpoint inventory + webhook auto-deactivate, `intel` — bitemporal reconstruction
+ hand-computed Monte Carlo + substring guard + grounding vocabularies). These are live-DB
fixture suites with cleanup, not mocks. **⚠ DISAGREEMENT**: PLAN-COMPLETION-REPORT says "32
suites"; the package scripts define 33 verify entries (the base db `verify.ts` was likely
uncounted). The sweep's `: PASS` grep returns 32 lines; one suite formats its pass line
differently. Substance: all of them pass.

### Honest technical debt & risks
- **Single-operator bottleneck**: every publication path ends at one human's review queue —
  correct for trust, rate-limiting for growth. 8,286 edges + 846 classifications are queued.
- **Interim patterns**: Postgres rate limiting (Upstash slot empty); MCP bridge is POST-only
  (no SSE streams — fine for current clients, nonstandard edge); admin layout gates pages while
  a few older admin actions rely on layout gating alone (newer ones re-check; worth a sweep);
  metering is log-only; Stripe live checkout has **never run** (no keys have ever been present —
  the POST-RUN checklist carries the pending test-card protocol).
- **Dormant capability**: `entities.embedding` is NULL for all rows (derived: 0 embedded) —
  semantic search and cosine-similar legs silently fall back to deterministic paths until
  `VOYAGE_API_KEY` + `pnpm embeddings:backfill` run. Telegram env slots and the `signals`
  table are legacy-dormant. Langfuse/Sentry/Plausible slots unset.
- **Scaling notes committed in code**: rankings are live queries "materialize once
  timeline_facts passes ~50k rows" (repo comment); sitemap chunking already handles 10k+ URLs;
  LinkedIn import caps at 2,000 rows/upload with sequential fuzzy resolution (slow at the cap
  by design); listOutbox caps at 300 rows.
- **Data concentration risk**: the fact layer is one jurisdiction deep (RS). A Serbian-registry
  format change breaks the majority of live fact flow until the parser is fixed (RUNBOOK covers
  the procedure; /admin/ops surfaces the breakage).
- **Known quirks**: the ask parser maps the bare token "is" to Iceland (country-code synonym) —
  discovered and pinned in verify-intel; events UI is fully built but publicly empty pending
  approvals; README's prerequisites are stale (above).

---

## 5. WHAT REMAINS — THREE BUCKETS

### (A) OPERATOR CONFIG — no code, account setup + queue time only

| Item | Unlocks | Effort | Blocking? |
| --- | --- | --- | --- |
| **Clerk setup** (app, keys, passkeys+email, self-role=admin, webhook secret) | /admin, /account, ALL member features — the platform's entire interactive half currently 404s | ~1 hour | **YES — blocks everything below involving members** |
| **Review queue session**: 8,286 edges (register-grade, batch-approve after spot-check) · 846 classifications · 22 events (incl. one near-duplicate pair) · 2 articles · 9 facts · 37 Wikidata provisionals (`pnpm universe:verify`) | The graph's density; /events + iCal + homepage band; News volume | ~½ day | Needs Clerk first (admin access) |
| **Resend domain verification + key** | Digests, alerts, watchdog, confirmations actually send (rows already queue honestly) | ~½ hour + DNS | Blocks all email |
| **Stripe**: account, founding+vendor prices, webhook secret; then the pending test-card checkout protocol (POST-RUN §3) | Revenue; every gate opens on real subscriptions | ~1–2 hours | Blocks revenue only; needs Clerk |
| **Inngest ↔ Vercel connect** | Scheduled ingestion, alerts-daily, webhooks-deliver, watchdog-weekly crons | ~½ hour | Blocks automation (manual CLI runs work meanwhile) |
| **Source activation** (5 active of 271; 243 discovered newsrooms + 11 portals, per-batch cost ceilings shown in-app) | Fact flow beyond Serbia; compose material | Ongoing, ~30 recommended first | The growth lever |
| CH_API_KEY (free) → `pnpm ch:enrich` | Companies House anchors on ~1,000 GB orgs | ~½ hour | No |
| VOYAGE_API_KEY → `pnpm embeddings:backfill` | Semantic search + similar-entities legs | ~½ hour + ~$1-scale embedding run | No |
| ToS + privacy pages (counsel) | Footer legal links (deliberately absent, nothing false rendered) | External | Before real member volume |
| Next registers: FINMA/AFM/Norway/HANFA adapters "one harvester away"; FCA free signup | Breadth beyond current 5 harvested registers | Code-adjacent (small adapters) | No |

### (B) DATA-GATED — shipped complete, renders when thresholds are met (current vs required, derived)

| Feature | Gate | Today |
| --- | --- | --- |
| Comps engine (/tools/comps) | ≥8 amount-parsed deals per class | **1 deal with amount, total** — Building note renders |
| Taxonomy market fronts beyond the 4 curated | ≥15 entities OR ≥10 signals/90d per class | PE 83✓ · credit 17✓ · real assets 3✗ (signals 0 across classes — 90-day window has aged past the backfill) |
| Deal-value league tables on /rankings | committed comment: deal density insufficient — "a single tracked deal would make a fake table" | 1 deal |
| Discussed band, watcher counts, Verified-vendor line, seat counter, warm paths, Watchdog content | organic minimums (≥2 posts/7d; N≥3 watchers; active subs; member density) | all below minimum — hidden or quiet, as designed |

### (C) BACKLOGGED — deferred with committed reasons (from code comments + reports)

| Feature | Committed reason |
| --- | --- |
| Thread nesting/replies | "flat, chronological — replies are a later decision"; statements over argument trees |
| Multi-hop intro chains | "v2 when member density justifies"; consent doesn't compose transitively v1 |
| Learning digest ranking | click-tracking ethics undecided; **open pixels ruled out permanently**; `?ref=` param is the future candidate, only with volume |
| Metered API pricing | log-only until enterprise demand makes it a real decision |
| Brief PDF export | "Download = browser print (PDF export BACKLOG)" |
| Cross-document RAG | returns only with per-quote provenance; substring guard can't police corpus blends |
| Scout rewards/gamification | "incentives after volume exists, if ever, and never as gamification" |
| Contributor "people you may know" inference | never — privacy law |
| Logo binary self-hosting (R2) | favicon URLs only; "we never store image bytes" |
| X/Twitter as a source | excluded by design — paid API, ToS |
| APR (RS business register) pledge/enforcement layer & similar deep-register extensions | catalogued in register-catalog as future harvesters; not scheduled |

*(The prompt's mention of audio/WhatsApp: no trace exists in code, docs, or backlog — never
planned in this repo; listed here only to state that plainly.)*

---

## 6. APPENDICES

### A. Route inventory (72 pages · 17 routes — from the file tree)
Public: `/` · `/news` · `/news/[slug]` · `/feed` · `/companies` · `/companies/[slug]` ·
`/companies/[slug]/brief` · `/funds` · `/funds/[slug]` · `/deals` · `/deals/[slug]` ·
`/ecosystem` · `/rankings` · `/auctions` · `/search` · `/coverage` · `/markets/[vertical]` ·
`/solutions/[persona]` · `/events` · `/events/[slug]` · `/events/[slug]/prep` ·
`/events/[slug]/prep/[entity]` · `/events/calendar.ics` · `/digest` · `/digest/[date]` ·
`/reports` · `/reports/serbian-insolvency-monitor-q3-2026` · `/methodology` · `/about` ·
`/styleguide` · `/community-guidelines` · `/docs/api` · `/docs/mcp` · `/pricing` (+success,
cancelled) · `/subscribe` · `/confirm/[token]` · `/unsubscribe/[token]` · `/sign-in` · `/sign-up`.
Member: `/account` · `/account/watchlist` · `/account/updates` · `/account/api` · `/universe` ·
`/contribute` · `/documents/[id]` · `/tools/npl-simulator` · `/tools/comps`.
Admin: index · review (+article/[id]) · entities (+new, [slug]) · edges · timeline · sources
(+new, [id]) · documents (+[id]) · digests (+[id]) · contacts · universe · write · moderation ·
claims · anomalies · ops.
API: `/api/v1/*` (6) · `/api/mcp` · `/api/webhooks/clerk` · `/api/webhooks/stripe` ·
`/api/inngest` · `/api/quick-search` · `/api/map/entity/[id]` · `/api/watchlist` ·
`/api/export/entities` · `/api/export/view` · `/admin/universe/export`.

### B. Script inventory (root package.json)
`dev` / `build` / `typecheck` / `lint` / `format` — workspace basics · `verify` — all 33 suites
· `cli` — db admin CLI · `seed` — dev seed. Harvest: `gleif:harvest`, `registers:harvest`
(cssf|nbs|amf|lb), `wikidata:harvest`, `ch:enrich`, `universe:import`, `universe:verify`.
Discovery: `sources:discover`, `portals:seed`. Extraction/LLM: `extract:batch`,
`extract:benchmark`, `articles:compose`, `enrich:batch`, `classify:corpus`,
`embeddings:backfill`. Record ops: `filings:backfill`, `alsu:history`, `anomalies:scan`,
`geocode:backfill`, `logos:backfill`, `alerts:backfill`, `contacts:send-confirmations`.
Exports: `export:entities|edges|facts|documents`. Events: `events:import`, `events:harvest`.
Ops: `ops:backup-check`.

### C. Migration list (26, `packages/db/drizzle`)
0000–0019: graph core → details → sources/documents → facts → engagement → anomalies → digests
→ geocodes → articles → members → saved views → classifications → watchlist/alerts (0019).
0020 member_subscriptions + export log + briefs · 0021 reactions/threads/reports + member
role/ban fields · 0022 events detail + attendance + contact_requests · 0023 private edges +
affiliation + contact_requests generalization · 0024 claims/vendor/API/webhooks + steward
statement · 0025 intelligence (doc_chats, ask_groundings, member_daily_usage,
scout_submissions, watchdog_briefs, watchdog opt-in).

### D. Register accessibility matrix (summary of docs/register-catalog.md, probed 2026-07-20)
Harvested (5): GLEIF (JSON API + RR file) · CSSF LU (bulk zip) · NBS SK (whole-market JSON) ·
AMF FR (data.gouv CSV) · Bank of Lithuania (CSV export). One-adapter-away (4): FINMA CH (XLSX),
AFM NL (CSV), Norway (open REST API), HANFA HR (XML). Registration-gated: FCA GB (free API
signup). Parseable-HTML (8): KNF PL, ČNB CZ (partial CSV), ASF RO, Latvijas Banka, FSC BG,
FI EE, FI SE, CNMV ES. Blocked (9): BaFin DE (malformed headers — "highest-value fixable"),
DK (SPA), FI-FSA, MNB HU, HCMC GR (geo), CMVM PT, MFSA MT, FMA AT, CONSOB IT (hardest), ATVP
SI. Deliberately not harvested: Central Bank of Ireland (robots.txt prohibition respected).
Fallback: ESMA central registers cover blocked EU NCAs at lower granularity.

### E. Environment variables (33 names from .env.example; purposes only)
Data: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`. LLM/AI: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`.
Crawl: `FIRECRAWL_API_KEY`, `CH_API_KEY`. Email: `RESEND_API_KEY`. Auth:
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`. Billing:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FOUNDING`, `STRIPE_PRICE_VENDOR`,
`STRIPE_METER_EVENT_NAME`, `FOUNDING_CAP`. Jobs: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`,
`ARTICLES_WEEKLY_ENABLED`, `DIGEST_AUTODRAFT`. Observability: `SENTRY_*` (5),
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `LANGFUSE_*` (3). Rate limiting (future): `UPSTASH_REDIS_*`
(2). Legacy alerts: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
Currently set in the live .env (names only): DATABASE_URL ×2, FIRECRAWL, INNGEST ×2, ANTHROPIC
— plus two retired Basic-Auth vars that can be deleted.

---

*Derivation notes: corpus/GTM/spend figures = one read-only SQL sweep (2026-07-21); tables =
`pg_tables`; routes/scripts/migrations/envs = file counts in the repo; design tokens =
globals.css verbatim; register matrix = docs/register-catalog.md; 90-day plan = verbatim quote.
Flagged disagreements: README prerequisites stale; verify-suite count 32 vs 33 across docs.*
