# EUROPE DEPTH RUN — per-country report ledger

Master source-catalog + harvest + classification + enrichment across all 39
European countries, equal treatment per country. Constitution: CLAUDE.md.
Source ledger: docs/EUROPE-SOURCE-CATALOG.md (generated from
`data/europe-depth/*-sources.json`). Budget: $20 hard cap total, $0.45/country
sub-budget, one persistent ledger (`data/europe-depth-ledger.json`).

STANDING NOTE (repeated in every report): press-extracted facts land
PROPOSED and are publicly invisible until the operator's review session;
Tier 1–2 register entities activate immediately. Machine-proposed
classifications (source `keyword`) are review-gated, never auto-approved.

HARD-RULE RECORD: competitor platforms (Preqin/PitchBook/Dealroom/Crunchbase/
CB Insights) are analyzed as market maps in the source catalog and NEVER
scraped; robots.txt prohibitions honored (CBI IE stays unharvested); no
paid/ToS-locked APIs.

---
## DE

- entities: 1122 → 1299 (923 active)
- classified: 154 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 4
    - Private Debt & Credit: 37
    - Real Assets & Infrastructure: 34
    - Liquid Alternatives & Hedge Funds: 76
    - Niche & Emerging Alternatives: 4
    - Institutional Service Graph: 0
- Level-3 strategies found: clo, crypto, global_macro, infrastructure_economic, ip_royalties, litigation_finance, mezzanine, secondaries
- field coverage (1284 orgs): legal_name 0% · reg-no 72% · LEI 71% · VAT 0% · legal_form 0% · status 0% · address 0% · website 13% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: city 852 · unlocated 712 · rooftop 108 · street 18
- facts: proposed 5
- sources in DB: signals_press 15 · signals_press active 12
- ledger: DE $0.460 / $0.45 · cumulative $0.460 / $20.00

### DE run notes (2026-08-04)

- **Sources**: 70 cataloged (41 entities-side / 29 news-side; catalog target 50 ✓).
  12 news sources ACTIVE (10 newly activated), 25 seeded inactive, 4 dead/blocked
  documented (FINANCE Magazin js-blocked; FinanzNachrichten, BaFin RSS, Bundesbank
  RSS feeds dead at probe).
- **Harvest**: BAI member directory 316 names → 138 created provisional + 90
  keyword classifications proposed; BKS (NPL association) 39 names → 33 created +
  34 classifications (private_debt/npl). 129 BAI + 5 BKS ambiguous rows SKIPPED
  per dedup law (international members colliding cross-country — correct guard
  behavior). BaFin InstInfo/FondsInfo remain WAF-blocked (documented; ESMA covers
  DE AIFMs). Bundesanzeiger session-gated (documented).
- **Enrichment**: BAI detail pages → 183 websites deterministically filled
  (129 unresolved skipped). Logos: 23 stamped this pass (provisional entities
  excluded until review — honest gap). Geocode: 852 DE entities located (108
  rooftop / 18 street / 852 city among located), 712 unlocated (new association
  rows carry no city — they get addresses at website-verify).
- **Extraction**: $0.460 spent (sub-budget $0.45, stop-after-threshold), 8 docs
  processed → 5 relevant → 4 facts PROPOSED · backlog 53 docs logged in ledger.
  Anti-fabrication guard dropped 1 non-verbatim excerpt (working as designed).
- **Top 3 sources**: BAI directory (density of exactly-in-scope alternatives
  firms + categories), BKS (the German NPL universe in one page), VentureCapital
  Magazin RSS (highest extraction relevance).
- **Surprise**: Germany still has NO free machine route into Handelsregister
  (2019 OffeneRegister dump is the only bulk artifact); the register moat in DE
  is gazette-side (Handelsregisterbekanntmachungen), not register-side.

## GB

- entities: 903 → 3771 (3376 active)
- classified: 2532 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 522
    - Private Debt & Credit: 519
    - Real Assets & Infrastructure: 279
    - Liquid Alternatives & Hedge Funds: 955
    - Niche & Emerging Alternatives: 2
    - Institutional Service Graph: 255
- Level-3 strategies found: carbon_markets, infrastructure_economic, real_estate_debt, secondaries
- field coverage (3756 orgs): legal_name 67% · reg-no 90% · LEI 23% · VAT 0% · legal_form 67% · status 67% · address 67% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 3330 · unlocated 696 · rooftop 42 · street 6
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 1 · signals_press active 12 · signals_press 11
- ledger: GB $0.469 / $0.45 · cumulative $1.454 / $20.00

### GB run notes (2026-08-04)

- **Sources**: 65 cataloged (43 entities-side / 22 news-side; target 50 ✓).
  12 news active (8 newly + 4 carried from clean-100: PE Wire, AltAssets,
  Sifted, PDI). Bank of England news js-blocked (documented).
- **Harvest**: Companies House Free Company Data bulk (5,695,468 rows scanned,
  $0, no key needed) → 2,967 SIC-bucketed picks → 2,500 created ACTIVE with
  full depth fields (reg number, legal form, status, registered address,
  incorporation date), 466 ambiguous skipped per dedup law, 2,501 register
  classifications proposed across 13 SIC buckets (64303 VC 600 · 66300 fund
  mgmt 600 · trusts/OEICs/REITs 767 · 82911 collection agencies 300 ·
  6492x credit 300 · aux 400). SIC 64205 (financial holdcos) deliberately
  EXCLUDED: six-figure shelf-vehicle count, no alternatives signal.
  UK Private Capital (ex-BVCA) directory: 543 names → 375 created provisional
  with per-member true countries, 147 ambiguous skipped.
- **Enrichment**: 2,460 city-centroid locations seeded from PostTown geocoding;
  websites 0% from the bulk file (Companies House carries none — FCA register
  API [free operator key] + streaming API documented as the follow-up route).
- **Extraction**: $0.469 spent → 11 processed, 4 relevant, 4 facts PROPOSED,
  backlog 45. Round-robin by source active (post-DE fix).
- **Top 3**: Companies House bulk (the single richest $0 register in Europe),
  UK Private Capital directory, UKTN RSS (2 relevant of 2 processed).
- **Surprise**: the UK is the ONLY European jurisdiction with genuinely open
  UBO data (PSC bulk snapshot) — recorded for the legal-gated future decision,
  NOT ingested (constitution UBO rule).

## FR

- entities: 1398 → 1628 (1422 active)
- classified: 274 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 6
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 23
    - Liquid Alternatives & Hedge Funds: 4
    - Niche & Emerging Alternatives: 40
    - Institutional Service Graph: 199
- Level-3 strategies found: carbon_markets, clo, crypto, infrastructure_economic, insolvency_practitioner, litigation_finance, secondaries
- field coverage (1625 orgs): legal_name 2% · reg-no 88% · LEI 82% · VAT 2% · legal_form 0% · status 2% · address 0% · website 17% · licence 2% · share_capital 0% · email 0%
- logo coverage: 15%
- geocode precision: city 886 · unlocated 825 · rooftop 227 · street 13
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 118 · tier4_exchange_corporate active 8 · signals_press active 10 · signals_press 10
- ledger: FR $0.525 / $0.45 · cumulative $1.454 / $20.00

### FR run notes (2026-08-04)

- **Sources**: 70 cataloged (44 entities-side / 26 news-side; target 50 ✓).
  10 news newly active incl. 4 crawl-index (Les Echos Capital Finance, CFNEWS
  IMMO, H24, Décideurs); 6 js-blocked documented (La Tribune, Business Immo,
  Le Monde Éco, Bpifrance media). France's open-data spine (BODACC API, BALO
  API, INPI RNE, Sirene API, data.gouv) cataloged as the standing tier-1/3
  machine routes — BODACC procédures-collectives feed is the top future
  distressed-signals adapter.
- **Harvest** (AMF SGP register from prior runs stands — extended, not
  re-cataloged): AMF PSAN/CASP whitelist → 36 active licensees, 32 created
  ACTIVE with email/phone/VAT (deterministically derived from SIREN)/LEI/
  licence numbers; 319 MiCA-radiated rows skipped mechanically; 34 digital-
  assets classifications. CNAJMJ insolvency-practitioner roll → 206 firm-form
  entities (199 created + classified service_graph/insolvency_practitioner);
  INDIVIDUAL practitioners excluded by the consent doctrine filter.
- **Enrichment**: geocode + locations seeded in the shared passes (227 rooftop
  FR rows from earlier GLEIF address work); logo coverage 15%.
- **Extraction**: $0.525 (the last accepted doc overshot the $0.45 line —
  stop-check is pre-call; documented), 11 processed → 6 relevant → 3 facts
  PROPOSED (incl. Adagia/Schwind buyout via firm newsroom), backlog 47.
  Anti-fabrication guard dropped 1 non-verbatim excerpt.
- **Top 3**: AMF PSAN CSV (richest per-row depth of any source yet: 9 schema
  fields/row), CNAJMJ (199 service-graph entities in one page), CFNEWS RSS.
- **Surprise**: France Invest's directory is no longer login-walled at the
  listing level — future member-page adapter candidate; and the PSAN→MiCA
  transition means the MiCA-agréé CASP list (separate AMF register) is the
  live crypto register going forward.

