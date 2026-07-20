# European regulator register catalog — accessibility matrix

Probed 2026-07-20 (reset build Part 2), read-only, ≤4 requests per regulator,
plain Node `fetch` as the yardstick (no headless browser). This catalog is the
asset: harvesters exist today for the tier-1 routes; everything else is
documented here for future runs.

Access classes: `downloadable-file` > `json-api` > `parseable-HTML` >
`search-form-only` > `registration-required` > `JS/WAF-blocked`.

## Harvested today (built harvesters)

| Register | Country | Route | Access | Harvester |
|---|---|---|---|---|
| GLEIF LEI | all | `api.gleif.org/api/v1/lei-records` (JSON:API, no auth, country+category filters) + RR golden-copy zip (~23 MB, all fund→manager relationships) | json-api + downloadable-file | `pnpm gleif:harvest -- --countries … --cap N` |
| CSSF | LU | `cssf.lu/wp-content/uploads/IDENTIFIANTS_AIFM.zip` — daily bulk, UTF-16LE tab-delimited: AIFMs + AIFs + management links. Also `OPC_COMP_TP_TOUS_OUVERTS.zip` (UCITS share-class level, ~150k rows). Undocumented JSON API behind `edesk.apps.cssf.lu/search-entities-api/` exists but its robots discourage use — the bulk files are the sanctioned route. | downloadable-file | `pnpm registers:harvest -- --register cssf` |
| NBS | SK | `subjekty.nbs.sk/api/json` — whole market in one zip'd JSON (33k+ institutions, addresses, license scopes), nightly refresh | json-api | `pnpm registers:harvest -- --register nbs` |
| AMF | FR | Official SGP (asset manager) list on data.gouv.fr, stable resource `datasets/r/2220f808-8908-4afc-98e3-cf74a25678e2` — CSV with agrément number, LEI, website | downloadable-file | `pnpm registers:harvest -- --register amf` |
| Bank of Lithuania | LT | `lb.lt/en/sfi-financial-market-participants?export=csv&market=N` — CSV export per market | downloadable-file | `pnpm registers:harvest -- --register lb` |

## Probed, documented, not yet harvested

| Regulator | Country | Register URL | Access class | Best machine route / blocker |
|---|---|---|---|---|
| FINMA | CH | finma.ch authorised-institutions | downloadable-file | Direct XLSX/CSV: `~/media/finma/dokumente/bewilligungstraeger/xlsx/beh.xlsx` (banks/securities firms), `flvervt.xlsx` (fund mgmt + asset managers), `afch.xlsx` (Swiss CIS), `csv/uid.csv`. Zero friction; needs an XLSX parse (zip + XML — both already in-repo). Top candidate for the next harvester. |
| AFM | NL | afm.nl/en/sector/registers/vergunningenregisters | downloadable-file | Per-register "Export as CSV / XML" links at page bottom (e.g. beleggingsondernemingen, 1,456 investment firms across 12 licence registers). |
| Finanstilsynet | NO | finanstilsynet.no/virksomhetsregisteret | json-api | Open keyless REST API with OpenAPI spec at `api.finanstilsynet.no/registry/` — name, org number, licence types, hourly refresh. |
| FCA | GB | register.fca.org.uk | json-api (registration-required, free) | Documented API (`/services/V0.1/Firm/{FRN}`, search) behind a free signup → `x-auth-email` + `x-auth-key` headers, 100 req/min. Operator step: create the key. |
| HANFA | HR | hanfa.hr/registri | downloadable-file | Append `?export=xml` to any leaf register (UCITS, AIF managers…) — includes LEI + management company (edge material). |
| CySEC | CY | cysec.gov.cy/en-GB/entities/ | downloadable-file | Per-category Excel download links (CIFs, AIFMs, UCITS…); file IDs change per update, so scrape the link from the category page first. |
| KNF | PL | knf.gov.pl (TFI/FI pages) + wybieramfundusze-api.knf.gov.pl | parseable-HTML + partial json-api | TFI list embedded server-side; funds via the wybieramfundusze JSON API. Fragmented across pages. |
| ČNB | CZ | cnb.cz JERRS | downloadable-file (partial) | Open-data CSV `jerrs.cnb.cz/apljerrsdad/JERRS.OPENDATA.STAHUJ?p_seznam=1..7` covers banks/credit lists only; fund managers need JERRS web queries (use `jerrs.cnb.cz` host — `apl.cnb.cz` refuses). Full web service is registration-gated (signed email to jerrsws@cnb.cz). |
| ASF | RO | data.asfromania.ro/registru/lista.php | parseable-HTML | Legacy server-rendered PHP; enumerate `sect` params (SSIF, SAI, FDI, AFIA, FIA…). Quarterly staleness. |
| Latvijas Banka | LV | bank.lv market-participants | parseable-HTML | Paginated server-rendered list (3,906 participants) with `?segments=` filter; no export. |
| FSC | BG | fsc.bg category list pages | parseable-HTML | Static HTML tables (e.g. 28 management companies); shallow fields, no licence numbers at list level. |
| Finantsinspektsioon | EE | fi.ee/en/supervised-entities | parseable-HTML | List pages carry only names; fields need per-entity detail crawl (small N, fine). |
| Finansinspektionen | SE | fi.se company register | parseable-HTML | Server-rendered search results, enumerable by "main business" category; no export/API; data lags ≤2 days. |
| CNMV | ES | cnmv.es BusquedaPorEntidad.aspx | parseable-HTML | ASP.NET; category list pages GET-parseable, stateful pages need `__VIEWSTATE` round-trips. No export. |
| BaFin | DE | portal.mvp.bafin.de/database/InstInfo | search-form-only | Server emits malformed HTTP headers — Node/undici fetch dies ("Invalid header value char"); needs a curl-class client + Java form POSTs. In-app Excel export exists once inside. Highest-value "fixable" blocker. |
| Finanstilsynet | DK | virksomhedsregister.finanstilsynet.dk | JS-blocked (export exists in-app) | SPA; "export customized list" implies a findable JSON XHR — one browser-inspection away. (`vut.finanstilsynet.dk` refuses connections; use the virksomhedsregister host.) |
| FIN-FSA | FI | finanssivalvonta.fi registers | search-form-only | Embedded JS search widget; no export or endpoint visible server-side. |
| MNB | HU | intezmenykereso.mnb.hu | search-form-only | Server-rendered but session-token-bound; no CSV/XLSX anywhere; fragile to scrape. |
| HCMC | GR | hcmc.gr (Liferay portal) | parseable-HTML (geo-issue) | Legacy host refused TCP from US egress — retry from EU IP; if reachable, plain HTML tables. |
| CMVM | PT | cmvm.pt new portal | JS-blocked | Opaque hashed URLs, renders empty without JS; old ColdFusion register decommissioned. |
| MFSA | MT | fsr.mfsa.mt | JS-blocked | 403 to plain fetch + JS app whose only entry is a name-search box (no enumeration even in a browser). |
| FMA | AT | fma.gv.at company database | WAF-blocked | 403 Forbidden to non-browser clients. |
| CONSOB | IT | consob.it intermediari | WAF-blocked | Radware Bot Manager challenge on every request — hardest block in the set. Plan as manual-download target. |
| ATVP | SI | a-tvp.si/registri | WAF-blocked | 403 to plain fetch on all register URLs. |
| Central Bank of Ireland | IE | registers.centralbank.ie | search-form-only + robots-restricted | Downloads page is PDF-only behind WebForms postbacks; no API ("API Available: No" per gov.ie catalogue). Search results ARE plain-GET HTML, **but robots.txt expressly disallows bots (incl. ClaudeBot/GPTBot) from all Search/Results/Data pages** — the operator's intent is anti-harvesting, so CBI is documented and deliberately NOT harvested. Targeted manual lookups only. |

## Fallback

ESMA's central registers (AIFM / UCITS / investment-firm CSVs at esma.europa.eu)
cover every EU jurisdiction with name + home NCA + passporting data — a
cross-check and a rescue path for the blocked NCAs (IT, AT, SI, PT, MT, HU),
at the cost of address/city granularity.
