# Continuum Alternatives — project constitution

This file is the constitution. Re-read it at the start of every run and build in
accordance with it. When a phase prompt and this file conflict on a HARD RULE,
this file wins and you flag the conflict. When they conflict on anything else,
the user's current instruction wins.

`docs/VISION.md` is the companion document: the business, design, and feature
vision in the user's own words. Read it too. This file governs HOW you build;
VISION.md governs WHAT is being built and WHY.

---

## 0. HOW CLAUDE MUST BEHAVE (the most important section — read first)

The user sets the vision. You execute it. Your job is to build what the user
specified, faithfully, not what you judge to be best.

- **The user's stated vision and the phase spec are the instruction.** Build
  them as written. Do NOT silently alter code, schema, spec, or approach based
  on your own judgment or your reading of past history.
- **Advice is allowed, but only as clearly-labeled, separable suggestions** —
  never folded into the spec or the code as if the user asked for it. Mark it
  plainly, e.g. `> SUGGESTION (optional): …`. The user can take it or delete it.
  Never let a suggestion change what you build unless the user says so.
- **When you disagree or see a real problem**, handle it by the rule below and
  then build the user's version regardless:

  **ADVICE-HANDLING RULE: [[FILL IN — A, B, or C]]**
  - (A) Flag the concern clearly, then build exactly what the user asked.
  - (B) Flag the concern and PAUSE for the user's yes/no before building.
  - (C) Stay silent about concerns unless the user explicitly asks.

- **Never reintroduce a direction the user has corrected.** If the user has
  changed course, the old course is dead — do not let historical context or a
  prior phase pull the build back toward it. (See the CEE/Europe mandate below —
  this has been corrected repeatedly; do not drift.)
- If a genuinely blocking ambiguity exists, ask ONE precise question rather than
  guessing. Otherwise proceed.
- Report honestly: what you built, what you skipped, what failed, what's
  proposed vs live. Never overstate. Never claim something works that you did
  not verify.

---

## 1. WHAT THIS IS (identity — do not drift)

Continuum Alternatives is the intelligence network and map for **European**
alternative investments and the institutions around them — data, signals, and a
professional network in one platform.

**IDENTITY = whole Europe, all alternative-asset classes.** This is the
long-term positioning and must be reflected in all copy and framing.

**LAUNCH DEPTH / COVERAGE LEAD = CEE-comprehensive.** The starting point — where
coverage is deepest and go-to-market begins — is Central & South-Eastern Europe
covered completely, across ALL entity types and ALL asset classes. This is a
depth/sequencing decision, NOT an identity limit.

**Serbian registry (ALSU) data is ONE source among many — demoted.** It is not
the identity, not the moat framing, not the center of gravity. Never let the
build tilt toward "a Serbian distressed platform." (This has been corrected
multiple times; treat any drift back toward it as a bug.)

Positioning language: an **intelligence network** for European alternatives —
which naturally spans news/signals, the entity map, the professional network,
research, and AI tools. Not "just a database."

---

## 2. THE TAXONOMY (the classification spine — use this exact structure)

Six categories, each with the sub-strategies and the entity types to find, map,
and classify. This is the canonical taxonomy for classification and per-class
coverage reporting. Every entity is classified into one of these six; category-
level is fine when the sub-strategy is unknown; never force-fit — unclassifiable
stays unclassified.

1. **Private Equity & Growth** — Buyout, Growth Equity, VC (Seed/Series A–C),
   PE Secondaries, Co-Investments, Continuation Vehicles.
   → GPs, LPs, Portfolio Companies, Venture Studios, Placement Agents, Secondary
   Intermediaries, Fund SPVs.

2. **Private Debt & Credit** — Direct Lending, Distressed Debt, NPLs, Mezzanine,
   Venture Debt, Asset-Backed Lending (ABL), Trade/Supply-Chain Finance, Real
   Estate Debt, Specialty Finance.
   → Direct Lenders, NPL Servicers, Debt Collection Agencies, Debt Originators,
   Asset Reconstruction Companies, Security Trustees, Insolvency Practitioners,
   SPVs / CLOs.

3. **Real Assets & Infrastructure** — Core/Core-Plus RE, Value-Add/Opportunistic
   RE, Logistics/Data Centers, Digital Infrastructure (Fiber/Towers), Renewable
   Energy/Transition, Agriculture & Timberland, Social Infra.
   → REITs (private/public), Real Estate Developers, Property Management Firms,
   Concessionaires, Energy Transition SPVs, EPC Contractors, RICS-Accredited
   Valuers/Appraisers, OpCo/PropCo structures.

4. **Liquid Alternatives** — Long/Short Equity, Global Macro, Multi-Strategy,
   Event-Driven, Quant/CTA, Relative Value.
   → Investment Management Companies (ManCos), Offshore-Domiciled Funds (LU
   SICAVs, IE ICAVs), Prime Brokers, Fund Auditors, Execution Brokers.

5. **Niche & Emerging Alts** — Litigation Funding, IP & Music Royalties, Carbon
   Credits & Environmental Alts, Insurance-Linked Securities (ILS/Cat Bonds),
   Sports Asset Funds, Tokenized RWA.
   → Litigation Financiers, Law Firm Panels, Royalty Management Entities, Carbon
   Registries, Reinsurance SPVs, Sports Holding Entities, Tokenization Protocol
   Operators.

6. **Institutional Service Graph** (ecosystem enablers across all classes)
   → Fund Administrators, Depositary Banks, Custodians, Specialized M&A /
   Fund-Structuring Law Firms, Regulatory Compliance Advisors, ESG Auditors.

Categories 5 and 6 are explicitly in scope and are differentiation — actively
source and classify them, never treat them as an afterthought. Every coverage
report lists all six categories with honest counts (zeros shown), so thin
coverage is a visible sourcing target, never a silent omission.

---

## 3. ARCHITECTURE

Monorepo: `apps/web` (Next.js 15, App Router, React 19, Tailwind v4),
`packages/db`, `packages/pipeline`, `packages/shared`. pnpm workspaces, strict
TypeScript everywhere.

**Stack (decided; never substitute):** Neon Postgres (+ pgvector, PostGIS) with
Drizzle ORM · Clerk auth · Inngest jobs · Langfuse LLM observability · Upstash
Redis · Sentry · Voyage embeddings · Resend email · Firecrawl crawling ·
MapLibre GL + deck.gl maps · Vercel hosting (Root Directory apps/web;
vercel.json pins framework nextjs) + Cloudflare.

**UI component stack (decided):** shadcn/ui + Tremor (free) for structure and
data components; Aceternity UI for marketing/dazzle surfaces; Tailwind Plus /
Catalyst for institutional application surfaces; React Flow for network/node
graphs; framer-motion for motion; lucide-react for icons (one icon system).
All of these are reconciled to the design tokens — see §4.

---

## 4. DESIGN MANDATE

**DESIGN SCOPE RULE: [[FILL IN — i or ii]]**
- (i) The new component stack (shadcn/Tremor/Aceternity/Tailwind Plus, lucide
  icons, dark mode, motion) applies across ALL surfaces; the old strict
  prohibitions (no shadcn, no icons, no dark mode) are RETIRED.
- (ii) TWO-REGISTER DOCTRINE: dazzle/rich components (Aceternity, motion,
  globe, 3D) on MARKETING & PERSUASION surfaces (landing, hero, solutions,
  pricing); crisp, dense, still, institutional treatment on WORKING/RECORD
  surfaces (news feed, screener, tables, map, profiles). Both draw from ONE
  token system so they read as one platform.

**The token system is the single visual source of truth.** The `/styleguide`
route and the design tokens (globals.css) define fonts, colors, spacing, radii,
and the asset-class accents. EVERY component from EVERY library must be
reconciled to these tokens (strip each library's default colors/fonts/radii and
re-skin to ours) so four libraries read as one platform. When adopting a library
component, the instruction is always: integrate it, restyled to our tokens.

**Typography & accents:** [[the styleguide direction pick governs this — the
three-direction choice on /v2/styleguide is still open; once picked, that
direction's fonts + palette are the contract. Until then, v2 uses Newsreader +
Instrument Sans sharpened.]]

**Asset-class accents** (per the six categories) appear ONLY in restrained slots
— kicker text, a top/left rule, or a chip — never as backgrounds, fills,
headlines, or buttons. Muted, institutional, never neon.

**AI-labeling (compliance):** every machine-generated or AI-composed surface
(articles, signals, summaries, briefs) must be visibly labeled as such.

---

## 5. DATA INTEGRITY LAWS (hard rules — never violated)

- **Deterministic-first.** Registry/structured data is mapped by code at $0.
  LLMs are used ONLY where prose genuinely requires it (extraction from
  unstructured text, composition, summaries) — never for bulk structured
  mapping, never as a substitute for a deterministic parser.
- **LLMs never do arithmetic on amounts.** All monetary math, and all currency
  conversion (ECB reference rates, in code), is deterministic. Always store the
  original amount + currency + rate date alongside any EUR-converted value.
- **`timeline_facts` is append-only.** Application code never UPDATEs or DELETEs
  there. Bad rows are marked `status='rejected'`, never deleted.
- **Nothing publishes below its confidence threshold without human approval.**
  Everything machine-proposed lands in the review queue. Register-grade
  (Tier 1–2) entities may activate directly; press-extracted facts are ALWAYS
  proposed. An entity record never originates from a press source.
- **Provenance is mandatory.** Every fact carries its source; every source
  carries its authority tier (registry / regulator / gazette / exchange-corporate
  / signals-press). Missing/unverified fields are `null`, never guessed.
- **Anti-fabrication guards stay on** for every LLM surface (entity names and
  quoted text must appear verbatim in the source; digit guards; drops logged).
- **Never estimate** fields that don't exist in public sources (e.g. dry powder,
  target IRR). Never collect individuals' personal data at scale (no LinkedIn-URL
  harvesting). Never assume open UBO data (EU public access is restricted).
- **Copyright/compliance discipline:** ingest official registries, filings, and
  own content; do NOT reproduce third-party news content wholesale (headline +
  link + short review-gated extraction only); honor robots.txt; never scrape
  competitor platforms (Preqin/PitchBook/Dealroom/Crunchbase/CB Insights) or use
  paid/ToS-locked APIs (e.g. X/Twitter).
- **Secrets live in `.env` only;** `.env.example` documents every variable;
  never commit secrets.

---

## 6. BUILD DISCIPLINE

- Work proceeds in phases / page-by-page. Build ONLY what the current prompt
  specifies. Never install a package, add a route, or create a table the prompt
  does not name — unless it's in the decided stack above and the task needs it.
- **Branch discipline:** the new front end is built on its own branch
  (`frontend-v2`); redesign work stays on its branch; NEVER merge to `main`
  without the user's explicit say-so. `main` stays live and deployable.
- **Mock-data doctrine:** design/build against the mock layer
  (`packages/shared/src/mock`, `MOCK_MODE` / `?mock=1`) so every page renders
  full and interactive. The switch lives at the repo/query layer so pages don't
  change when it flips to real data. Mock data is clearly labeled scaffolding,
  never seeded into the real DB, never shown when the flag is off.
- **Budgets:** every LLM run carries a hard dollar cap and prints a running
  ledger; stop cleanly at the cap and report the backlog. Storage guard against
  the DB ceiling between bulk steps.
- **Every phase ends green:** `pnpm typecheck`, `pnpm lint`, `pnpm build` clean;
  the phase's stated verification checks; the phase's verify suite passing; a
  single commit; push. Report per phase.
- Commit and push after each resumable unit so interruptions cost little; large
  runs are structured to resume from the last commit.

---

## 7. STANDING OPERATOR CONTEXT (not code — for accurate reporting)

The platform's remaining launch gate is operational, not code: Clerk keys +
admin role (unlocks /admin, /account, member features), the review queues
(thousands of proposed edges + proposed facts hold the graph's density and the
pan-European signal layer), Resend, Stripe, Inngest, and source activation.
See `docs/POST-RUN-CHECKLIST.md`. When reporting, always state honestly that
machine-proposed data is invisible publicly until the operator's review session,
and that register-grade entities are live immediately.
