# Post-run checklist — consolidated reset build (2026-07-20)

What the operator must now do, in suggested order. Everything below is a
human decision the build deliberately did NOT automate.

## 1. Review queue approvals

- [ ] **2 proposed News Desk articles** — /admin/review?filter=articles
      (Uljanik shipyard sale · AB CORSA insolvency). The run was capped at 5
      but only two fact groups in the corpus carry verbatim excerpts —
      ALSU deterministic-mapper facts have none by design, so they can't
      honestly feed compose. Composed from approved facts only, mechanically
      guarded; headline/deck/body editable in place. Approve → published
      (live on / and /news), Reject → archived. Nothing auto-publishes.
      More articles arrive as press/newsroom extraction produces
      excerpt-bearing facts.
- [ ] **~8,300 proposed `manages` edges** (GLEIF RR + CSSF) — /admin/review
      filter "edges". These are register-grade (confidence 0.97) but ship
      proposed per doctrine. Batch-approve is available; spot-check a page
      first (source = manager, target = fund).
- [ ] **Ambiguous register rows** were skipped, never merged — the harvest
      logs list them (re-run any harvester to reprint). Merge manually in
      /admin/entities where you recognize a true match.
- [ ] **37 provisional Wikidata orgs** — run `pnpm universe:verify` to put
      them through the website-verification gate; crowd-sourced rows never
      auto-activate.

## 2. Source activations (all created INACTIVE — $0 until you act)

Activate in /admin/sources — the bulk panel shows the monthly extraction
ceiling per country × type at the point of decision.

Suggested first batches:
- [ ] **Industry portals (11 seeded, type press)** — start with
      The Recursive (CEE), Private Equity Wire, AltAssets (~$4.50/mo each at
      5 items/day ceiling). Il Sole + Handelsblatt are headline-level
      (article bodies paywalled) — activate once non-EN extraction is wanted.
- [ ] **Firm newsrooms** (discovered by `pnpm sources:discover`, type
      company_site, entity-linked) — activate by country batch; RSS ones are
      cheapest and most reliable. See the discovery report in the final
      session report for counts.
- [ ] The **voices layer**: add newsletter/blog RSS URLs of people you
      follow as sources with fetch method `newsletter_rss` (X/Twitter is
      excluded by design — paid API, ToS).

## 3. Keys and integrations (operator-held)

- [ ] **CH_API_KEY** — free key from
      developer.company-information.service.gov.uk, then
      `pnpm ch:enrich -- --limit 200` to stamp official Companies House
      status/incorporation/registered-office onto GB orgs (~1,000 GB
      register entities are waiting).
- [ ] **Resend domain verification** — required before digests/articles can
      be emailed from continuumalternatives.com.
- [ ] **Inngest ↔ Vercel connect** — scheduled ingestion + the (disabled)
      weekly compose trigger need the Inngest integration authorized on the
      Vercel project. The weekly article trigger stays a no-op until you set
      `ARTICLES_WEEKLY_ENABLED=1`; leave it unset until the manual compose
      loop feels right.

## 4. Enrichment extension decision

- [ ] The corpus grew ~20× (register-grade, no websites for most LEI funds).
      Decide whether to extend AI enrichment (`pnpm enrich:batch`) beyond
      the curated universe — recommendation: enrich only entities that
      gain a website (via newsroom discovery, AMF, Wikidata, CH), never
      blanket-enrich 12k LEI fund shells. `pnpm extract:batch -- --dry-run`
      previews any extraction slice with its cost ceiling before spending.

## 5. Registers to extend next (see docs/register-catalog.md)

- [ ] FINMA (CH) XLSX, AFM (NL) CSV export, Norway's open registry API and
      HANFA (HR) XML are probed, documented, and one harvester-adapter away
      each. FCA (GB) needs a free API signup. BaFin/CONSOB/FMA/ATVP/CMVM/
      MFSA are documented blockers — plan as manual-download targets.
- [ ] Re-run `pnpm gleif:harvest` with more countries/higher cap whenever
      breadth is wanted — resumable, idempotent, $0.
