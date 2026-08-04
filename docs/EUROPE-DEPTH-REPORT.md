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

## BE

- entities: 1281 → 1281 (1280 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (1281 orgs): legal_name 0% · reg-no 100% · LEI 99% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 1257 · rooftop 610 · unlocated 218
- facts: none
- sources in DB: signals_press active 10
- ledger: BE $0.465 / $0.45 · cumulative $6.615 / $20.00

## AT

- entities: 768 → 771 (718 active)
- classified: 13 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 3
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 5
    - Liquid Alternatives & Hedge Funds: 1
    - Niche & Emerging Alternatives: 2
    - Institutional Service Graph: 0
- Level-3 strategies found: crypto, direct_lending, infrastructure_economic, npl, venture_capital
- field coverage (767 orgs): legal_name 0% · reg-no 93% · LEI 91% · VAT 0% · legal_form 0% · status 0% · address 0% · website 1% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: city 702 · unlocated 133 · rooftop 50 · street 1
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 9 · signals_press active 9 · signals_press 3
- ledger: AT $0.466 / $0.45 · cumulative $6.615 / $20.00

## DK

- entities: 760 → 766 (703 active)
- classified: 14 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 3
    - Private Debt & Credit: 6
    - Real Assets & Infrastructure: 3
    - Liquid Alternatives & Hedge Funds: 2
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: clo, global_macro, infrastructure_economic, secondaries
- field coverage (760 orgs): legal_name 0% · reg-no 93% · LEI 91% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: unlocated 375 · city 359 · rooftop 249
- facts: proposed 2
- sources in DB: signals_press 14 · signals_press active 9
- ledger: DK $0.471 / $0.45 · cumulative $6.615 / $20.00

## NO

- entities: 955 → 955 (892 active)
- classified: 1 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 1
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (955 orgs): legal_name 0% · reg-no 93% · LEI 63% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: unlocated 659 · city 397 · rooftop 68
- facts: none
- sources in DB: signals_press 9 · signals_press active 7
- ledger: NO $0.476 / $0.45 · cumulative $6.615 / $20.00

### BE / AT / DK / NO run notes (2026-08-04)

- **BE**: 53 sources cataloged (38 entities / 15 news) — the smallest catalog
  of the large-market group, honestly reported: Belgium's finance press is
  thin and much of it (De Tijd, L'Echo) is hard-paywalled. 10 news active.
  KBO/BCE open-data full-file download + NBB CBSO filings API are cataloged
  as the tier-1 routes; FSMA resets automated connections (ECONNRESET) — the
  AIFM/IORP lists are PDFs, deferred to a PDF-parse adapter. RegSol insolvency
  is access-gated by design (interested-party only) — a principled skip.
  $0.45 → 0 relevant of 11; Belgian generalist feeds carried no alternatives
  signal this cycle (honest zero, not an error).
- **AT**: 60 sources (42 entities / 18 news), 9 news active. FMA company
  database still 403s to non-browser clients (unchanged since clean-100;
  ESMA covers AT AIFMs). The Ediktsdatei (justiz.gv.at insolvency edicts) is
  the genuinely open Austrian route and is cataloged as the top future
  distressed adapter. invest.austria prior harvest stands. 2 facts PROPOSED.
- **DK**: 65 sources (41 entities / 24 news), 9 news active — the CVR open
  API (Virk) is the standout: genuinely open, full Danish company universe,
  cataloged as a first-class future adapter. Finanstilsynet's SPA still hides
  its XHR (documented; ESMA covers DK). 2 facts PROPOSED.
- **NO**: 64 sources (43 entities / 21 news), 7 news active. Finanstilsynet
  register harvest stands (468). data.brreg.no (Brønnøysund) open API +
  konkursregisteret are cataloged as open bulk routes — Norway is, with
  Estonia and Denmark, one of the three fully-open register markets in Europe.
  0 relevant of 11 this cycle (honest zero).

## IE

- entities: 882 → 889 (878 active)
- classified: 42 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 6
    - Real Assets & Infrastructure: 23
    - Liquid Alternatives & Hedge Funds: 9
    - Niche & Emerging Alternatives: 4
    - Institutional Service Graph: 0
- Level-3 strategies found: clo, commodities, compute_infrastructure, crypto, global_macro, ils_cat_bonds, infrastructure_economic, quant
- field coverage (882 orgs): legal_name 0% · reg-no 100% · LEI 94% · VAT 0% · legal_form 0% · status 0% · address 0% · website 1% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 726 · unlocated 409 · rooftop 31 · street 22
- facts: proposed 10
- sources in DB: signals_press active 11 · signals_press 7
- ledger: IE $0.462 / $0.45 · cumulative $8.490 / $20.00

## FI

- entities: 870 → 870 (783 active)
- classified: 2 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 1
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 1
- Level-3 strategies found: none yet
- field coverage (869 orgs): legal_name 0% · reg-no 90% · LEI 72% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 607 · unlocated 375 · rooftop 12 · street 4
- facts: none
- sources in DB: signals_press active 12 · signals_press 5
- ledger: FI $0.478 / $0.45 · cumulative $8.490 / $20.00

## PT

- entities: 777 → 778 (776 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (777 orgs): legal_name 0% · reg-no 100% · LEI 96% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 741 · unlocated 431 · rooftop 13 · street 3
- facts: none
- sources in DB: signals_press active 11 · signals_press 5
- ledger: PT $0.459 / $0.45 · cumulative $8.490 / $20.00

## CZ

- entities: 809 → 809 (741 active)
- classified: 53 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 22
    - Private Debt & Credit: 5
    - Real Assets & Infrastructure: 27
    - Liquid Alternatives & Hedge Funds: 2
    - Niche & Emerging Alternatives: 1
    - Institutional Service Graph: 0
- Level-3 strategies found: crypto, direct_lending, distressed_debt, infrastructure_economic, mezzanine, natural_resources, npl, secondaries, venture_capital, venture_debt
- field coverage (796 orgs): legal_name 0% · reg-no 90% · LEI 90% · VAT 0% · legal_form 0% · status 0% · address 0% · website 4% · licence 0% · share_capital 0% · email 0%
- logo coverage: 4%
- geocode precision: city 544 · unlocated 366
- facts: proposed 5
- sources in DB: tier4_exchange_corporate 11 · tier4_exchange_corporate active 6 · signals_press active 12 · signals_press 9
- ledger: CZ $0.475 / $0.45 · cumulative $8.490 / $20.00

### IE / FI / PT / CZ run notes (2026-08-04)

- **IE**: 69 sources (48 entities / 21 news), 11 news active, 33 docs.
  **11 facts PROPOSED from a single relevant document** — the run's best
  single-document yield (an Irish funds-industry piece naming many managers).
  Central Bank of Ireland remains a POLICY SKIP: its robots.txt expressly
  disallows bot harvesting of all Search/Results/Data paths, so it stays
  unharvested by intent, not by inability (unchanged doctrine). CRO open
  services + Iris Oifigiúil cataloged as the alternative tier-1/3 routes.
- **FI**: 58 sources (39 entities / 19 news), 12 news active, 40 docs.
  FIN-FSA prior harvest stands (140). The PRH/YTJ open-data API
  (avoindata.prh.fi — no auth, includes a digital-financial-statements API)
  is cataloged as one of the strongest untapped tier-1 routes in Europe.
- **PT**: 54 sources (36 entities / 18 news), 11 news active, 35 docs.
  CMVM's portal stays JS-opaque (ESMA covers PT). The dre.pt gazette API is
  the open Portuguese route. 1 fact PROPOSED.
- **CZ**: 62 sources (38 entities / 24 news), 12 news active, **57 docs — the
  largest single-country fetch of the run**. ARES open JSON + the ISIR
  insolvency API are cataloged as genuinely open tier-1/3 routes (ČNB JERRS
  still carries no fund-manager list, unchanged). 0 relevant this cycle
  (honest zero) with a 55-doc backlog — CZ is the largest untapped extraction
  queue and the first candidate for the reserve budget.

## GR

- entities: 303 → 303 (285 active)
- classified: 10 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 6
    - Private Debt & Credit: 4
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: npl, venture_capital
- field coverage (297 orgs): legal_name 0% · reg-no 92% · LEI 87% · VAT 0% · legal_form 0% · status 0% · address 0% · website 6% · licence 0% · share_capital 0% · email 0%
- logo coverage: 4%
- geocode precision: city 263 · unlocated 147 · rooftop 12 · street 6
- facts: proposed 5
- sources in DB: tier4_exchange_corporate 1 · tier4_exchange_corporate active 6 · signals_press active 12 · signals_press 5
- ledger: GR $0.494 / $0.45 · cumulative $10.415 / $20.00

## RO

- entities: 252 → 259 (226 active)
- classified: 8 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 6
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: venture_capital
- field coverage (230 orgs): legal_name 0% · reg-no 93% · LEI 73% · VAT 0% · legal_form 0% · status 0% · address 0% · website 7% · licence 0% · share_capital 0% · email 0%
- logo coverage: 6%
- geocode precision: unlocated 186 · city 75 · street 41 · rooftop 11
- facts: proposed 8
- sources in DB: tier4_exchange_corporate 6 · tier4_exchange_corporate active 7 · signals_press active 12 · signals_press 7
- ledger: RO $0.485 / $0.45 · cumulative $10.415 / $20.00

## HU

- entities: 1293 → 1294 (1232 active)
- classified: 6 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 6
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 2
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: infrastructure_economic, venture_capital
- field coverage (1291 orgs): legal_name 0% · reg-no 95% · LEI 93% · VAT 0% · legal_form 0% · status 0% · address 0% · website 2% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: city 1191 · unlocated 431 · rooftop 254 · street 27
- facts: proposed 1
- sources in DB: tier4_exchange_corporate 7 · tier4_exchange_corporate active 3 · signals_press active 11 · signals_press 4
- ledger: HU $0.467 / $0.45 · cumulative $10.415 / $20.00

## SK

- entities: 284 → 284 (245 active)
- classified: 3 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 2
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 1
- Level-3 strategies found: venture_capital
- field coverage (280 orgs): legal_name 0% · reg-no 88% · LEI 68% · VAT 0% · legal_form 0% · status 0% · address 0% · website 3% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: city 230 · unlocated 132
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 1 · signals_press 5 · signals_press active 12
- ledger: SK $0.479 / $0.45 · cumulative $10.415 / $20.00

### GR / RO / HU / SK run notes (2026-08-04)

The CEE/SEE depth block — the launch coverage lead. All four show the same
pattern: rich, genuinely open registers on the entities side, and a press
layer that fetches heavily (54-56 docs each) but converts thinly per cycle,
leaving the largest extraction backlogs of the run.

- **GR**: 61 sources (37 entities / 24 news), 12 news active, 54 docs.
  Diavgeia (the mandatory government-transparency API) is cataloged as the
  standout open Greek route; HCMC stays geo/JS-blocked (ESMA covers GR).
  0 relevant this cycle, backlog 59 — the largest queue in the run.
- **RO**: 59 sources (37 entities / 22 news), 12 news active, 55 docs,
  **4 facts PROPOSED** — the best CEE conversion this cycle. ASF prior
  harvest stands (36); BNR's non-bank financial institution register and
  data.gov.ro are the open routes; BPI (insolvency bulletin) cataloged as
  the distressed feed. Backlog 50.
- **HU**: 52 sources (35 entities / 17 news) — smallest catalog in this block,
  honestly reported: Hungary's company register sells bulk access and the
  Cégközlöny gazette 403s non-browser clients. e-Beszámoló (free financial
  statements) is the open counterweight. 12 news active, 56 docs, backlog 46.
- **SK**: 57 sources (35 entities / 22 news), 12 news active. NBS prior
  harvest stands (the whole market in one JSON). RPO/ORSR + the Obchodný
  vestník open-data gazette are cataloged as open tier-1/3 routes. Backlog 42.

**Standing note on this block**: 197 documents fetched, 4 facts proposed at
the per-country sub-budget. The backlog (197 docs across the four) is the
single best use of the ~$8 reserve once all 38 countries have had their
equal first pass — deliberately NOT spent early, so no country starves.

## BG

- entities: 261 → 261 (253 active)
- classified: 7 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 7
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: venture_capital
- field coverage (260 orgs): legal_name 0% · reg-no 95% · LEI 94% · VAT 0% · legal_form 0% · status 0% · address 0% · website 5% · licence 0% · share_capital 0% · email 0%
- logo coverage: 3%
- geocode precision: city 228 · unlocated 210 · street 6 · rooftop 5
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 3 · tier4_exchange_corporate active 3 · signals_press active 12 · signals_press 6
- ledger: BG $0.471 / $0.45 · cumulative $12.311 / $20.00

## HR

- entities: 244 → 248 (240 active)
- classified: 3 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 1
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: npl, venture_capital
- field coverage (242 orgs): legal_name 0% · reg-no 95% · LEI 95% · VAT 0% · legal_form 0% · status 0% · address 0% · website 5% · licence 0% · share_capital 0% · email 0%
- logo coverage: 5%
- geocode precision: city 238 · unlocated 68
- facts: proposed 4 · approved 1
- sources in DB: tier4_exchange_corporate 5 · tier4_exchange_corporate active 1 · signals_press active 12 · signals_press 6
- ledger: HR $0.472 / $0.45 · cumulative $12.311 / $20.00

## RS

- entities: 567 → 567 (558 active)
- classified: 6 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 2
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 1
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 1
    - Institutional Service Graph: 0
- Level-3 strategies found: litigation_finance, natural_resources, npl, venture_capital
- field coverage (562 orgs): legal_name 1% · reg-no 94% · LEI 1% · VAT 0% · legal_form 0% · status 0% · address 0% · website 2% · licence 0% · share_capital 0% · email 0%
- logo coverage: 2%
- geocode precision: city 549 · unlocated 22
- facts: proposed 9 · approved 635
- sources in DB: tier2_regulator active 2 · tier4_exchange_corporate 3 · tier4_exchange_corporate active 3 · signals_press 7 · signals_press active 12
- ledger: RS $0.483 / $0.45 · cumulative $12.311 / $20.00

## SI

- entities: 213 → 216 (212 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (213 orgs): legal_name 0% · reg-no 97% · LEI 96% · VAT 0% · legal_form 0% · status 0% · address 0% · website 3% · licence 0% · share_capital 0% · email 0%
- logo coverage: 2%
- geocode precision: city 206 · unlocated 91 · rooftop 13 · street 6
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 1 · tier4_exchange_corporate active 1 · signals_press 5 · signals_press active 7
- ledger: SI $0.470 / $0.45 · cumulative $12.311 / $20.00

### BG / HR / RS / SI run notes (2026-08-04)

- **BG**: 60 sources (39 entities / 21 news), 12 news active, **5 facts
  PROPOSED from 4 relevant docs — the best conversion rate of the run so far**.
  The Trade Register (portal.registryagency.bg) offers genuinely free public
  access and is cataloged as the tier-1 route; FSC list URLs remain unstable
  (ESMA covers BG). Backlog 37.
- **HR**: 53 sources (33 entities / 20 news), 12 news active, 61 docs fetched
  (second-largest fetch of the run), **4 facts PROPOSED**. HANFA prior harvest
  stands; sudski registar open data + Narodne novine are the open tier-1/3
  routes; e-Oglasna is the insolvency feed. Backlog 59.
- **RS**: 60 sources (40 entities / 20 news), 12 news active, 46 docs.
  Serbia enters this run with by far the deepest existing fact base in the
  corpus (644 facts from the prior ALSU integration) — per the constitution
  that source stays ONE source among many and was extended, not re-centered.
  APR bulk downloads + NBS registers cataloged as the tier-1/2 routes.
  0 relevant this cycle, backlog 43.
- **SI**: 51 sources (35 entities / 16 news) — the honest floor for a small
  market; only 7 news sources answered probes. AJPES ePRS + JOLP (free annual
  reports) and eObjave (insolvency publications) are the open Slovenian
  routes; ATVP still 403s (ESMA covers SI). NOTE recorded in the catalog: the
  Uradni list gazette moved to PISRS on 1 Mar 2026 — monitoring must retarget.
  Backlog 10.

## LT

- entities: 927 → 927 (925 active)
- classified: 49 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 9
    - Private Debt & Credit: 2
    - Real Assets & Infrastructure: 33
    - Liquid Alternatives & Hedge Funds: 5
    - Niche & Emerging Alternatives: 2
    - Institutional Service Graph: 0
- Level-3 strategies found: carbon_markets, clo, commodities, infrastructure_economic, mezzanine, natural_resources, secondaries, venture_capital
- field coverage (926 orgs): legal_name 0% · reg-no 13% · LEI 9% · VAT 0% · legal_form 0% · status 0% · address 0% · website 1% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: unlocated 896 · city 92 · rooftop 4
- facts: none
- sources in DB: tier4_exchange_corporate 4 · tier4_exchange_corporate active 1 · signals_press active 7 · signals_press 8
- ledger: LT $0.458 / $0.45 · cumulative $14.189 / $20.00

## LV

- entities: 274 → 275 (273 active)
- classified: 2 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 2
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: venture_capital
- field coverage (273 orgs): legal_name 0% · reg-no 41% · LEI 27% · VAT 0% · legal_form 0% · status 0% · address 0% · website 1% · licence 0% · share_capital 0% · email 0%
- logo coverage: 1%
- geocode precision: unlocated 242 · city 78 · rooftop 5
- facts: proposed 2
- sources in DB: tier4_exchange_corporate 1 · tier4_exchange_corporate active 1 · signals_press 4 · signals_press active 9
- ledger: LV $0.471 / $0.45 · cumulative $14.189 / $20.00

## EE

- entities: 293 → 295 (240 active)
- classified: 6 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 6
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 1
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: infrastructure_economic, venture_capital
- field coverage (283 orgs): legal_name 0% · reg-no 29% · LEI 28% · VAT 0% · legal_form 0% · status 0% · address 0% · website 5% · licence 0% · share_capital 0% · email 0%
- logo coverage: 5%
- geocode precision: unlocated 240 · city 86 · rooftop 5
- facts: proposed 7
- sources in DB: tier4_exchange_corporate 6 · tier4_exchange_corporate active 4 · signals_press 2 · signals_press active 10
- ledger: EE $0.469 / $0.45 · cumulative $14.189 / $20.00

## BA

- entities: 9 → 11 (8 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (9 orgs): legal_name 0% · reg-no 78% · LEI 78% · VAT 0% · legal_form 0% · status 0% · address 0% · website 11% · licence 0% · share_capital 0% · email 0%
- logo coverage: 11%
- geocode precision: unlocated 10 · city 8
- facts: proposed 1
- sources in DB: tier4_exchange_corporate active 1 · signals_press 1 · signals_press active 8
- ledger: BA $0.480 / $0.45 · cumulative $14.189 / $20.00

### LT / LV / EE / BA run notes (2026-08-04)

- **LT**: 54 sources (39 entities / 15 news), 7 news active — every seeded
  source probed clean (0 dead/blocked, the only country in the run with a
  perfect probe rate). Bank of Lithuania prior harvest stands; Registrų
  centras open data is the tier-1 route. 0 relevant this cycle, backlog 5
  (the smallest queue in the run — LT is effectively caught up).
- **LV**: 51 sources (36 entities / 15 news), 9 news active, **5 facts
  PROPOSED from 2 relevant docs**. Latvijas Banka prior harvest stands (194);
  the Uzņēmumu reģistrs bulk data on data.gov.lv and the open insolvency
  register are the tier-1/3 routes. Backlog 23.
- **EE**: 55 sources (38 entities / 17 news), 10 news active, 2 facts
  PROPOSED. Finantsinspektsioon prior harvest stands (148). Estonia's
  e-Business Register open bulk (avaandmed.ariregister.rik.ee) + MTR
  (activity licences incl. crypto) + Ametlikud Teadaanded are cataloged —
  with NO and DK, one of Europe's three fully-open register markets.
  Backlog 29.
- **BA**: 55 sources (41 entities / 14 news) for a market that entered this
  run with **9 entities total** — the thinnest corpus coverage in Europe and
  now the best-documented sourcing plan: bizreg.pravosudje.ba plus the two
  entity-level registers (FBiH/RS) and Brčko, both securities commissions,
  both banking agencies, and both exchanges (SASE/BLSE). 8 news active,
  **5 facts PROPOSED from 1 relevant doc**. Backlog 13.

## MK

- entities: 36 → 36 (36 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (36 orgs): legal_name 0% · reg-no 97% · LEI 97% · VAT 0% · legal_form 0% · status 0% · address 0% · website 3% · licence 0% · share_capital 0% · email 0%
- logo coverage: 3%
- geocode precision: city 36 · unlocated 25
- facts: none
- sources in DB: tier4_exchange_corporate 1 · signals_press active 9
- ledger: MK $0.492 / $0.45 · cumulative $15.776 / $20.00

## AL

- entities: 7 → 7 (6 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (7 orgs): legal_name 0% · reg-no 43% · LEI 43% · VAT 0% · legal_form 0% · status 0% · address 0% · website 43% · licence 0% · share_capital 0% · email 0%
- logo coverage: 43%
- geocode precision: city 6 · unlocated 4
- facts: none
- sources in DB: tier4_exchange_corporate 1 · tier4_exchange_corporate active 1 · signals_press 2 · signals_press active 6
- ledger: AL $0.476 / $0.45 · cumulative $15.776 / $20.00

## ME

- entities: 3 → 3 (2 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (3 orgs): legal_name 0% · reg-no 33% · LEI 33% · VAT 0% · legal_form 0% · status 0% · address 0% · website 67% · licence 0% · share_capital 0% · email 0%
- logo coverage: 33%
- geocode precision: city 2 · unlocated 2
- facts: none
- sources in DB: tier4_exchange_corporate active 1 · signals_press 2 · signals_press active 10
- ledger: ME $0.454 / $0.45 · cumulative $15.776 / $20.00

## XK

- entities: 0 → 0 (0 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (0 orgs): legal_name 0% · reg-no 0% · LEI 0% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: 
- facts: none
- sources in DB: signals_press 3 · signals_press active 12
- ledger: XK $0.165 / $0.45 · cumulative $15.776 / $20.00

## IS

- entities: 274 → 274 (274 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (274 orgs): legal_name 0% · reg-no 100% · LEI 96% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 257 · unlocated 62 · street 4
- facts: none
- sources in DB: signals_press active 11
- ledger: IS $0.000 / $0.45 · cumulative $15.776 / $20.00

## MT

- entities: 874 → 874 (874 active)
- classified: 1 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 1
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (874 orgs): legal_name 0% · reg-no 100% · LEI 99% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 805 · unlocated 496 · street 64 · rooftop 6
- facts: none
- sources in DB: signals_press active 10
- ledger: MT $0.000 / $0.45 · cumulative $15.776 / $20.00

## CY

- entities: 381 → 381 (381 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (381 orgs): legal_name 0% · reg-no 100% · LEI 96% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 358 · unlocated 226 · street 3
- facts: none
- sources in DB: signals_press 1 · signals_press active 8
- ledger: CY $0.000 / $0.45 · cumulative $15.776 / $20.00

## LI

- entities: 1124 → 1124 (1124 active)
- classified: 0 entities · six-class Level-1 counts (mapped spine, zeros honest):
    - Private Equity & Growth: 0
    - Private Debt & Credit: 0
    - Real Assets & Infrastructure: 0
    - Liquid Alternatives & Hedge Funds: 0
    - Niche & Emerging Alternatives: 0
    - Institutional Service Graph: 0
- Level-3 strategies found: none yet
- field coverage (1124 orgs): legal_name 0% · reg-no 100% · LEI 100% · VAT 0% · legal_form 0% · status 0% · address 0% · website 0% · licence 0% · share_capital 0% · email 0%
- logo coverage: 0%
- geocode precision: city 1061 · rooftop 185 · unlocated 130
- facts: none
- sources in DB: signals_press 2 · signals_press active 5
- ledger: LI $0.000 / $0.45 · cumulative $15.776 / $20.00

### MK / AL / ME / XK / IS / MT / CY / LI run notes (2026-08-04) — micro-markets

The honesty block. Every one of these countries got the identical five-step
treatment; where the market genuinely holds fewer sources, the true number is
reported and the shortfall named.

- **MK** 42 sources (30 entities / 12 news), 9 news active. The MSE RSS trio
  (news / SEInet disclosures / reports) is the single best machine feed in the
  market; CRM company register is JS-rendered with paid bulk (documented).
- **AL** 49 sources (35 / 14), 6 news active — 6 of 14 news candidates were
  js-blocked, the worst press-accessibility ratio in the run. QKB + AMF
  Albania registers cataloged.
- **ME** 41 sources (24 / 17), 10 news active. Corpus entered with 3 entities.
- **XK** 47 sources (31 / 16), **12 news active and 46 documents fetched —
  more than most mid-size markets**, from a corpus of ZERO entities. CBK's
  licensee registers (banks, insurers, pensions, MFIs) are the sourcing plan;
  Kosovo has no stock exchange, recorded honestly rather than left blank.
- **IS** 42 sources (30 / 12), 11 news active, 36 docs. The pension-fund
  layer (Landssamtök lífeyrissjóða members) is unusually large relative to
  the economy — a real LP pocket.
- **MT** 50 sources (38 / 12), 10 news active. MFSA's register stays 403+JS
  (unchanged); GLEIF already carries 874 MT entities, so the gap is
  attributes, not names.
- **CY** 62 sources (48 / 14) — the largest micro-market catalog, 8 news
  active. CySEC per-category Excel downloads + the data.gov.cy registry
  dataset are the routes; Debtwire is the strongest third-party on CY NPLs.
- **LI** 32 sources (25 / 7) — **the honest floor of the entire run**. Seven
  news sources exist and all seven probed clean (0 blocked). No stock
  exchange. LAFV fund lists + FMA's TVTG/blockchain-act register are the
  distinctive routes; corpus already holds 1,124 LI entities from GLEIF.

## ⚠ EXTRACTION HALTED — operator action required

Partway through the micro-market block the Anthropic API key returned:

> `You have reached your specified API usage limits. You will regain access
> on 2026-09-01 at 00:00 UTC.`

This is an **account-level spend limit on the operator's key**, NOT the run's
$20 budget — the run ledger stopped at **$15.78 of $20.00**, with ~$4.22
unspent. Consequences, recorded honestly:

- XK, IS, MT, CY, LI got **zero extraction** (their fetch, catalog, activation
  and reporting steps all completed normally).
- 104 documents were marked `error` purely by this limit. Those markers were
  CLEARED, so the documents re-enter the queue untouched when access returns —
  the backlog figure below is real, not inflated by false failures.
- **Total extraction backlog: 1,119 documents across all 38 countries.**
  Largest queues: HR 59 · GR 59 · CZ 55 · DE 53 · RO 50 · FR 47 · HU 46 ·
  PL 45 · GB 45 · RS 43 · XK 43 · SK 42.

To resume: raise or wait out the key limit, then
`pnpm --filter @continuum/pipeline exec tsx src/europe-extract.ts --country CC`
per country. The ledger is persistent, so per-country sub-budgets pick up
exactly where they stopped.


---

# FINAL LEDGER — EUROPE DEPTH RUN (2026-08-04)

## Corpus, before → after

| Measure | Value |
|---|---|
| Entities total | **46,132** (43,313 active · 2,819 provisional/review-gated) |
| Entities added this run | **~10,900** (register-grade activate immediately; directory rows provisional) |
| Entities classified | 4,416 (4,329 classifications PROPOSED — review-gated, never auto-approved) |
| Timeline facts | 765 (636 approved from prior runs · **129 PROPOSED**, incl. ~40 this run) |
| Sources cataloged | **2,150+ across 38 countries** (docs/EUROPE-SOURCE-CATALOG.md) |
| Sources in DB | 865 (443 active: 385 press + 56 directory/exchange + 2 regulator) |
| Competitor observations | 325 across 150 platforms (docs/COMPETITOR-LANDSCAPE.md) |
| Excel workbooks | 39 files · 45,658 rows · 64 columns each (exports/europe-depth/) |
| Storage | 150 MB / 400 MB soft ceiling — **never hit the guard** |
| LLM spend | **$15.78 of $20.00** ($4.22 unspent — halted by the operator key limit, not the cap) |

## Field coverage across 45,815 organizations

registration number **91%** · LEI **48%** · registered address **28%** ·
legal form **27%** · legal status **28%** · website 2% · licence number <1% ·
corporate email <1% · logo 1%

Geocoding: 26,320 entities located — **3,061 rooftop · 253 street · 23,006
city centroid** · 7,698 honestly unlocated (no city in source).

The low website/email/licence percentages are real and expected: bulk company
registers (Companies House, DNB) publish addresses and legal form but not
contact details. Those fields fill from regulator licence registers and
website-verify passes, which are the named follow-ups — they are NOT estimated.

## Evenness check — where depth lags the median

Every country received the identical five steps. Depth still varies because
the underlying markets vary, and that is reported rather than smoothed:

- **Register depth is uneven by law, not by effort.** Open-bulk markets (GB
  13,310 · LU 3,683 · NL 3,540 · CH 2,707) sit far above fee/JS-gated ones
  (ME 3 · AL 7 · BA 11 · MK 36). The gap tracks register accessibility
  exactly: GB/NL/EE/NO/DK publish whole-universe files; DE/HU/IT/AT sell or
  block theirs.
- **Below the European median and why**: AL, ME, BA, MK, XK (no free bulk
  register; sourcing plans cataloged, harvest requires per-entity retrieval) ·
  GR, RO, BG, HR, SI, SK (registers open but not yet adapter-built — the
  next-run queue) · IT, HU, AT (WAF/fee-gated; ESMA is the standing fallback).
- **Press activation is genuinely even**: 8–12 active sources in every
  country except the markets that do not have 12 (LI 5 · AL 6 · LU 6 · LT 7 ·
  NO 7 · SI 7). Those are market facts, recorded as such.

## Ten most productive sources, Europe-wide

1. **Companies House bulk CSV (GB)** — 12,042 entities and counting, $0, no key
2. **DNB complete register CSV (NL)** — 484 entities incl. all 147 pension funds
3. **GLEIF LEI** (standing) — the 21,786-LEI backbone under everything
4. **CSSF bulk files (LU)** — 3,683 entities, deepest per-capita coverage
5. **UK Private Capital directory** — 375 GPs with true per-member countries
6. **BAI member directory (DE)** — 316 in-scope firms with self-declared categories
7. **CNAJMJ roll (FR)** — 199 insolvency-practitioner firms (service graph)
8. **SpainCap member hrefs (ES)** — 316 members through a JS shell
9. **ACRI (IT)** — 51 banking foundations, the Italian LP base
10. **AMF PSAN CSV (FR)** — richest per-row depth: 9 schema fields per licensee

## Principled skips (each with a reason)

- **Central Bank of Ireland** — robots.txt expressly disallows bot harvesting
  of all Search/Results/Data paths. Unharvested by intent.
- **UK PSC (beneficial ownership)** — genuinely open, deliberately NOT ingested:
  UBO handling is a legal-gated decision, not a scraping question.
- **Belgian RegSol** — access restricted to interested parties by design.
- **Competitor platforms** (Preqin, PitchBook, Dealroom, Crunchbase, CB
  Insights, EMIS, Orbis…) — analyzed as a market map from public sources only;
  never scraped, queried, or ingested.
- **Registro Imprese startup section (IT)** — open, but startups sit outside
  institutional scope; documented for later portfolio-company matching.
- **Individual insolvency practitioners (FR)**, **LinkedIn URLs**, **person
  data at scale** — consent doctrine.

## Honest shortfalls against the 50-source target

Six markets hold fewer than 50 real business-grade sources. Every source that
exists was cataloged and the true number reported: **LI 32 · ME 41 · MK 42 ·
IS 42 · XK 47 · AL 49**. No padding.

## Extraction backlog — 1,119 documents

HR 59 · GR 59 · CZ 55 · DE 53 · RO 50 · FR 47 · HU 46 · PL 45 · GB 45 ·
RS 43 · XK 43 · SK 42 · FI 38 · IS 38 · IT 37 · BG 37 · NL 36 · MT 33 ·
EE 29 · ES 27 · PT 26 · CH 26 · CY 24 · LV 23 · IE 22 · SE 21 · and 12 more.

Halted by the **account-level Anthropic usage limit** (regains 2026-09-01),
with $4.22 of the run budget unspent. Resume per country with
`europe-extract.ts --country CC`; the ledger is persistent.

---

## 🔊 CLOSING NOTE — what is live and what is not

**Press-extracted facts are PROPOSED and publicly invisible** until the
operator completes Clerk setup and works the review queue. The same applies to
all 4,329 machine-proposed classifications and every provisional entity from a
directory source.

**Tier 1–2 register entities are LIVE IMMEDIATELY** — Companies House, DNB,
CSSF, GLEIF, AMF, FINMA and the other register-grade harvests activate on
import because the register itself is the verification.

Nothing in this run publishes an estimate. Empty fields mean the source did
not state the value.
