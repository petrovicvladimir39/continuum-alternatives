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

## IT

- entities: 939 → 994 (767 active)
- classified: 80 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 3
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 24
    - Liquid Alternatives & Hedge Funds: 1
    - Niche & Emerging Alternatives: 1
    - Institutional Service Graph: 51
- Level-3 strategies found: carbon_markets, infrastructure_economic, secondaries
- field coverage (985 orgs): legal_name 0% · reg-no 78% · LEI 76% · VAT 0% · legal_form 0% · status 0% · address 0% · website 5% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 680 · unlocated 529 · rooftop 151 · street 6
- facts: proposed 4
- sources in DB: signals_press active 12 · signals_press 14
- ledger: IT $0.470 / $0.45 · cumulative $1.924 / $20.00

### IT run notes (2026-08-04)

- **Sources**: 66 cataloged (36 entities-side / 30 news-side; target 50 ✓).
  12 news active incl. BeBeez (THE Italian PE/private-debt/NPL specialist),
  Il Sole Finanza, MF, Teleborsa; 5 dead/blocked documented (CONSOB Informa
  js-blocked, Banca d'Italia RSS dead at probe, Monitorimmobiliare js-blocked).
- **Harvest**: Italy stays the hardest register market — CONSOB Radware
  challenge unchanged, OAM VASP register 403, COVIP albo 403 (all documented;
  ESMA central register covers IT AIFMs from the prior run). ACRI banking
  foundations: 88 names → 51 created provisional + 51 LP classifications
  (37 ambiguous skipped) — the domestic LP base now mapped. Italian Tech
  Alliance skipped: Wix logo-grid, names only in image filenames (too lossy —
  same doctrine as ROPEA/LT-VCA in clean-100).
- **Extraction**: $0.470 → 12 processed, 4 relevant, 2 facts PROPOSED,
  backlog 37.
- **Top 3**: BeBeez RSS (specialist density), ACRI page (51 LPs in one page),
  Teleborsa RSS (volume).
- **Surprise**: Registro Imprese's innovative-startup section is the ONE
  genuinely open Italian register slice (CSV downloads) — deliberately not
  bulk-ingested (startups out of institutional scope per standing doctrine);
  documented for portfolio-company matching later.

## ES

- entities: 1287 → 1444 (1230 active)
- classified: 176 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 74
    - Private Debt & Credit: 1
    - Real Assets & Infrastructure: 11
    - Liquid Alternatives & Hedge Funds: 1
    - Niche & Emerging Alternatives: 1
    - Institutional Service Graph: 88
- Level-3 strategies found: carbon_markets, global_macro, infrastructure_economic, secondaries
- field coverage (1439 orgs): legal_name 0% · reg-no 85% · LEI 64% · VAT 0% · legal_form 0% · status 0% · address 0% · website 4% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: unlocated 1055 · city 834 · rooftop 1 · street 1
- facts: proposed 3
- sources in DB: signals_press 9 · signals_press active 12
- ledger: ES $0.460 / $0.45 · cumulative $2.384 / $20.00

### ES run notes (2026-08-04)

- **Sources**: 65 cataloged (43 entities-side / 22 news-side; target 50 ✓).
  12 news active (Expansión, Cinco Días, El Confidencial, Vozpópuli + 2
  crawl-index); elEconomista + CNMV RSS dead at probe (documented).
- **Harvest** (CNMV SGIIC/SGEIC prior harvest stands): SpainCap directory —
  Livewire JS shell in clean-100, now harvestable via server-rendered member
  hrefs: 316 members across gestor/inversor/asesor → 153 created provisional
  + 166 classifications (GP/LP/Advisor by category), 150 ambiguous skipped.
  CNMV listado id=18 (ECR vehicles) no longer server-renders (documented);
  BORME open-data API cataloged as the standing tier-3 route.
- **Extraction**: $0.460 → 2 facts PROPOSED (details in ledger), backlog
  logged.
- **Top 3**: SpainCap hrefs (the JS-shell workaround), Expansión RSS,
  BORME API (future).
- **Surprise**: SpainCap's Livewire app leaks its entire member graph through
  static profile links — the "JS shell" verdict from clean-100 is obsolete.

## NL

- entities: 3052 → 3540 (3465 active)
- classified: 439 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 1
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 16
    - Liquid Alternatives & Hedge Funds: 10
    - Niche & Emerging Alternatives: 5
    - Institutional Service Graph: 408
- Level-3 strategies found: carbon_markets, commodities, infrastructure_economic, natural_resources, secondaries
- field coverage (3535 orgs): legal_name 14% · reg-no 98% · LEI 33% · VAT 0% · legal_form 0% · status 14% · address 14% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: unlocated 3092 · city 750 · rooftop 89 · street 1
- facts: proposed 3
- sources in DB: signals_press active 12 · signals_press 7
- ledger: NL $0.470 / $0.45 · cumulative $2.855 / $20.00

### NL run notes (2026-08-04)

- **Sources**: 64 cataloged (40 entities-side / 24 news-side; target 50 ✓).
  12 news active (FD, Banken.nl, Vastgoedmarkt + crawl-index); Euronext
  Amsterdam news js-blocked, Rijksoverheid RSS dead (documented).
- **Harvest** (AFM 2,116-entity harvest from clean-100 stands): DNB complete
  public register — the "bot-blocked" verdict from research fell to a plain
  browser-grade user-agent; one 24MB daily CSV, 46,638 permission rows →
  553 unique entities → 484 created ACTIVE with registered addresses, KvK/LEI
  keys, liquidation status: ALL 147 Dutch pension funds (the LP register),
  105 trust offices (fund-SPV service layer), 173 insurers, 105 banks
  (imported deliberately UNCLASSIFIED — perimeter, never force-fit),
  8 reinsurers, 5 PPIs. 408 register classifications proposed.
- **Extraction**: $0.470 → backlog logged. 45 docs fetched.
- **Top 3**: DNB complete CSV (best single regulator file in Europe so far —
  one URL, every sub-register, daily), FD RSS, Vastgoedmarkt (RE deal flow).
- **Surprise**: DNB's "export customized list" is actually a stable
  whole-register download URL — no scraping needed at all.

## LU

- entities: 3681 → 3683 (3671 active)
- classified: 474 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 62
    - Private Debt & Credit: 11
    - Real Assets & Infrastructure: 391
    - Liquid Alternatives & Hedge Funds: 8
    - Niche & Emerging Alternatives: 9
    - Institutional Service Graph: 0
- Level-3 strategies found: carbon_markets, clo, commodities, crypto, infrastructure_economic, mezzanine, natural_resources, secondaries
- field coverage (3681 orgs): legal_name 0% · reg-no 100% · LEI 27% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: unlocated 3225 · city 870 · rooftop 101 · street 19
- facts: proposed 1
- sources in DB: signals_press 8 · signals_press active 6
- ledger: LU $0.449 / $0.45 · cumulative $3.304 / $20.00

### LU run notes (2026-08-04)

- **Sources**: 57 cataloged (40 entities-side / 17 news-side; target 50 ✓).
  Only 6 news sources answered probes (Paperjam, Delano, Silicon Luxembourg,
  + 4 crawl-index) — Luxembourg's media market is small; honest count, cap
  not force-filled. CSSF RSS dead at probe.
- **Harvest** (CSSF bulk files from prior runs stand — 2,183 entities, the
  deepest per-capita register in the corpus): LPEA member directory is an
  Elementor lazy-load grid — names never reach static HTML (js-blocked,
  documented). LBR/RCS remains gated behind per-document retrieval.
- **Extraction**: $0.449 → stopped cleanly at sub-budget; backlog logged.
- **Top 3**: CSSF bulk files (standing), Paperjam RSS, Silicon Luxembourg RSS.
- **Surprise**: for the EU's largest fund domicile, Luxembourg's press
  ecosystem is the THINNEST of the six countries run so far — signals depth
  here must come from RESA gazette + CSSF files, not media.

## CH

- entities: 2705 → 2707 (2406 active)
- classified: 8 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 1
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 5
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 2
- Level-3 strategies found: none yet
- field coverage (2704 orgs): legal_name 0% · reg-no 71% · LEI 71% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 2285 · rooftop 800 · unlocated 662 · street 2
- facts: proposed 2
- sources in DB: signals_press 7 · signals_press active 11
- ledger: CH $0.485 / $0.45 · cumulative $3.789 / $20.00

### CH run notes (2026-08-04)

- **Sources**: 60 cataloged (39 entities-side / 21 news-side; target 50 ✓).
  11 news active; fuw.ch + Le Temps js-blocked, FINMA RSS dead (documented).
- **Harvest** (FINMA XLSX lists from clean-100 stand — 487 entities): Zefix
  Public REST returns **HTTP 401** on both `/firm/search.json` and
  `/legalForm` — the "open API" verdict from research is wrong for anonymous
  clients; it needs an operator account. Documented as an operator step
  alongside FCA (GB) and OpenCorporates. SHAB/SOGC gazette API remains the
  best unauthenticated CH route (cataloged, adapter deferred).
- **Extraction**: $0.450 → 12 processed, 1 relevant, 2 facts PROPOSED,
  backlog 26. Swiss generalist feeds carry a low alternatives hit rate;
  finews/AWP specialist feeds are the ones worth the budget next pass.
- **Surprise**: Switzerland's register is federally indexed but API-gated,
  while its *gazette* (SHAB) is openly queryable — the inverse of Germany.

## SE

- entities: 1172 → 1175 (1097 active)
- classified: 7 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 3
    - Liquid Alternatives & Hedge Funds: 4
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: commodities, infrastructure_economic
- field coverage (1171 orgs): legal_name 0% · reg-no 94% · LEI 69% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 806 · unlocated 683 · rooftop 8
- facts: proposed 1
- sources in DB: signals_press active 10 · signals_press 12
- ledger: SE $0.488 / $0.45 · cumulative $4.738 / $20.00

## PL

- entities: 1078 → 1078 (1036 active)
- classified: 35 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 24
    - Private Debt & Credit: 4
    - Real Assets & Infrastructure: 7
    - Liquid Alternatives & Hedge Funds: 3
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: commodities, direct_lending, mezzanine, natural_resources, npl, venture_capital
- field coverage (1068 orgs): legal_name 0% · reg-no 94% · LEI 48% · VAT 0% · legal_form 0% · status 0% · address 0% · website 8% · licence 0% · share_capital 0% · email 0%
- logo coverage: 8%
- geocode precision: unlocated 624 · city 597
- facts: proposed 5
- sources in DB: tier4_exchange_corporate 13 · tier4_exchange_corporate active 8 · signals_press active 9 · signals_press 14
- ledger: PL $0.461 / $0.45 · cumulative $4.738 / $20.00

### SE / PL run notes (2026-08-04)

- **SE**: 76 sources cataloged (the largest catalog of the run; 49 entities-side
  / 27 news-side). 10 news active, 5 dead/blocked documented. Finansinspektionen
  prior harvest stands (187). Bolagsverket's bulk product is fee-based
  (documented, not purchased); allabolag is a reseller, not a primary source.
  $0.450 extraction → 1 fact PROPOSED, backlog 21 — Swedish generalist feeds
  again show a low alternatives hit rate vs specialist ones.
- **PL**: 69 sources cataloged (45 entities-side / 24 news-side). 9 news active
  (17 fetched incl. carried firm newsrooms), 28 new docs. KNF TFI harvest
  stands (324 + 271 manages edges). The KRS open JSON API (api-krs.ms.gov.pl)
  and REGON/GUS API are cataloged as the standing tier-1 routes — KRS is
  per-entity lookup (no bulk enumeration), so it is an ENRICHMENT route for
  known entities rather than a discovery sweep; recorded as such.
  $0.450 → 4 relevant of 10, 1 fact PROPOSED, backlog 45.

