# European regulator register catalog — accessibility matrix

Probed 2026-07-20 (reset build Part 2), read-only, ≤4 requests per regulator,
plain Node `fetch` as the yardstick (no headless browser). This catalog is the
asset: harvesters exist today for the tier-1 routes; everything else is
documented here for future runs.

Access classes: `downloadable-file` > `json-api` > `parseable-HTML` >
`search-form-only` > `registration-required` > `JS/WAF-blocked`.

## Harvested (built harvesters)

| Register | Country | Route | Access | Harvester |
|---|---|---|---|---|
| GLEIF LEI | all | `api.gleif.org/api/v1/lei-records` (JSON:API, no auth, country+category filters) + RR golden-copy zip (~23 MB, all fund→manager relationships) | json-api + downloadable-file | `pnpm gleif:harvest -- --countries … --cap N` |
| CSSF | LU | `cssf.lu/wp-content/uploads/IDENTIFIANTS_AIFM.zip` — daily bulk, UTF-16LE tab-delimited: AIFMs + AIFs + management links. Also `OPC_COMP_TP_TOUS_OUVERTS.zip` (UCITS share-class level, ~150k rows). Undocumented JSON API behind `edesk.apps.cssf.lu/search-entities-api/` exists but its robots discourage use — the bulk files are the sanctioned route. | downloadable-file | `pnpm registers:harvest -- --register cssf` |
| NBS | SK | `subjekty.nbs.sk/api/json` — whole market in one zip'd JSON (33k+ institutions, addresses, license scopes), nightly refresh | json-api | `pnpm registers:harvest -- --register nbs` |
| AMF | FR | Official SGP (asset manager) list on data.gouv.fr, stable resource `datasets/r/2220f808-8908-4afc-98e3-cf74a25678e2` — CSV with agrément number, LEI, website | downloadable-file | `pnpm registers:harvest -- --register amf` |
| Bank of Lithuania | LT | `lb.lt/en/sfi-financial-market-participants?export=csv&market=N` — CSV export per market | downloadable-file | `pnpm registers:harvest -- --register lb` |
| FINMA | CH | `finma.ch/~/media/finma/dokumente/bewilligungstraeger/xlsx/{flvervt,beh}.xlsx` — inline-string XLSX, header row carries "Name"/"Ort" + role columns | downloadable-file | `pnpm registers:harvest -- --register finma` (clean-100 P2: 487 created) |
| Finanstilsynet | NO | `api.finanstilsynet.no/registry/v1/legal-entities/filter?licenceTypes=FOAVALIN\|FVLTSLSKVP\|FFOR` — open keyless REST, paged; foreign passporting rows (no NO org nr) skipped | json-api | `pnpm registers:harvest -- --register no` (468 created) |
| HANFA | HR | `hanfa.hr/registri/<leaf>/?export=xml` on the fund-manager + investment-firm leaves — includes LEI + OIB | downloadable-file | `pnpm registers:harvest -- --register hanfa` (mostly GLEIF-known already) |
| AFM | NL | `afm.nl/export.aspx?type=<GUID>&format=csv` (root-relative!, investment firms `8f59acf7…`, collective schemes `883bcff1…`) + AIFM spreadsheets `~/profmedia/files/registers/register-aifm{,d-light}.xlsx` (manager×fund rows → manages links; the two files use different header labels) | downloadable-file | `pnpm registers:harvest -- --register afm` (2,116 created + 1,115 manages) |
| KNF | PL | `knf.gov.pl/podmioty/Podmioty_rynku_kapitalowego/Fundusze_Inwestycyjne/TFI_i_FI` — one 4 MB server-rendered page: 64 TFIs (PLTFI ids) + fund tables (PLFIZ/PLFIO ids); subfund rows deliberately skipped | parseable-HTML | `pnpm registers:harvest -- --register knf` (324 created + 271 manages) |
| CNMV | ES | `cnmv.es/Portal/Consultas/ListadoEntidad?id=2\|4&tipoent=0` (SGIIC + SGEIC; no `.aspx`, and the IIS 500s without an Accept-Language header) | parseable-HTML | `pnpm registers:harvest -- --register cnmv` (157 created) |
| Finansinspektionen | SE | `fi.se/en/our-registers/company-register/index?huvudkategori=Fondbolag%2FAIF-förvaltare` — GET, server-rendered, org numbers in-row | parseable-HTML | `pnpm registers:harvest -- --register fise` (187 created) |
| Latvijas Banka | LV | `bank.lv/index.php?option=com_market&view=filter&format=json&segments=<slug>` — Joomla JSON with an HTML fragment payload (UCITS ManCos + AIFM segments) | json-api | `pnpm registers:harvest -- --register lv` (194 created) |
| Finantsinspektsioon | EE | fi.ee Drupal views pages (fund-management-companies, investment-firms); cross-border rows filtered by path | parseable-HTML | `pnpm registers:harvest -- --register fiee` (148 created) |
| ASF | RO | `data.asfromania.ro/registru/lista.php?sect=3501\|3801\|3802\|3101&lng=1` — `lng=1` is mandatory, 4-digit section codes (SAI/AFIA/SSIF) | parseable-HTML | `pnpm registers:harvest -- --register asf` (36 created) |
| FIN-FSA | FI | `finanssivalvonta.fi/api/supervised-entity-api/v1/all-supervised-entities` — one 1.16 MB JSON dump, filtered by groupName (AIFMs, fund mgmt cos, investment firms, EuVECA; deregistered excluded) | json-api | `pnpm registers:harvest -- --register finfsa` (140 created) |
| ESMA central registers | EU-wide | `registers.esma.europa.eu/solr/esma_registers_upreg/select` — solr JSON, parent docs `entity_type:ae`, sub-registers aif (3,781) / uci (1,705) / evc (475) / esf (17); LEI-keyed. THE RESCUE for WAF/JS-blocked NCAs (IT, AT, SI, PT, MT, HU, GR, BG, CY, DK, BE, DE) | json-api | `pnpm registers:harvest -- --register esma` (1,491 created, 1,568 LEI-known) |

## Probed, documented, not yet harvested

| Regulator | Country | Register URL | Access class | Best machine route / blocker |
|---|---|---|---|---|
| FCA | GB | register.fca.org.uk | json-api (registration-required, free) | Documented API (`/services/V0.1/Firm/{FRN}`, search) behind a free signup → `x-auth-email` + `x-auth-key` headers, 100 req/min. Operator step: create the key. |
| CySEC | CY | cysec.gov.cy/en-GB/entities/ | downloadable-file | Per-category Excel download links (CIFs, AIFMs, UCITS…); file IDs change per update, so scrape the link from the category page first. |
| ČNB | CZ | cnb.cz JERRS | downloadable-file (partial) | Open-data CSV `jerrs.cnb.cz/apljerrsdad/JERRS.OPENDATA.STAHUJ?p_seznam=1..7` covers banks/credit lists only; fund managers need JERRS web queries (use `jerrs.cnb.cz` host — `apl.cnb.cz` refuses). Full web service is registration-gated (signed email to jerrsws@cnb.cz). |
| FSC | BG | fsc.bg category list pages | parseable-HTML | Static HTML tables (e.g. 28 management companies); shallow fields, no licence numbers at list level. |
| BaFin | DE | portal.mvp.bafin.de/database/InstInfo | search-form-only | Server emits malformed HTTP headers — Node/undici fetch dies ("Invalid header value char"); needs a curl-class client + Java form POSTs. In-app Excel export exists once inside. Highest-value "fixable" blocker. |
| Finanstilsynet | DK | virksomhedsregister.finanstilsynet.dk | JS-blocked (export exists in-app) | SPA; "export customized list" implies a findable JSON XHR — one browser-inspection away. (`vut.finanstilsynet.dk` refuses connections; use the virksomhedsregister host.) |
| MNB | HU | intezmenykereso.mnb.hu | search-form-only | Server-rendered but session-token-bound; no CSV/XLSX anywhere; fragile to scrape. |
| HCMC | GR | hcmc.gr (Liferay portal) | parseable-HTML (geo-issue) | Legacy host refused TCP from US egress — retry from EU IP; if reachable, plain HTML tables. |
| CMVM | PT | cmvm.pt new portal | JS-blocked | Opaque hashed URLs, renders empty without JS; old ColdFusion register decommissioned. |
| MFSA | MT | fsr.mfsa.mt | JS-blocked | 403 to plain fetch + JS app whose only entry is a name-search box (no enumeration even in a browser). |
| FMA | AT | fma.gv.at company database | WAF-blocked | 403 Forbidden to non-browser clients. |
| CONSOB | IT | consob.it intermediari | WAF-blocked | Radware Bot Manager challenge on every request — hardest block in the set. Plan as manual-download target. |
| ATVP | SI | a-tvp.si/registri | WAF-blocked | 403 to plain fetch on all register URLs. |
| Central Bank of Ireland | IE | registers.centralbank.ie | search-form-only + robots-restricted | Downloads page is PDF-only behind WebForms postbacks; no API ("API Available: No" per gov.ie catalogue). Search results ARE plain-GET HTML, **but robots.txt expressly disallows bots (incl. ClaudeBot/GPTBot) from all Search/Results/Data pages** — the operator's intent is anti-harvesting, so CBI is documented and deliberately NOT harvested. Targeted manual lookups only. |

## Re-probed 2026-07-21 (clean-100 Part 2) — still blocked / not harvested

| Regulator | Country | Fresh verdict |
|---|---|---|
| BaFin | DE | curl now reaches `portal.mvp.bafin.de/database/InstInfo/` (200), but bulk listing still needs Java form POSTs + in-app Excel export; Node fetch still dies on malformed headers. ESMA covers DE AIFMs/ManCos. |
| Finanstilsynet | DK | SPA unchanged; `/api/companies` guess 404s. ESMA covers DK. |
| MNB | HU | jQuery app, POST-only MVC endpoints + reCAPTCHA; `/en/Home/SearchForExcel` export exists but its POST contract needs a browser session. ESMA covers HU. |
| CySEC | CY | Category pages are ASP.NET menus; no bulk export located in probes. ESMA covers CY. |
| FSC | BG | English list URLs 404/moved (WordPress page_id routing); unstable. ESMA covers BG. |
| MFSA | MT | Still 403 + JS app. ESMA covers MT. |
| FMA | AT | Still 403 to non-browser clients. ESMA covers AT. |
| CONSOB | IT | Radware challenge unchanged. ESMA covers IT. |
| ATVP | SI | Still 403. ESMA covers SI. |
| CMVM | PT | Portal URLs opaque/JS; old routes 404. ESMA covers PT. |
| HCMC | GR | hcmc.gr routes 404/refused from this egress. ESMA covers GR. |
| FCA | GB | Free-registration API — no key configured (operator step); skipped this run. |
| CBI | IE | robots.txt expressly disallows bot harvesting — deliberately NOT harvested (unchanged policy). |
| ČNB | CZ | JERRS OPENDATA lists 1–7 probed row-by-row: banks/intermediaries/consumer-credit only — NO fund-manager list on the open-data route; fund managers would need the registration-gated web service. GLEIF covers CZ funds. |

## Fallback

ESMA's central register core `esma_registers_upreg` is now a first-class
harvester (see above) — it is the standing rescue path for every blocked NCA,
at the cost of address/city granularity.

---

# CLEAN-100 SOURCE LEDGER — 2026-07-21

The standing map of the mega-ingest: every source attempted this run, its
category, verdict, and yield. Honest count, not padded. "created" = new
entities; register rows activate, disclosure/directory rows land provisional.

## Registers (17 harvested · 15 blocked/skipped)

| # | Source | Verdict | Yield this run |
|---|---|---|---|
| 1 | GLEIF LEI (27 new domiciles + RR pass) | harvested | ~9,600 created (funds fully swept: MT 924 · CY 371 · LI 1,372 · CH 2,669 · BE 1,716 · PT 1,038 · HU 1,528 · FI 667 · GR 356 · NO 494 · UA/SK/BG/HR/RS/LT/SI/LV/EE/IS/BA/AL/MD/MK/XK/ME) + 474 RR managers + 5,175 proposed manages edges |
| 2 | CSSF (LU, retry) | harvested | 17 created, 2,166 already known, 9 new edges |
| 3 | NBS (SK) | prior harvest stands | — |
| 4 | AMF (FR) | prior harvest stands | — |
| 5 | Bank of Lithuania | prior harvest stands | — |
| 6 | FINMA (CH) | harvested (new adapter) | 487 created |
| 7 | Finanstilsynet (NO) | harvested (new adapter, open API) | 468 created |
| 8 | HANFA (HR) | harvested (new adapter, ?export=xml) | 4 created (rest GLEIF-known) |
| 9 | AFM (NL) | harvested (new adapter, CSV + 2 AIFM XLSX) | 2,116 created + 1,115 manages edges |
| 10 | KNF (PL) | harvested (new adapter, TFI page) | 324 created + 271 manages edges |
| 11 | CNMV (ES) | harvested (new adapter; Accept-Language quirk) | 157 created |
| 12 | Finansinspektionen (SE) | harvested (new adapter) | 187 created |
| 13 | Latvijas Banka | harvested (new adapter, com_market JSON) | 194 created |
| 14 | Finantsinspektsioon (EE) | harvested (new adapter) | 148 created |
| 15 | ASF (RO) | harvested (new adapter, lng=1) | 36 created |
| 16 | FIN-FSA (FI) | harvested (new adapter, full JSON dump) | 140 created |
| 17 | ESMA central registers | harvested (new adapter — the rescue) | 1,491 created, 1,568 LEI-known |
| — | BaFin (DE) | blocked: form POSTs + malformed headers | ESMA covers |
| — | Finanstilsynet (DK) | blocked: SPA | ESMA covers |
| — | MNB (HU) | blocked: POST + reCAPTCHA | ESMA covers |
| — | CySEC (CY) | blocked: no bulk export found | ESMA covers |
| — | FSC (BG) | blocked: unstable URLs | ESMA covers |
| — | MFSA (MT) · FMA (AT) · CONSOB (IT) · ATVP (SI) | WAF-blocked | ESMA covers |
| — | CMVM (PT) · HCMC (GR) | dead/JS routes | ESMA covers |
| — | FCA (GB) | needs free operator key | pending key |
| — | CBI (IE) | robots.txt prohibits — deliberately not harvested | policy skip |
| — | ČNB (CZ) | opendata lists carry no fund managers (probed 1–7) | GLEIF covers CZ |

## DFIs & EU open data (6 harvested · 5 blocked/absent)

| # | Source | Verdict | Yield |
|---|---|---|---|
| 18 | EBRD projectsData.csv | harvested | 149 provisional funds + 150 lp_in |
| 19 | IFC disclosure API | harvested (Europe-scoped) | 6 provisional + 7 lp_in (455 fund projects are mostly non-Europe) |
| 20 | KfW Capital portfolio | harvested | 28 provisional + 43 lp_in |
| 21 | CDP Venture Capital | harvested (FondiSupportati only) | 32 provisional + 35 lp_in |
| 22 | Fondo Italiano d'Investimento | harvested | 41 provisional + 43 lp_in |
| 23 | Axis Fond-ICO Global | harvested (second-probe fix) | 62 provisional + 76 lp_in |
| — | EIF | no machine-readable portfolio exists | documented |
| — | BGK / PFR (PL) | WAF-blocked (Cloudflare / custom) | documented |
| — | EU FTS | grant recipients, not fund lists; yearly XLSX documented | deferred |
| — | Kohesio / data.europa.eu | no fund/intermediary datasets found | documented |
| — | Coparion | portfolio = startups (out of institutional scope) | deliberate skip |

## Associations (14 harvested · 9 blocked/lossy)

| # | Source | Verdict | Yield (names → created provisional) |
|---|---|---|---|
| 24–37 | PSIK · CVCA-CZ · SLOVCA · HVCA-HU · EstVCA · NVP · AIFI · SECA · BVK · Pääomasijoittajat · NVCA-NO · Aktive Ejere · SVCA · invest.austria | harvested | 2,000 names → ~1,170 created (PSIK 50→19 · CVCA 80→50 · SLOVCA 50→32 · HVCA-HU 68→50 · EstVCA 68→42 · NVP 146→70 · AIFI 189→91 · SECA 400→296 · BVK 293→184 · FVCA 159→83 · NVCA-NO 100→60 · AktiveEjere 95→56 · SVCA 132→70 · inv.austria 70→48) |
| — | HVCA-GR | drifted (TYPO3 label markup) | skipped |
| — | Invest Europe · AIMA · France Invest | member-gated | documented |
| — | SpainCap · LVCA | JS shells | documented |
| — | ROPEA · BVCA-BG · CVCA-HR · LT-VCA | logo grids, names too lossy | deliberate skip |

## Press & newsrooms (Part 5)

| Layer | Verdict | Yield |
|---|---|---|
| 25 press sources (13 portals + 10 national business press + PDI + GLC) | activated, maxItemsPerRun 5 | part of 330-doc cycle |
| 54 firm newsrooms (RSS, ≤8/country: FR 8 · PL 8 · RO 7 · CZ 6 · GR 6 · EE 4 · +10 countries) | activated | part of 330-doc cycle |
| Fetch cycle | 81/82 ok (LHV Pank feed 404) | 330 new documents |
| Extraction ($6 cap) | 147 docs · 60 relevant · **52 facts PROPOSED** · $6.05 | 16-country fact spread |
| Real Deals · Unquote · PE News · Science-Business · Invest Europe news · Mergermarket | no free feeds | documented |
| Preqin blog | **permanently prohibited** (rails override the run prompt) | not seeded |

## Enrichment layers (Part 6)

| Layer | Verdict | Yield |
|---|---|---|
| Wikidata (5 classes; +hedge fund, +accelerator; no angel-network class exists) | harvested | 6 provisional + 40 gap-fills |
| enrich:batch (website + activity signal, $4 cap) | ran | 46 candidates · $1.16 · 11 review items |
| logos:backfill | ran | 295 stamped |
| geocode:backfill | ran | 20,546 located · 10,013 honestly unlocated |
| ch:enrich · embeddings:backfill · OpenCorporates | skipped: no CH_API_KEY / VOYAGE_API_KEY / OPENCORPORATES_API_KEY | keys documented |

**Honest source count: 37 harvested/activated-productive + 79 press/newsroom
activations = expedition across ~116 attempted routes, of which 29 are
documented blocked/skipped with reasons above.**
