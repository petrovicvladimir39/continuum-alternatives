# Continuum Alternatives — vision

Companion to `CLAUDE.md`. This is the WHAT and WHY (business, design, features);
CLAUDE.md is the HOW (rules of building). Where this document and a build prompt
differ on intent, the user's current instruction wins.

> NOTE: Sections marked `[[USER: …]]` are for the user to write or confirm in
> their own words. Claude must not fill these with its own judgment — they are
> the user's vision to state. Everything else reflects decisions already made.

---

## 1. The one-liner

The intelligence network and map for European alternative investments — data,
signals, entity mapping, professional network, research, and AI tools in one
platform. Identity: whole Europe, all alternative-asset classes. Launch depth:
CEE-comprehensive.

`[[USER: refine the one-liner in your own words if you want a different emphasis.]]`

---

## 2. The problem

European private markets are fragmented, opaque, and relationship-driven.
Incumbents (Preqin, PitchBook, Dealroom, Bloomberg, eFront, Hebbia) each own a
piece — data depth, deal intelligence, portfolio tools, document AI — but none
combine Europe-first entity mapping + a verified professional network + curated
signals + free-to-paid AI tools + news/intelligence in one place. Coverage is
thinnest exactly where Continuum leads: private credit, distressed/NPL, the
niche & emerging classes, the service graph, and CEE/SEE markets.

`[[USER: add or adjust the problem statement as you see it.]]`

---

## 3. Positioning & moat

Positioned as an **intelligence network**, not a database. The defensible edges,
built deliberately:

- **The entity graph + relationship layer** — every entity (GP, LP, fund,
  servicer, advisor, vendor, government body, individual) connected by typed,
  dated, sourced relationships; the basis for warm-intro routing and analysis.
- **Signals** — platform-generated, provenance-first events (fundraising, hires,
  closes, regulatory moves, NPL sales, defaults, secondaries) mixed with
  verified user commentary; higher signal-to-noise than LinkedIn or X.
- **Provenance-first architecture** — every datapoint cited to a source with an
  authority tier; bitemporal, append-only, human-review-gated. Compliance and
  trust as a moat, not just a feature.
- **CEE/SEE + niche-class density** — coverage nobody else carries.
- **AI-native access** — REST API + MCP server; a member's own AI can query the
  record and get cited answers.

`[[USER: confirm the positioning line and moat priorities; reorder or rewrite.]]`

---

## 4. The starting point (locked)

- **Identity:** whole Europe, all six taxonomy categories.
- **Launch coverage lead / depth:** CEE-comprehensive — CEE/SEE covered
  completely across every entity type and every asset class.
- **Serbian ALSU data:** one source among many, demoted; never the identity.
- Pan-European entity breadth already harvested; the current focus is CEE
  *depth* and completeness before widening activity westward.

---

## 5. Product surfaces (the vision, page by page)

> The v2 front end is being built page by page on the `frontend-v2` branch,
> mock-data-first. This is the intended surface set; the user directs the order.

- **News (landing / home)** — the default landing experience. A living
  news/signals feed with an AI-style command bar at the top (natural-language
  input that resolves to structured filters — feels like an intelligence engine,
  is filtering underneath). `[[USER: confirm — Morning Signals grouped-counts
  style? personalized morning-briefing framing? the "AI command canvas" hero?]]`
- **Network & Threads** — a high-signal professional feed (an "X" for verified
  alternatives professionals), posts anchored to entities/events, @entity
  auto-tagging with hover-cards, business-only, moderated.
- **Universe (the map)** — the signature feature. An interactive map of European
  entities with drill-down (Europe → country → city → entity with logos), layers
  by role and by asset class, filters, slide-out entity panels. `[[USER: confirm
  the 3D-globe entry → 2D drill-down map behavior and where the globe lives.]]`
- **Products** — a Preqin/PitchBook-style suite: entity screener, transaction
  engine, NPL simulator, and (labeled as preview where the data layer isn't
  built) term intelligence / benchmarks / ESG. Enterprise data & MCP docs.
- **Solutions** — persona landing pages (raise capital, deal sourcing, portfolio
  monitoring, NPL servicing, investor relations, vendor diligence).
- **Reports & Insights** — a Dealroom-style research hub with shareable "atomic
  insight" cards (every chart/stat shareable as a branded image linking back).
- **About** — manifesto, methodology (sources + review gate + provenance),
  pricing, contact.
- **Workspace / account** — member area: watchlists, alerts, saved queries,
  settings, API keys.

`[[USER: add any page/feature I've missed, or restructure the nav as you want.]]`

---

## 6. Design direction

- Institutional-tech register: credible for a financial-intelligence product,
  distinctive (not a generic SaaS template).
- **Two-register doctrine** (per CLAUDE.md §4): dazzle on marketing surfaces,
  density on working surfaces, one token system underneath.
- Component stack: shadcn + Tremor (free) + Aceternity (dazzle) + Tailwind Plus
  (institutional application UI), React Flow graphs, framer-motion, lucide.
- Asset-class accents used only in restrained slots (kicker / rule / chip).
- `[[USER: the three styleguide directions (A refined-classic / B modern-
  editorial / C terminal-mono) — record your pick here once chosen.]]`

---

## 7. Business model

Freemium, ladder toward enterprise:

- **Free** — public record (entities, news, map, coverage), free membership
  (limited watchlists, daily digest, one saved-view alert), newsletter, free AI
  tools.
- **Pro** — `[[USER: confirm a Pro tier (~€39–79/mo) between free and founding —
  unlimited searches, alerts, relationship graph, advanced filters, saved
  dashboards? decide yes/no and the price.]]`
- **Founding membership** — capped, price locked for life: unlimited watchlists,
  instant alerts, standing queries, exports, entity briefs. `[[USER: confirm the
  founding price — earlier working figure ~€490/yr.]]`
- **Vendor tier** — verified advisor/service-provider profiles with
  client-consented track records.
- **Enterprise** — API + MCP access, webhooks, usage-based pricing; later,
  institutional research subscriptions and sponsored ecosystem reports.

`[[USER: confirm the tiers, prices, and what sits in each.]]`

---

## 8. Growth loop — earned reputation (the "Standing" layer)

Members build visible professional standing on the platform, which motivates
them to contribute and bring credible peers (because their standing is a
portable professional asset). Three woven strands, all in an institutional /
credential register (NOT points/badges/karma/leaderboards):

- **Track record** — verified contributions, cited insights, attributed
  analysis (CV-like).
- **Influence** — quiet professional visibility ("followed by N", "watched by
  analysts at N firms").
- **Being right over time** — a verifiable record of calls that proved accurate,
  measured honestly against the bitemporal record.

Earned via multiple paths: bringing verified peers, contributing data others
rely on, being publicly right over time.

`[[USER: name the layer (working name "Standing") and confirm the register.]]`

---

## 9. Mobile

Responsive web + PWA now (with push notifications for alerts/signals). Native
app deferred until members demand it (backend reuses 100%; only the frontend
would need a React Native/Expo rebuild).

---

## 10. Go-to-market (direction)

Lead with CEE-comprehensive coverage and the distressed/NPL + private-credit
communities where coverage is deepest; free research + newsletter as the
acquisition engine; hand-recruit the first members; the MCP/API "your AI can
query Continuum" story as the enterprise wedge; expand activity westward as
depth allows.

`[[USER: adjust the GTM sequence and first-market focus as you see it.]]`

---

## 11. Compliance posture

Provenance-first and AI-labeled by design — turned into positioning. Official
registries + filings + own content are the clean data foundation; third-party
news is headline+link+review-gated only. GDPR-native (consent-first for any
personal data; no scraped career histories; no assumed-open UBO data). Verify
specific EU AI Act / copyright details against real sources and counsel before
making regulatory claims on the site.
