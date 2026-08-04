# EUROPE DEPTH RUN — competitor & intelligence-provider landscape

Generated from `data/europe-depth/*-sources.json` (competitorAnalysis blocks)
by `europe-competitors-docs.ts` — edit the JSON, not this file.

**What this is.** A market map of every data / intelligence platform that
covers European alternative investments, country by country, built from
public research: what each one covers, where it is strong, where it is thin,
and — the operative column — **which public primary sources it visibly draws
on**. That last column is the actionable part: wherever a provider is
reselling a national register, gazette or regulator file, Continuum can take
that source directly, at $0, with provenance the reseller cannot offer.

**What this is not.** No competitor platform is ingested, scraped, or
queried by the pipeline. Nothing here is derived from a competitor's own
database, paid export, or ToS-locked API — only from public descriptions of
their coverage. It is kept in its own file, separate from
`docs/EUROPE-SOURCE-CATALOG.md` (the harvest plan), precisely so the two
never mix: that file lists sources we ingest, this file lists firms we
position against.

**Scale.** 325 provider observations across 38 countries ·
150 distinct platforms · 11 global incumbents ·
8 multi-country regional players · 131 single-market local players.

---

## 1. Ranking — who actually covers Europe

Ranked by number of national markets where the provider surfaced as a
relevant player. Reach is not the same as depth: read the gap column.

| # | Platform | Markets | Tier | Markets covered | Representative observation |
|---|---|---|---|---|---|
| 1 | **Preqin** | 38 | global | AL AT BA BE BG CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV ME MK MT NL NO PL PT RO RS SE SI SK XK | AL: Near-zero dedicated Albania coverage — no domestic GP ecosystem to track; a handful of SEE-regional funds (often EBRD-backed) with Albanian exposure appear tagged regionally. |
| 2 | **Dealroom** | 37 | global | AL AT BA BE BG CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV ME MK MT NL NO PL PT RO RS SE SI SK XK | AL: Thin Albanian startup coverage (small ecosystem: a few dozen active startups, accelerator cohorts). Dealroom has Western Balkans reports (with EU/EIT support). |
| 3 | **PitchBook** | 36 | global | AT BA BE BG CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV ME MT NL NO PL PT RO RS SE SI SK XK | AT: AT PE/VC deal and valuation coverage via press + filings; good on buyouts of Austrian Mittelstand by DACH sponsors; weak on private-debt and real-asset vehicles. |
| 4 | **Crunchbase** | 35 | global | AT BA BE BG CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LT LU LV ME MK MT NL NO PL PT RO RS SE SI SK XK | AT: Broad but shallow AT startup coverage, mostly self-reported profiles plus funding press; unreliable for legal-entity ground truth. |
| 5 | **Moody's / Orbis (Bureau van Dijk)** | 7 | global | CY DE IT LI MT NL XK | CY: Cyprus company financials, ownership trees and credit data sold into compliance/KYC workflows. |
| 6 | **EMIS** | 6 | regional | AL HU ME MK PL XK | AL: Deepest commercial coverage of Albania among global providers: company financials, industry reports, news aggregation. Subscription-only. |
| 7 | **OpenCorporates** | 5 | global | AL CY LI LU MT | AL: No meaningful Albania jurisdiction coverage; the local AIS-run opencorporates.al (unaffiliated) is the real open-register mirror. |
| 8 | **SeeNews** | 4 | regional | AL BG MK XK | AL: Regional SEE wire with steady Albania business coverage and an annual company ranking that includes Albanian corporates. |
| 9 | **CompanyWall Business** | 3 | regional | BA HR RS | BA: VERIFIED local/regional company-data provider: ~87k companies, 92k entrepreneurs; financial statements, credit ratings, account blockades, bankruptcy proceedings, ownership and tax debt. Paid tiers 41-1,135 KM. The stron |
| 10 | **CRIF** | 3 | regional | CZ IT SK | CZ: LOCAL. The dominant CZ firmographic/credit-data provider: full company universe, financials from filed statements, payment/insolvency flags, ownership links. This is what CZ banks and NPL buyers actually use for counterp |
| 11 | **Debtwire** | 3 | global | AL CY GB | AL: Effectively no Albania coverage; SEE NPL commentary occasionally references Albania at market level only. |
| 12 | **Dun & Bradstreet** | 3 | global | BA ME SK | BA: Sells BA company credit data inside regional packages; coverage is registry-derived, no alternatives-specific intelligence. Local bisnode.ba domain not verified this session. |
| 13 | **With Intelligence** | 3 | global | CY GB MT | CY: Cyprus ManCos and hedge/liquid-alt managers within their EU fund-manager datasets. |
| 14 | **Bloomberg** | 2 | global | CY LI | CY: CSE-listed issuers, prices and corporate actions; minimal alternatives depth for CY. |
| 15 | **eKapija** | 2 | regional | BA RS | BA: Regional business-news + tender platform with a BiH edition; strong on investment-project announcements and public tenders; bot-blocks scrapers (403). |
| 16 | **Monterey Insight** | 2 | regional | LU MT | LU: The Luxembourg Fund Report — the reference local dataset on fund service providers: market shares of fund administrators, custodians/depositaries, auditors, legal advisers, ManCos per fund. Exactly our category-6 service |
| 17 | **North Data** | 2 | regional | DE LI | DE: The benchmark local player: company graph, financials, register-event timeline for all German entities; no alternatives-specific classification. |
| 18 | **TTR Data** | 2 | regional | ES PT | ES: VERIFIED live. The Iberian M&A/PE/VC/capital-markets deal database; claims 3x more local data than globals; monthly league tables. |
| 19 | **Akta.ba** | 1 | local | BA | BA: Beyond news, runs a company-registry search and a tender-intelligence product; good tender/award tracking and industry profit-leader rankings. |
| 20 | **Alma Talent Tietopalvelut** | 1 | local | FI | FI: Kauppalehti-branded company information, financials, decision-maker data and TE-500 style rankings; deeply integrated with Alma's business media. Commercial; do not scrape. |
| 21 | **Altares** | 1 | local | FR | FR: Credit risk, payment behavior, firmographics for the full FR company universe; sell scores not intelligence. |
| 22 | **APIS** | 1 | local | BG | BG: Legal-information systems plus company-data product (Apis Register+) built on official registers; the standard tool of Bulgarian lawyers; entity data strong, no investment-intelligence layer. |
| 23 | **Argentum** | 1 | local | NO | NO: Semi-competitor: the best free analytical coverage of the Nordic PE/VC fund universe (fundraising, buyout activity, fund lists) since 2008, published as open reports at info.argentum.no. |
| 24 | **Axesor** | 1 | local | ES | ES: Ratings, company data and risk scores on Spanish companies; MARF rating agency presence. |
| 25 | **Barkow Consulting** | 1 | local | DE | DE: German VC/banking market statistics frequently cited by press. |
| 26 | **Beauhurst** | 1 | local | GB | GB: The key UK-native competitor: tracks every UK high-growth company incl. UNANNOUNCED equity rounds, at 8-figure company coverage. |
| 27 | **BeBeez Private Data** | 1 | local | IT | IT: THE local benchmark: Italian private equity, venture, private debt, NPL and M&A deal database built on 10+ years of BeBeez reporting; subscription product, do not scrape. |
| 28 | **BiQ** | 1 | local | DK | DK: Person-company network data (BiQ, used by journalists) and firmographic/credit data (NN/D&B); B2B sales orientation, no alternatives focus. |
| 29 | **Bizi.si** | 1 | local | SI | SI: Full Slovenian company universe with financials, credit flags, blocked accounts (3,688 shown), receiverships (359), new companies — the local reference company-data product. No alternatives/fund lens. |
| 30 | **BizMachine** | 1 | local | CZ | CZ: LOCAL Czech firmographic/predictive-signals provider (growth scoring, tech detection) used by banks/telcos for prospecting. No alternatives focus but demonstrates what is derivable from CZ open registries. |

---

## 2. Global incumbents — full observations

The firms Continuum is measured against. For each: every country-level
observation gathered, and the public sources they are visibly built on.

### Preqin — seen in 38 markets

Markets: AL, AT, BA, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, ME, MK, MT, NL, NO, PL, PT, RO, RS, SE, SI, SK, XK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AL | Near-zero dedicated Albania coverage — no domestic GP ecosystem to track; a handful of SEE-regional funds (often EBRD-backed) with Albanian exposure appear tagged regionally. | EBRD project summary documents, IFC disclosures, fund-manager websites, press releases — we go direct to ebrd.com PSDs and disclosures.ifc.org. |
| AT | Covers the larger Austrian GPs/LPs (Erste/RBI asset-management arms, insurers, Pensionskassen as LPs) and pan-European funds with AT exposure; thin on AT lower-mid-market, NPL servicers, and the service graph. | FMA licence disclosures, ESMA registers, fund annual reports, association data (Invest Europe, which invest.austria feeds), press releases — all reachable directly via FMA/ESMA/OTS. |
| BA | Effectively zero BA-specific fund coverage; Bosnia appears only inside CEE/SEE aggregates and via the handful of regional funds (EBRD/EIF-backed SEE vehicles) that list BA in their geographic mandate. No local GP/LP depth. | Fund manager self-reporting and regulatory filings elsewhere; for BA-touching funds the visible public trail is EBRD/EIF project disclosures and fund press releases — all of which we can ingest directly. |
| BE | Global alternatives standard: Belgian GP/fund profiles, performance, and the Belgian LP universe (pension funds, insurers) for fundraising intelligence. Thin on Belgian mid-market service graph and niche alts. | FSMA AIFM/ManCo lists, NBB supervised-institution lists, FSMA IORP register and annual IORP overviews, fund managers' own annual reports filed at NBB CBSO, press releases — all directly reachable via the tier1/tier2 sources cataloged here. |
| BG | Covers Bulgarian GPs/funds mainly as part of CEE fund universes (e.g., BVCA-member funds, EIF/EBRD-backed vehicles); thin below the fund level and weak on local service graph, NPL servicers and niche alts. | FSC/ESMA fund and manager registers, EIF/EBRD/FMFIB program announcements, fund press releases, association member lists (BVCA) — all directly accessible to us. |
| CH | Strong on Swiss GPs/LPs: Partners Group, LGT (Liechtenstein-adjacent), Unigestion, Capital Dynamics and the large pension-fund LP base; fund performance and fundraising for Swiss-domiciled and Swiss-managed vehicles. | FINMA licensee lists (fund management companies, managers of collective assets), OAK BV pension-system reports and pension funds' own annual reports, SECA membership/reports, fund annual reports — all directly accessible to us. |
| CY | Covers Cyprus-domiciled AIFs/RAIFs, AIFMs and fund performance as part of European alternatives; Cyprus is a small but growing fund domicile in their data. | CySEC entity registers and quarterly collective-investment statistics, CIFA publications, fund manager announcements — all directly accessible to us via cysec.gov.cy and cifacyprus.org. |
| CZ | Thin-but-real CZ coverage: a handful of CZ-domiciled GPs (Genesis Capital, Jet Investment, ARX Equity, Enern etc.), CEE funds in fundraising, and CZ institutions as LPs. Weak below the top PE tier; near-zero on CZ niche alts and the service graph. | CNB regulated-entity lists (fund manager licensing), CVCA membership and yearbook, fund annual reports filed to the commercial register (sbírka listin at or.justice.cz), press releases — all of which we can hit directly via ARES/dataor + CVCA + ČNB lists. |
| DE | Strong on German GPs/LPs, fund closings, AIFM landscape; weak on sub-institutional/mid-cap and the service graph. | BaFin InstInfo/FondsInfo AIFM and fund registers; Bundesanzeiger fund/company filings; association statistics (BVK, BAI, Invest Europe) — all directly accessible above. |
| DK | Strong on Danish GPs (Axcel, Polaris, Maj Invest, Nordic Alpha, Seed Capital, NREP on real assets) and especially Danish LPs — ATP, PFA, PKA, PensionDanmark, Sampension are heavily profiled allocators. Fund-level performance where LPs disclose. | Finanstilsynet AIFM/ManCo register, CVR filings and XBRL annual reports, pension funds' own annual/responsible-investment reports, press releases — all directly accessible to us via datacvr.virk.dk, virksomhedsregister.finanstilsynet.dk and fund websites. |
| EE | Fund-level coverage of Baltic-focused GPs (BaltCap, Livonia, INVL vehicles touching EE) and some LP data via pension-fund reporting; Estonia-specific depth is shallow — few Estonian LPs profiled, almost nothing on service providers. | Finantsinspektsioon fund/AIFM registers, Pensionikeskus fund data, annual reports filed to the e-Business Register, EstVCA publications — all public and directly harvestable. |
| ES | Spanish GPs/LPs and fund performance covered top-down; thin on mid-market and regional service graph. | CNMV SGIIC/SGEIC and capital-riesgo registers, DGSFP pension-fund register (LP side), fund annual accounts filed via Registro Mercantil/BORME — all directly accessible to us. |
| FI | Strong on Finnish GP/LP fund-level data: FVCA-member buyout/VC funds, pension LPs (Keva, Varma, Ilmarinen) commitment tracking, fundraising and performance. Thin on Finnish service graph, NPL/distressed, and anything below institutional fund size. | FIN-FSA AIFM/ManCo authorizations, Pääomasijoittajat (FVCA) member and statistics publications, pension providers' own annual/interim reports (Keva, TELA members), press releases — all directly reachable via the FIN-FSA supervised-entities register, paaomasijoittajat.fi, tela.fi/keva.fi listed above. |
| FR | Strong on French GPs, funds, performance and LP commitments (Bpifrance, insurers, ERAFP/FRR mandates); weaker on deal-level and mid-market detail. | AMF GECO/SGP register (fund-manager universe), France Invest activity & performance reports, BALO fund notices, LP annual reports (ERAFP, FRR, insurers), press releases — all directly accessible to us. |
| GB | Deepest global alt-funds coverage — UK GPs, LPs, fund performance, dry powder; strong on pensions/insurers as LPs. | FCA Financial Services Register (AIFM/manager authorisations), Companies House accounts of fund GPs/LLPs (UK LLP accounts disclose carry vehicles), local-authority pension fund FOI/committee papers, LSE/RNS disclosures — all directly accessible to us. |
| GR | Thin-to-moderate Greece coverage: the handful of institutional Greek GPs (mostly EquiFund-era VCs and a few PE/infra managers), Greek exposure of pan-European funds, and some LP records (HDBI, insurance groups). Weak on NPL servicers, service graph, and non-fund entities. | HCMC AIFM lists (via Greek access), ESMA registers, HDBI/EIF EquiFund portfolio disclosures, fund manager websites and press releases — all reachable directly (ESMA + HDBI portfolio page + press). |
| HR | Thin-but-real Croatia coverage inside its CEE universe: AIFMs, PE/VC fund vehicles, some LP commitments (EIF/EBRD-backed funds). Weak on service graph, NPLs, and anything below institutional fund size. | HANFA AIF/UCITS registers, CVCA membership, EIF/EBRD press releases, fund-manager websites and annual reports — all directly reachable by us (hanfa.hr/registri, cvca.hr). |
| HU | Thin-to-moderate Hungary coverage: the larger HU GPs and state-linked funds (Hiventures, MFB group vehicles), some LP records for pension funds and insurers, fundraising/AUM estimates. Weak on service graph, NPL/servicers, and niche alts. | HVCA and Invest Europe member lists/statistics, MNB licensee register (fund manager licenses), ESMA AIFM register, fund annual reports via e-beszamolo-type filings, press releases from GPs — all directly accessible to us. |
| IE | Deep coverage of Ireland as a fund domicile — Irish AIFMs, ICAVs, QIAIFs, fund administrators, plus Irish LPs (ISIF, pension schemes). Strong on fund-level terms and service-provider relationships; weaker on small domestic GPs and portfolio-company granularity. | Central Bank authorisation lists (pre-robots era) and ESMA registers, CRO filings, ISIF published portfolio and annual reports, pension-scheme annual reports, Irish Funds publications, press releases — all reachable directly via ESMA registers, opendata.cro.ie, isif.ie/portfolio, pensionsauthority.ie. |
| IS | Thin but present Iceland coverage: pension funds as LPs (the 18 Landssamtök lífeyrissjóða members), a handful of GPs (Frumtak, Crowberry, Brunnur, VEX, Alfa Framtak, Kvika AM funds). | Central Bank supervised-entities & fund registers, pension-fund annual reports (public PDFs on each fund's site), association member lists, press releases. |
| IT | Strong on Italian GP/LP fund data (SGRs, closed-end FIA funds, fundraising, LP commitments from casse di previdenza and fondazioni); weak on sub-institutional deals and service-graph entities. | Banca d'Italia SGR/SICAF albi, COVIP pension fund albo and annual reports, ACRI/AdEPP annual reports, fund annual reports filed at Registro Imprese, AIFI/PwC semi-annual market statistics. |
| LI | Thin Liechtenstein coverage: a handful of LI-domiciled AIFs/AIFMs and service providers; LI usually folded into DACH/Europe aggregates. No LI-specific depth on foundations/trust structures. | FMA register of licensees (register.fma-li.li), LAFV fund list/API, fund prospectuses/annual reports — all directly accessible to us. |
| LT | Thin, fund-level Baltic coverage: LT VCA-member funds (BaltCap, Livonia, Practica, Iron Wolf, Coinvest et al.) with AUM/vintages; weak below fund level and on service graph. | Bank of Lithuania AIFM/CIU register, LT VCA statistics and member list, EIF/InvestEU press releases, fund websites — all directly accessible to us. |
| LU | Deep coverage of Luxembourg as Europe's #1 fund domicile: AIFs, RAIFs, SIFs, SCSp structures, AIFM/ManCo mapping, LP commitments into LU vehicles. Weak on the local service-provider graph below top-tier admins. | CSSF official lists and bulk XLSX files (AIFM/UCI/AIF lists), LBR/RCS filings and RESA publications, LuxSE prospectuses and official list, ALFI/LPEA reports and statistics — all directly accessible to us. |
| LV | Thin but present Baltic coverage: the handful of institutional-grade LV GPs (BaltCap, INVL, Livonia Partners, FlyCap, Expansion Capital) and Altum as LP/fund-of-funds; fund closes and mandates, little below the top tier. | Latvijas Banka AIFM/ManCo register (licensing events), LVCA membership and yearbook, Altum program announcements, fund press releases — all directly accessible to us. |
| ME | Near-zero dedicated Montenegro content — the country appears only inside Balkans/CEE-mandate funds' geographic footnotes; no local GP/LP profiles of substance. | Fund-manager self-reporting plus regulator lists; for ME the underlying public route is the SCMN fund-manager and fund registers, which we catalog directly. |
| MK | Near-zero dedicated MK coverage — a handful of regional funds (SEE-focused PE like Mid Europa-adjacent or EBRD-backed vehicles) tagged with North Macedonia as a geography. No local GP/LP depth; MK pension funds not profiled as LPs in any depth. | Press releases, fund-manager self-reporting, EBRD/EIF/IFC project disclosures. Direct routes for us: EBRD/EIF project pages, MAPAS pension registers, SEC fund-manager register. |
| MT | Thin dedicated Malta coverage: Malta appears as a fund domicile (PIFs/NAIFs/AIFMs) and service-provider jurisdiction rather than a deal market; some Malta-domiciled AIFMs and funds profiled. | MFSA Financial Services Register / ESMA AIFM register, fund annual reports filed at MBR, press releases — all reachable directly via fsr.mfsa.mt (browser), registers.esma.europa.eu, and register.mbr.mt. |
| NL | Strong on NL institutional LPs (APG, PGGM, MN, pension funds' alternatives allocations) and pan-European GP/fund performance; weaker on lower-mid-market NL deals and the service graph. | DNB pension fund register + pension funds' own annual reports (Dutch funds must publish detailed investment mixes), AFM AIFM register, fund annual accounts filed at KVK, manager press releases — all directly harvestable by us. |
| NO | Strong on Norwegian LPs (NBIM/GPFG, Folketrygdfondet, KLP, Storebrand, Argentum) and established buyout/infrastructure GPs (FSN, Verdane, HitecVision, Norvestor); fund-level performance where LPs disclose. Thin on sub-threshold AIFMs and niche alts. | Finanstilsynet registry (AIFM/fund licences), NBIM and Folketrygdfondet public holdings/annual reports, Argentum's State of Nordic PE reports, Brreg annual accounts, NVCA membership — all directly accessible to us via the sources above. |
| PL | Polish GPs, LPs (PTE pension societies, PFR), fund closes and performance where disclosed; strongest on institutional fund data, weak on sub-threshold ASI vehicles and local service graph. | KNF registers (TFI/ZASI), annual reports of pension societies, PSIK/Invest Europe statistics, press releases — all of which we can ingest directly (KNF register pages, IZFiA stats, PSIK reports). |
| PT | Covers Portuguese GPs/LPs/funds as part of pan-European alternatives coverage — strongest on fund vehicles, LP commitments and performance estimates; PT depth is modest (few dozen active GPs). | CMVM register of management companies and funds (our route: ESMA registers, since CMVM portal is JS-blocked), APCRI member roster, APFIPP AUM statistics, fund annual reports, Diário da República fund-vehicle acts. |
| RO | Global alternatives database; Romania appears thinly — a handful of CEE-regional GPs/funds with RO exposure (PE, private debt, infra), LP profiles for regional pension/insurance investors. Weak below the fund level and on local NPL/servicer ecosystem. | Regulator registers (ASF fund/AIFM lists), fund annual reports, GP press releases, association data (Invest Europe/ROPEA-adjacent stats) — all directly accessible to us via asfromania.ro registers, ROPEA, and issuer filings. |
| RS | Thin on Serbia: a handful of regional GPs/funds that touch Serbia (SEE/CEE buyout and infra vehicles) and DFI LPs; essentially no coverage of local service graph, NPL market, or sub-institutional managers. Serbia usually appears only inside CEE aggregates. | Fund manager self-reporting plus public filings and DFI disclosures. Direct-route equivalents for us: EBRD/IFC project disclosures, Serbian SEC (KHOV) fund and ManCo registers, Invest Europe CEE activity reports. |
| SE | Strong on Swedish GPs, fund performance and the LP side — AP1–AP7, insurers (Folksam, Alecta, AMF) are heavily profiled; alternatives allocations and commitments tracked. | AP-fund annual reports and holdings disclosures (ap1–ap7.se), FI company register for AIFM/manager identification, SVCA membership, fund managers' own reports — all directly accessible to us. |
| SI | Covers European alternatives funds and LPs; Slovenia coverage is thin — a handful of SI-domiciled or SI-investing GPs/LPs, mostly via pan-CEE funds. Weak on local service graph, NPLs, and lower-mid-market. | ESMA/national regulator registers (AIFM authorizations), fund annual reports (AJPES JOLP equivalents), LP annual reports (KAD, Modra, SID banka), press releases. We can go directly to ESMA registers, AJPES JOLP, KAD/Modra/SID publications. |
| SK | Institutional alternatives database; Slovakia appears mainly through pan-CEE fund vehicles, a handful of local GPs, and LP records (pension DSS/insurers) — thin, fund-level, not entity-graph deep. | NBS supervised-entity register (fund managers/AIFMs), fund annual reports filed to Register účtovných závierok, association rosters (SLOVCA), press releases — all directly accessible to us via subjekty.nbs.sk, registeruz.sk API and slovca.sk. |
| XK | Negligible Kosovo coverage — no domestic GP/LP universe to track; Kosovo appears only inside mandates of SEE-regional funds (e.g., EBRD-backed Western Balkans vehicles). | DFI disclosures (EBRD project summary documents, IFC disclosures), GP press releases — all reachable directly via the EBRD projects database catalogued above. |

### Dealroom — seen in 37 markets

Markets: AL, AT, BA, BE, BG, CH, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, ME, MK, MT, NL, NO, PL, PT, RO, RS, SE, SI, SK, XK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AL | Thin Albanian startup coverage (small ecosystem: a few dozen active startups, accelerator cohorts). Dealroom has Western Balkans reports (with EU/EIT support). | Self-reported founder profiles, accelerator/program lists (Uplift, EU-funded programs), AIDA announcements, local press — direct: aida.gov.al + local media. |
| AT | Strong Vienna/AT startup + VC round coverage through the co-branded Vienna ecosystem instance (fetch returned 403 — actively bot-protected; do not scrape). | brutkasten, Trending Topics, der Standard startup coverage, invest.austria member data, founders' self-reporting, Firmenbuch capital-increase filings — the press feeds and Firmenbuch route are directly available to us. |
| BA | Best of the globals for the BA startup layer — has BA startup profiles via its ecosystem partnerships in the Western Balkans; funding data mostly self-reported or press-derived. | Startup ecosystem lists (BIT Alliance members, accelerator cohorts), tech press, founder self-reporting. We can go directly to bit-alliance.ba and local tech/business media RSS. |
| BE | Deepest Belgian startup/scale-up ecosystem coverage; partners with regional agencies for ecosystem dashboards. VC-centric; no private debt/real assets depth. | KBO/CBE open data, Staatsblad publications, startup press (Bloovi, Made in, Tech.eu), accelerator/association lists (Private Capital Belgium), PMV/regional-investor portfolio pages. |
| BG | Startup/scaleup mapping for SEE, often via ecosystem partnerships; strong logo-level company coverage, funding rounds crowd-plus-press sourced; little depth on funds' legal entities or LP side. | The Recursive and regional startup media, BESCO/association lists, self-reported company data, Crunchbase-style cross-referencing — the media and association layers are directly available. |
| CH | Swiss startup/scaleup ecosystem mapping (works with local ecosystem partners; Swiss startup data also surfaced through swiss.tech and cantonal ecosystem portals). | Startupticker.ch news and the annual Swiss Venture Capital Report (startupticker + SECA), commercial-register incorporations via Zefix, company self-reporting — the SVCR PDF and startupticker archive are public. |
| CZ | Strongest global platform for the CZ startup/VC layer; works with local ecosystem partners and powers regional startup reports. Good founder/round data, weak on PE, debt, real assets. | czechstartups.gov.cz ecosystem data, CzechCrunch and Lupa coverage, ARES for firmographics, accelerator/VC portfolio pages. We can go straight to ARES + cc.cz/feed + CzechInvest programs. |
| DE | German startup/scaleup universe with government/eco-system partnerships; good funding-round recall, weaker on debt/real assets. | Handelsregister new incorporations, startup press (deutsche-startups, Gründerszene, Startbase), association data (Startup-Verband) — all public routes listed. |
| DK | Deep Danish startup/scale-up graph, ecosystem reports (often with public partners); strong on VC rounds and founder data, not on funds-as-entities or credit/real assets. | The Hub startup directory, CVR register data, news crawling of Danish startup media, self-reported profiles. We can go to The Hub + CVR + Bootstrapping/TechSavvy RSS directly. |
| EE | Strongest startup/VC coverage of Estonia of any global platform — it is the official data partner behind the Startup Estonia database, so Estonian startups, rounds and investor mapping are unusually complete. Weak on private debt, real assets, and the service graph. | e-Business Register open data (avaandmed.ariregister.rik.ee), EMTA quarterly tax/turnover/employee open data (visible in Estonian startup employment/revenue metrics), press releases and startup media (ArcticStartup, Ärigeenius, ERR), self-reported company profiles, Startup Estonia quarterly reports. All of these are directly accessible to us at source. |
| ES | Startup/VC ecosystem mapping incl. Spain hubs (endorsed by public agencies). | Public startup announcements, ENISA/CDTI award publications, accelerator lists, BORME-derived company data via local data resellers. |
| FI | Best-in-class Finnish startup/VC ecosystem mapping (works with Nordic ecosystem orgs); rounds, valuations, investor graphs. Not focused on debt, real assets, or service graph. | PRH/YTJ open data for entity backbone, Business Finland and FiBAN announcements/statistics, ArcticStartup and Yle/HS press coverage, Tesi portfolio disclosures — all cataloged above as direct sources. |
| FR | Powers the official La French Tech ecosystem map — deepest FR startup/VC round coverage of the globals. | INSEE Sirene + INPI RNE open data for firmographics, press/startup-media (Maddyness, FrenchWeb, Sifted class), self-reported profiles, France Invest/EDF-style association stats. |
| GB | Strong UK/European startup and VC round coverage; powers several UK government/ecosystem reports. | Companies House incorporations and filings, press/funding announcements, accelerator and university spinout lists, Innovate UK/UKRI grant data (GtR API). |
| GR | Strongest global platform for the Greek startup/VC layer; powers or overlaps with the annual 'Startups in Greece' reporting (with Found.ation/Marathon ecosystem actors). Company-level coverage broad, funding data crowdsourced+press. | Elevate Greece registry, The Recursive and Greek startup press, EIF/EquiFund fund lists, founder self-reporting — Elevate Greece and The Recursive RSS are direct routes. |
| HR | Best global coverage of the Croatian startup/VC ecosystem (works with regional ecosystem orgs and publishes CEE reports); startup-only lens — no credit, real assets, or service graph. | Self-reported startup profiles, Netokracija and regional tech media, CVCA/CRANE ecosystems, Crunchbase cross-referencing, HAMAG-BICRO program lists — the underlying registries (sudreg, Fina RGFI) are stronger primary routes. |
| HU | Hungarian startup/scaleup mapping is decent via CEE ecosystem reports and local partnerships; strong on founder/round taxonomy, weak on non-tech alternatives. | Startup Hungary reports, HVCA/EIF program announcements, press (Forbes.hu, Portfolio), accelerator/portfolio pages (e.g. Hiventures portfolio) — all public routes we can hit directly. |
| IE | Irish startup ecosystem mapping (often in partnership with local ecosystem bodies); strong on rounds/valualready-public signals, thin on credit, real assets and the service graph. | TechIreland's open startup database, press (Silicon Republic, TechCentral), accelerator/portfolio pages (NDRC, Dogpatch), CRO for incorporation data — direct routes: techireland.org, siliconrepublic.com/feed, opendata.cro.ie. |
| IS | Iceland startup/scaleup universe and funding rounds; sometimes partners with Nordic ecosystem bodies; company pages seeded from registries + news. | Fyrirtækjaskrá basics, KLAK/ecosystem program cohorts, Northstack and English-language press, Framvís member funds' portfolio pages. |
| IT | Best-in-class Italian startup/VC ecosystem mapping (runs co-branded ecosystem reports with local agencies); little depth beyond VC. | startup.registroimprese.it innovative-startup special section (public downloadable register), Italian Tech Alliance and CDP Venture Capital announcements, startup press (StartupItalia, Startupbusiness, EU-Startups). |
| LI | A few dozen LI startups/scaleups (fintech/blockchain skew); patchy, self-reported, often mis-geocoded to CH. | Self-reported profiles, press (Vaterland, startupticker), Digital Liechtenstein ecosystem lists — all reachable directly. |
| LT | Strongest startup/VC coverage of Lithuania — it literally powers the official Startup Lithuania database (white-label), so its LT data is quasi-official. HARD RULE: do not scrape Dealroom or the embedded database. | Startup Lithuania submissions, Innovation Agency data, funding-round press, registry legal-form data — we go to Startup Lithuania news, press RSS, and JAR directly. |
| LU | Powers the official national startup database (Startup Luxembourg with Luxinnovation), so LU startup/VC coverage is unusually good for a small market; thin on funds, credit, real assets. | Luxinnovation ecosystem data, startup self-reporting, Silicon Luxembourg and general press, registry cross-checks against RCS — the underlying public routes (Luxinnovation, press, RCS) are open to us. |
| LV | Best-in-class Latvian startup/VC graph — works with national ecosystems; Latvian startup counts, rounds, investor mapping. | Startin.LV startup database and Latvian Startup Report, LIAA/Labs of Latvia ecosystem reporting, self-reported profiles — startups.startin.lv and LIAA are directly public. |
| ME | Thin Western-Balkans startup layer; Montenegro entries mostly via regional ecosystem reports rather than local partnership. | Self-reported startup profiles, Innovation Fund grant announcements, ICT Cortex ecosystem lists, The Recursive coverage — all public and cataloged here. |
| MK | Best structured coverage of the MK startup/VC slice. Startup Macedonia's app.startupmacedonia.mk is a Dealroom-style ecosystem database (startups, support orgs, investors); Dealroom's global platform carries the same thin MK layer. Nothing on PE, credit, or real assets. | Startup Macedonia community submissions, FITR grant-call results, IT.mk/The Recursive press, company self-reporting. Direct routes for us: FITR grantee lists, Startup Macedonia public pages, IT.mk RSS. |
| MT | Maintains Malta startup-ecosystem data (counts, funding); partners with national promotion bodies in other markets — Malta coverage largely self-reported plus press. | Tech.mt/Malta Enterprise announcements, startup press, Crunchbase-style self-reporting — direct routes: tech.mt news, maltaenterprise.com, BusinessNow.mt RSS. |
| NL | The strongest NL startup/VC dataset; powers Techleap Finder and many Dutch government ecosystem reports; covers funding rounds, investor portfolios, ecosystem stats. Weak on non-VC alternatives (credit, real assets, LPs). | KVK register data, funding press releases, startup/investor self-reporting, Techleap ecosystem partnership, news media — the public underlying layer (KVK + press) is directly accessible to us; do not scrape Dealroom or Finder. |
| NO | Broad Norwegian startup/scaleup mapping (works with Nordic ecosystem bodies); good on rounds, founders, ecosystem taxonomies. Weak on debt, real assets, service graph. | Brreg open API for entity data, Shifter and E24 funding coverage, Innovation Norway/Investinor portfolio pages, company self-reporting — the registry and press primaries are open to us. |
| PL | Startup/VC ecosystem mapping; runs the official Polish ecosystem instance in partnership with PFR (dealroom-powered database of Polish startups), so PL coverage is unusually good for a global platform. | PFR/PFR Ventures data sharing, startup self-reporting, MamStartup/press round announcements, Crunchbase cross-feeds. We go direct to PFR Ventures portfolio + quarterly PFR/Inovo VC reports and MamStartup RSS. |
| PT | Strong Lisbon/Porto startup ecosystem coverage; runs ecosystem mapping in partnership with government startup bodies. | Startup Portugal ecosystem mapping platform and reports, Portugal Ventures portfolio pages, accelerator/incubator portfolio lists, startup media (Link to Leaders, ECO) — all public and cataloged. |
| RO | Strongest global platform for RO startups/VC; cooperates with local ecosystem organizations and government-linked ecosystem reports. Good founder/round data; nothing on debt, real assets, or the institutional service graph. | StartupCafe/Romania-Insider startup press, VC fund announcements, How to Web ecosystem reports, self-reported company data, ONRC-derived firmographics via local partners — the ONRC bulk CSVs on data.gov.ro are the direct route. |
| RS | Best-in-class Serbian startup mapping via co-branded ecosystem reports with local partners (Digital Serbia Initiative orbit); strong on startups/rounds, weak on PE, credit, real assets and the institutional layer. | Ecosystem partners (DSI), accelerator/awardee lists, startup media. Direct routes: DSI member/eco data, Innovation Fund public-call results (incl. Serbia Ventures backed funds), Netokracija/Startit feeds. |
| SE | Best-in-class Swedish startup/scaleup ecosystem mapping; runs co-branded ecosystem dashboards with Nordic agencies. | Bolagsverket/SCB company data, Vinnova grant open data, startup media (Breakit, Di Digital, ArcticStartup), funds' portfolio pages — all public routes we've cataloged. |
| SI | Strong SI startup/scaleup coverage via ecosystem partnerships and CEE reports; startup-only lens — no credit, real assets, or institutional graph. | Ecosystem directories (Startup Slovenia, accelerators, Slovene Enterprise Fund beneficiary lists), founder/press submissions. We can use startup.si directory and SPS 'Prejemniki sredstev' lists directly. |
| SK | Best of the globals on the Slovak startup/VC ecosystem (works with national ecosystem reports and local partners); startup-only lens — no credit, real assets or service graph. | Self-reported startup profiles, SIH/SBA program disclosures, startup media (Startitup, The Recursive), SLOVCA. All four are in our catalog as direct sources. |
| XK | Best startup-side coverage of Kosovo among globals, via Western Balkans ecosystem partnerships; tracks Kosovo startups, rounds and hubs. | Ecosystem partners' data (Innovation Centre Kosovo, STIKK member lists), founder self-reporting, local startup news — ICK and STIKK are catalogued directly above. |

### PitchBook — seen in 36 markets

Markets: AT, BA, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, ME, MT, NL, NO, PL, PT, RO, RS, SE, SI, SK, XK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AT | AT PE/VC deal and valuation coverage via press + filings; good on buyouts of Austrian Mittelstand by DACH sponsors; weak on private-debt and real-asset vehicles. | Firmenbuch filings (via commercial clearing-house data), APA-OTS press releases, Wiener Börse disclosures, EVI gazette publications — we can go to justizonline/auszug.at, ots.at, wienerborse.at, evi.gv.at directly. |
| BA | Sparse BA deal records, mostly cross-border acquisitions of BA companies (banking consolidation, industrial M&A) and the rare venture round. Company records thin, financials largely absent. | Press coverage (eKapija, Bloomberg Adria, SeeNews), SASE/BLSE issuer disclosures, and Competition Council merger decisions — all directly accessible to us (bihkonk.gov.ba, blberza.com RSS, sase.ba). |
| BE | Belgian PE/VC deals, valuations, listed-holding data (Sofina, GBL, Gimv, Brederode). Strong deal history, weaker on gazette-level entity events. | Euronext Brussels disclosures, company press releases, De Tijd/L'Echo coverage, KBO/CBE identifiers, Staatsblad incorporation/merger publications. |
| BG | Good on Bulgarian VC deal flow (LAUNCHub, Eleven, Vitosha, BrightCap ecosystems) and M&A with advisor attribution; weaker on private debt, real assets and state-linked vehicles. | Startup/VC press (The Recursive, Capital), company press releases, Commercial Register filings for confirmations, exchange disclosures (X3News) — we can ingest the same primary feeds. |
| CH | Swiss PE/VC deal and company coverage, valuations, service-provider mapping (law firms, banks on deals). | Zefix/SOGC register mutations (capital increases, new entities), SIX/SER issuer disclosures, press releases from firms and startupticker-style media — Zefix REST API and shab.ch API give us the same primary feed at $0. |
| CY | Cyprus PE/VC deals, startup ecosystem and investor profiles; coverage skewed to tech (Exness, Wargaming orbit) and thin on funds/credit. | Press releases and tech media, DRCOR registrar filings, TechIsland and RIF grant announcements, CYBAN portfolio disclosures — we go direct to data.gov.cy CSVs, research.org.cy, thetechisland.org, cyban.com.cy. |
| CZ | Better CZ deal coverage than Preqin on buyouts and growth (tracks Jet, Genesis, BHM, Sev.en, PPF, EC Investments deal activity); valuations largely modeled. Service-provider tagging (law firms, advisors) is decent but built from deal press. | Deal press (HN, E15, CzechCrunch, CTK wire), commercial register filings for confirmations, PSE disclosures, CVCA. All directly accessible to us: the same RSS feeds plus ARES/OR filings. |
| DE | Deep German deal/valuation coverage for PE/VC and M&A; advisor networks well mapped. | Handelsregister filings and Handelsregisterbekanntmachungen (cap-table/UBO changes), Bundesanzeiger accounts, press (Handelsblatt/FINANCE/JUVE deal reports) — the same gazette+press stack we catalog. |
| DK | Good Danish deal coverage (VC rounds, buyouts, M&A) and advisor league tables; weaker on niche alts and the service graph. | GlobeNewswire/Nasdaq Copenhagen announcements, CVR ownership changes, Aktive Ejere member activity, startup press (Bootstrapping, TechSavvy) — every one of these is public and catalogued above. |
| EE | Covers the visible Estonian VC/PE layer (BaltCap, Karma Ventures, Trind, Superangel, Specialist VC, Startup Wise Guys, Plural's Estonian footprint) and larger deals; thin below headline rounds, sparse on Estonian LPs, NPL/servicers and niche alts. | Company registry filings (ariregister annual reports), Nasdaq Baltic disclosures, EstVCA membership and activity reports, fund/firm press releases, English-language media (ERR News, Baltic Times). Direct routes exist for every one. |
| ES | Good on Spanish VC rounds and PE deals via press mining; weaker on debt, NPL, real assets. | BORME incorporation/capital-increase events, CNMV registers, SpainCap yearbook, startup press (El Referente-class outlets) — we can consume the same gazette + press layer. |
| FI | Good Finnish deal coverage (M&A, PE buyouts, VC rounds) and company financials; weaker on LP granularity and local insolvency/credit events. | PRH trade register + financial statements (the avoindata.prh.fi iXBRL API is the direct route), Nasdaq Helsinki disclosures via GlobeNewswire/STT, press wires, FVCA statistics. |
| FR | Good FR PE/VC deal and valuation coverage, cap tables inferred from filings; strong advisor mapping. | INPI RNE filings and annual accounts (open API/SFTP), BODACC events (open API), Euronext/AMF regulated disclosures via info-financiere.gouv.fr, company press releases. |
| GB | UK M&A/PE/VC deal coverage, valuations, service-provider league tables. | Companies House filings (SH01 share allotments, charges), RNS announcements via LSE, The Gazette insolvency notices, press releases — the SH01/charges route is fully open via CH API. |
| GR | Deal-level coverage of Greek PE/VC and M&A, decent on larger buyouts (CVC/BC Partners activity in Greece), valuations mostly modeled. Weak on private debt/NPL trades and real-asset SPVs. | Press (Kathimerini/Capital/Naftemporiki English wires), ATHEX announcements, GEMI filings for cap-table confirmation, EU/EIF and EBRD project disclosures — GEMI, ATHEX, Diavgeia and EBRD project docs are directly accessible. |
| HR | Croatian deal coverage driven by press and pan-EU filings; decent on VC rounds touching Croatian startups, weak on local mid-market PE, real assets, and credit. | Press releases and media (Poslovni, Netokracija, Forbes HR), sudski registar company events, ZSE disclosures — we can go straight to sudreg API + eho.zse.hr feeds. |
| HU | Deal-level HU PE/VC coverage (buyouts, VC rounds, exits) with reasonable recall on announced deals; valuations mostly estimated. Little on private debt, real assets or the institutional service graph. | Hungarian business press (Portfolio.hu, Forbes.hu, Telex/G7, VG), company-register events (Cégközlöny incorporations/changes), HVCA deal statistics, exchange disclosures (BÉT) — we can ingest each at source. |
| IE | Good Irish PE/VC deal coverage (buyouts, growth, VC rounds) and law-firm/advisor league tables; captures Enterprise Ireland co-investments unevenly. | CRO filings (share allotments B5s reveal rounds), IVCA quarterly VentureP ulse-style reports, Enterprise Ireland Seed & Venture reports, Euronext Dublin disclosures, Irish Times/Silicon Republic/The Currency press — all public: opendata.cro.ie, ivca.ie, enterprise-ireland.com, live.euronext.com. |
| IS | Icelandic VC/PE deals and funds, mostly deal-level from press; covers exits of listed companies via Nasdaq Iceland. | Press/RSS (Northstack, Innherji, Vísir, mbl), Nasdaq Iceland disclosures via GlobeNewswire, company register lookups. |
| IT | Good Italian PE/VC deal and valuation coverage, cap tables reconstructed from filings; patchy on private debt, NPL and real assets. | Registro Imprese/InfoCamere company filings (via commercial resellers), Borsa Italiana/Euronext listing notices, Gazzetta Ufficiale, press (Il Sole 24 Ore, MF, BeBeez). |
| LI | Sparse LI deal and company coverage (occasional VP Bank/LLB corporate actions, rare LI startup rounds). Morningstar carries LI-domiciled UCITS/AIF fund data. | LAFV fund data (public API), SIX Swiss Exchange disclosures for LLB/VP Bank, press releases, Handelsregister extracts. |
| LT | Deal-level LT VC/PE coverage, decent on rounds and exits; company financials thin (relies on registry re-sellers). | Press releases (vz.lt, 15min, Baltic Times), Nasdaq Baltic disclosures, JAR filings via aggregators, Startup Lithuania announcements. |
| LU | Strong on PE/VC deals and funds whose vehicles sit in Luxembourg (SCSp/SCA fund entities, holdcos); good GP/LP linkage. LU-specific entity depth is filings-driven and patchy for smaller structures. | RCS/RESA incorporation and capital-change filings, LuxSE bond/fund listings, press (Paperjam, Delano, wire services), fund-manager websites. |
| LV | Baltic VC/PE deal coverage is decent for rounds with press; company financials for LV are weak. Strong on cross-border acquirers of Latvian targets. | Nasdaq Baltic issuer disclosures, press releases, Delfi/DB business press, UR registry data via re-users — we can go to UR open data and Nasdaq Baltic news directly. |
| ME | Sparse: a handful of Montenegrin companies/deals captured via regional M&A press; no systematic register coverage. | Press (SeeNews, IntelliNews, local portals) and advisor league-table submissions; the direct public equivalents are the news feeds and CRPS/MNSE disclosures in our catalog. |
| MT | Covers Maltese companies mainly through gaming/fintech M&A and the occasional VC round; Malta-domiciled holdcos of foreign groups appear frequently. | MBR filings (via aggregators), MSE announcements, international deal press — direct routes: register.mbr.mt, MSE Officially Appointed Mechanism, BusinessNow.mt/Times of Malta. |
| NL | Good NL PE/VC deal and valuation coverage, strong advisor league tables; US-centric bias, thin on NL private debt/NPL and real assets. | Press releases and news (FD, Silicon Canals equivalents), KVK filings for cap-table/financials confirmation, ACM merger decisions, Euronext disclosures — we can go to KVK/ACM/Euronext directly. |
| NO | Good Norwegian VC/PE deal coverage and cap-table estimates; covers Verdane/Norvestor/HitecVision deal histories and Oslo Børs listings/exits. Estimates (valuations, dry powder) are proprietary modeling. | Brreg filings (share capital changes signal rounds), NewsWeb/Euronext disclosures for listed events, NTB press releases, Shifter/E24/DN deal reporting, NVCA and Argentum statistics — we can hit the same primaries directly. |
| PL | PL PE/VC deals, valuations (modeled), advisors on deals; good buyout coverage via advisor networks, patchy seed coverage outside Warsaw. | Company press releases, KRS filings (capital increases as round evidence), UOKiK merger clearances, MSiG notices, news media — KRS Open API + UOKiK decisions DB + MSiG give us the same deterministic backbone at $0. |
| PT | PT PE/VC deal and company coverage via news-driven collection plus registry lookups; good on cross-border buyouts touching Portugal, thinner on domestic small-cap. | Company-act publications (publicacoes.mj.pt), Diário da República, Euronext Lisbon issuer disclosures, and press (ECO, Jornal de Negócios, Jornal Económico) — all directly cataloged here. |
| RO | RO deal coverage driven by press-sourced M&A/PE transactions and advisor league tables; decent on larger buyouts (e.g. former-SIF ecosystem, regional funds), sparse on local mid-market and service-graph entities. | Business press (Ziarul Financiar, Profit.ro, Business Review), law-firm/advisor deal announcements, BVB disclosures — we catalog all of these with working RSS. |
| RS | Covers headline Serbian VC/PE deals (Nordeus/Take-Two, Tenderly, Ominimo) and M&A with named advisors, but long-tail and local mid-market deals are patchy; financials often absent because they don't mine APR. | Press releases, startup media, law-firm deal announcements. Direct routes for us: The Recursive/Netokracija/Startit RSS, eKapija deal reporting, APR financial statements for the actual numbers. |
| SE | Deep on Swedish PE/VC deals, valuations and cap tables; good service-provider tagging (law firms, advisors). | Bolagsverket filings (via data resellers), MFN/Cision/GlobeNewswire press releases, Nasdaq Stockholm/First North listings and prospectuses, SVCA member data — the underlying registry + wire routes are in our catalog. |
| SI | Tracks Slovenian VC/PE deals and startups (historically e.g. Outfit7, Celtra, Zemanta exits); decent deal history, weak on registries, real assets and credit. | Company press releases, startup media, LJSE/SEOnet disclosures, business-register filings. Direct routes for us: SEOnet RSS, AJPES ePRS/JOLP, Startup Slovenia news, Finance.si. |
| SK | Deal- and company-level PE/VC coverage of Slovakia via its global taxonomy; decent on venture rounds touching SK founders, weaker on local mid-market and NPL/credit. | Company registry filings (ORSR/RPO), press wires (TASR/SITA), startup media, firm websites. Direct routes for us: RPO API, RÚZ API, teraz.sk + SITA feeds, SLOVCA roster. |
| XK | Sparse: occasional Kosovo startup rounds and the rare regional PE deal touching Kosovo assets. | Company/investor press releases, international tech media, self-reported profiles; local underlying signals are Telegrafi/Prishtina Insight-type coverage we ingest directly. |

### Crunchbase — seen in 35 markets

Markets: AT, BA, BE, BG, CH, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IS, IT, LT, LU, LV, ME, MK, MT, NL, NO, PL, PT, RO, RS, SE, SI, SK, XK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AT | Broad but shallow AT startup coverage, mostly self-reported profiles plus funding press; unreliable for legal-entity ground truth. | Company self-submissions and English-language tech press; underlying verifiable layer is the same AT press (brutkasten/TT) + Firmenbuch we ingest directly. |
| BA | Thin self-reported BA company profiles; funding rounds patchy and often unsourced. Useful only as a lead list, never as a fact source. | Self-registration + press scraping. Underlying verifiable facts trace to the same local press (Klix, BiznisInfo, Akta) we ingest natively. |
| BE | Broad but shallow Belgian startup/funding coverage, crowd-sourced plus press-parsed; weak entity hygiene versus registry-grade data. | Press releases and startup media; no visible registry integration for Belgium — a gap we close by anchoring on KBO + CBSO. |
| BG | Self-reported Bulgarian company and round data; breadth without verification depth; no registry grounding. | Press releases and self-submissions; verification against portal.registryagency.bg is the differentiator we hold. |
| CH | Broad but shallow Swiss startup funding rounds; investor profiles; weak on institutional/LP layer. | Press releases, startupticker/fintechnews items, self-reported profiles — we ingest the same press layer via the verified RSS feeds above. |
| CZ | Broad but shallow CZ startup coverage; funding rounds crowd-sourced + press-scraped; entity hygiene noticeably worse than Dealroom for CEE. | Startup press (CzechCrunch, Forbes.cz), company self-submissions, ARES-derived registry data via aggregators. Direct route for us: same press RSS + ARES canonical records. |
| DE | Broad but shallow DE coverage, self-reported profiles plus press-sourced rounds. | Press releases and startup media; little registry grounding — our registry-first approach out-depths it structurally. |
| DK | Broad but shallow Danish startup coverage; self-reported, patchy on Danish-language sources. | Press releases, self-registration, GlobeNewswire — nothing exclusive. |
| EE | Broad but shallow Estonian startup coverage, largely self-reported and press-derived; unreliable for round completeness and entity resolution (no registry codes). | Press releases, TechCrunch/ArcticStartup-type media, self-submission. Registry-linked verification is exactly what they lack and we can add via RIK open data. |
| ES | Broad but shallow Spanish startup coverage, self-reported heavy. | Press releases and startup media; little registry depth — our BORME/CNMV route out-depths it. |
| FI | Broad but shallow Finnish startup coverage; self-reported profiles plus press-derived rounds. Frequent gaps and stale data outside VC. | Press releases (STT Info/Epressi wires), company self-reporting, news coverage — nothing they use that we cannot reach via the wires and Yle/HS feeds directly. |
| FR | Broad but shallow FR coverage; rounds from press and self-report, patchy on non-tech alternatives. | Press releases and startup media, Sirene-derived registry data via aggregators — nothing we cannot get from Sirene + RSS feeds directly. |
| GB | Broad but shallow UK startup coverage; self-reported plus press. | Press releases and startup-media announcements (Sifted/UKTN-type sources we ingest directly); little registry depth. |
| GR | Broad but shallow Greek company/round coverage, self-reported and press-driven; frequent gaps and stale entries outside VC. | Press releases, company self-submissions, TechCrunch-style media — the underlying Greek press (verified RSS set above) is directly ingestable. |
| HR | Self-reported Croatian startup/investor profiles; patchy financials, no registry grounding. | Self-submission + news scraping; nothing they have that sudski registar + RGFI + Netokracija don't give us directly. |
| HU | Self-reported + press-driven HU startup coverage; patchy on rounds below Series A and on anything non-tech. Entity data often stale versus the company register. | Company self-submissions and English-language press (BBJ, Daily News Hungary); the authoritative upstream (e-cégjegyzék, e-beszámoló) is public and ours to use. |
| IE | Broad but shallow Irish startup/funding coverage, self-reported profiles plus press scraping; frequent gaps on Irish-registered holding structures. | Company self-submission, press releases, Silicon Republic and international tech media — the underlying public layer is the same press + CRO incorporations we ingest directly. |
| IS | Shallow Iceland coverage — self-reported profiles plus press-scraped rounds for the visible startups (e.g. Kerecis-type stories). | Press releases and English media (Iceland Review, Grapevine, Northstack), founder self-submission. |
| IT | Broad but shallow Italian startup/funding-round coverage, heavily crowd-sourced; weak entity hygiene (duplicates, stale statuses). | Press releases and startup media, self-reported profiles; the underlying verifiable layer is the same innovative-startup register and funding announcements we can ingest directly. |
| LT | Patchy self-reported LT startup profiles; funding data lags Dealroom; no NPL/real-assets/service-graph coverage. | Company self-submissions and TechCrunch-style press — the underlying LT press (15min, vz.lt, Made in Vilnius) is directly accessible. |
| LU | Basic LU startup and funding-round coverage; self-reported and press-driven, weak entity resolution against RCS names; almost no fund/AIFM coverage. | Press releases, Silicon Luxembourg-type media, company self-submissions. |
| LV | Self-reported Latvian startup profiles and funding rounds; patchy amounts, stale after seed stage. | Company self-submissions plus tech press (ArcticStartup, Labs of Latvia) — the underlying press is public. |
| ME | A few dozen self-registered Montenegrin startups; stale and incomplete; no fund/LP layer. | Self-reporting and press releases; no registry ingestion for ME — nothing they have that CRPS + Innovation Fund + ICT Cortex don't provide directly. |
| MK | Thin, self-reported MK startup profiles; funding data patchy and often missing FITR grants. | Founder self-submission and press. Direct route for us: FITR + IT.mk + The Recursive give better primary coverage. |
| MT | Sparse Malta coverage: gaming/crypto companies and a handful of funded startups; heavy reliance on self-reported profiles. | Self-reported data plus press; underlying verifiable layer is MBR company data and news — go direct to register.mbr.mt and the verified RSS feeds above. |
| NL | Broad but shallow NL startup coverage; community-edited, patchy for funding amounts and anything non-tech. | Press releases, company self-submissions, news crawling — nothing NL-specific we can't get from Silicon Canals/Emerce/MT-Sprout feeds + KVK. |
| NO | Patchy Norway coverage skewed to internationally-visible startups; self-reported plus press-scraped rounds; unreliable for entity completeness. | English-language press, TechCrunch/Sifted, company submissions. Its gaps (Norwegian-language press, registry data) are exactly what Brreg + Shifter + DN give us directly. |
| PL | Broad but shallow PL startup coverage; self-reported profiles, frequent gaps in amounts and dates. | Self-reporting and English-language press; little registry grounding — our KRS/ZASI grounding is a direct differentiator. |
| PT | Broad but shallow PT startup coverage, largely self-reported profiles plus funding-round press. | Startup press releases and PT startup media; the underlying verifiable layer is the same publicacoes.mj.pt incorporation/act stream and news RSS we catalog. |
| RO | Self-reported + press-sourced RO startup/VC coverage; shallower than Dealroom locally, weak entity hygiene for RO legal names. | Press releases, TechCrunch-style media, self-submissions; verifiable RO facts trace back to the same startup press we ingest directly. |
| RS | Broad but shallow self-reported Serbian company profiles; funding data inconsistent, no registry grounding, no distressed/credit dimension. | Self-reporting and news scraping. Direct routes: same news feeds plus APR as the corrective registry spine we have and they lack. |
| SE | Broad but shallow Swedish funding-round coverage, English-language bias, self-reported profiles. | Press releases (MFN/Cision/GlobeNewswire), TechCrunch/Breakit-type media, self-submission — the press-wire layer is directly available to us. |
| SI | Crowd-sourced SI startup profiles; patchy funding data, no registry grounding. | Press releases and self-reported profiles. Direct route: same press signals via RTV/N1/Finance RSS plus AJPES for ground truth. |
| SK | Broad but shallow SK coverage; self-reported profiles and funding-round news; unreliable for legal-entity ground truth. | Press releases and self-submission; underlying verifiable layer is ORSR/RPO which we take directly. |
| XK | Thin, self-reported Kosovo startup profiles; funding data patchy and often stale. | Founder submissions and press releases; no registry integration for Kosovo. |

### Moody's / Orbis (Bureau van Dijk) — seen in 7 markets

Markets: CY, DE, IT, LI, MT, NL, XK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| CY | Cyprus company financials, ownership trees and credit data sold into compliance/KYC workflows. | DRCOR registrar records and annual-return (HE32) financial filings, gazette insolvency notices — direct routes: DRCOR eSearch, data.gov.cy, insolvency.gov.cy registers, official gazette. |
| DE | Structured German financials + ownership; standard in corporate finance. | Bundesanzeiger/Unternehmensregister accounts (largely via Creditreform sourcing) and register data — same public originals we ingest. |
| IT | AIDA is the standard academic/PE screening database for Italian company financials (10 yrs of accounts, ownership); licensed product. | InfoCamere financial statements and shareholder filings — originals are obtainable per-document from registroimprese.it/Telemaco. |
| LI | Firmographic records for LI legal entities incl. foundations and Anstalten; strongest commercial coverage of the LI register but resold at high cost. | Handelsregister.li extracts (paid certified extracts), eAmtsblatt commercial-register publications, GLEIF LEI data — the gazette + LEI routes are free to us. |
| MT | Malta company financials and ownership via registry-filings resale; used by compliance teams for Maltese holdcos. | MBR filed accounts and registry extracts (paid documents at source) — direct route is register.mbr.mt document purchase; beneficial-ownership access is legally restricted. |
| NL | Deep NL company financials and ownership chains (useful for OpCo/PropCo and SPV structures); expensive, no signals layer. | KVK deposited annual accounts, EU business registers via BRIS, gazette announcements — all public originals available to us at source. |
| XK | Kosovo entities present with basic registry data and limited financials. | Local information providers aggregating ARBK filings — ARBK is the direct route. |

### OpenCorporates — seen in 5 markets

Markets: AL, CY, LI, LU, MT

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AL | No meaningful Albania jurisdiction coverage; the local AIS-run opencorporates.al (unaffiliated) is the real open-register mirror. | n/a for Albania — use opencorporates.al (AIS) and QKB directly. |
| CY | Full Cyprus company universe republished. | Exactly the DRCOR open-data CSVs on data.gov.cy (organisations/officials/addresses) — we ingest the same primary files at $0, no need to touch their platform. |
| LI | Liechtenstein is effectively absent/limited — the Handelsregister has no open-data licence or bulk route, which blocks their model. Confirms the gap we can fill via gazette-driven ingestion. | Where covered, national registers; for LI no open route exists — the workaround is eAmtsblatt publications + GLEIF. |
| LU | Resell or guide access to LU company-register data; OpenCorporates lists the RCS as register #144. Coverage is raw register-grade with no alternatives-specific enrichment. | LBR RCS portal and open-data API, RESA gazette, data.public.lu CC0 datasets — confirming our direct tier-1 route is viable. |
| MT | Lists Malta as a jurisdiction sourced from the Malta Business Registry; depth/freshness varies given MBR's lack of open data. | MBR public register — go direct to register.mbr.mt (browser-grade) rather than relying on the aggregator. |

### Debtwire — seen in 3 markets

Markets: AL, CY, GB

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| AL | Effectively no Albania coverage; SEE NPL commentary occasionally references Albania at market level only. | Bank of Albania financial stability reports (NPL data), AKF bankruptcy registers — both directly accessible (bankofalbania.org, akf.gov.al), giving us an edge in this niche. |
| CY | Strongest third-party coverage of the Cyprus NPL/distressed market (portfolio sales by Bank of Cyprus, Hellenic, KEDIPES; servicer moves by doValue/Altamira, APS, Themis). | CBC NPL statistics, KEDIPES quarterly progress reports, bank investor-relations disclosures, StockWatch/Financial Mirror reporting — direct routes: kedipes.com.cy, centralbank.cy (browser-fetch), CSE OAM filings. |
| GB | Distressed debt, NPL, restructuring and leveraged-credit intelligence with strong London desk. | The Gazette insolvency notices, Companies House charge registrations (secured lending events), court lists/Find Case Law, administrators' progress reports filed at CH — all directly ingestible. |

### Dun & Bradstreet — seen in 3 markets

Markets: BA, ME, SK

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| BA | Sells BA company credit data inside regional packages; coverage is registry-derived, no alternatives-specific intelligence. Local bisnode.ba domain not verified this session. | APIF/FIA financial statements and the court business registers via licensed bulk arrangements — the same registries we hit at source. |
| ME | WorldBase-level firmographics for Montenegrin entities used for compliance/KYB; no alternatives-specific intelligence. | CRPS register extracts and gazette notices, resold through local partners; the primary source is CRPS which we target directly. |
| SK | Firmographics and scoring for SK within its global graph; commodity registry data resold with analytics. | RPO/ORSR bulk data, RÚZ, gazette — all open. |

### With Intelligence — seen in 3 markets

Markets: CY, GB, MT

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| CY | Cyprus ManCos and hedge/liquid-alt managers within their EU fund-manager datasets. | CySEC CIF/AIFM/UCITS lists (Excel downloads) and fund press — direct route: cysec.gov.cy entity pages. |
| GB | Hedge fund, private-credit and asset-owner (LP) data; events-driven; strong UK/EU institutional coverage. | FCA register, US SEC ADV filings, pension-scheme annual reports and local-authority committee documents — the UK LGPS committee-paper route is public and underused. |
| MT | Covers Malta as a hedge-fund servicing domicile (ManCos, administrators, PIF regime commentary); largely editorial plus manager-reported data. | MFSA register + circulars, FinanceMalta materials, service-provider announcements — all reachable directly via the sources catalogued above. |

### Bloomberg — seen in 2 markets

Markets: CY, LI

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| CY | CSE-listed issuers, prices and corporate actions; minimal alternatives depth for CY. | CSE market data, OAM issuer filings, CySEC issuer register — direct routes: cse.com.cy listing/announcement pages and publicoam.cse.com.cy. |
| LI | Cover the two listed LI banks (LLB, VP Bank) and LI-domiciled fund NAVs/ISINs; no private-market or foundation depth. | SIX Swiss Exchange market data, LAFV fund data/API, issuer IR pages, FMA announcements. |

### CB Insights — seen in 1 markets

Markets: LT

| Market | Coverage observed | Public sources they draw on |
|---|---|---|
| LT | Minimal Lithuania coverage; occasional fintech-market mentions only. | Invest Lithuania fintech reports, Bank of Lithuania licensing statistics — both public. |

---

## 3. Regional players (multi-country)

The ones that matter most for the CEE/SEE depth thesis — these, not the
global incumbents, are the incumbents in the markets Continuum leads with.

### EMIS — AL, HU, ME, MK, PL, XK

- **AL** — Deepest commercial coverage of Albania among global providers: company financials, industry reports, news aggregation. Subscription-only.
  - _Public sources:_ QKB commercial-register filings (annual financial statements), INSTAT statistics, Bank of Albania data, Monitor.al and other local press — all of which we can reach directly via qkb.gov.al, opencorporates.al, instat.gov.al, bankofalbania.org, monitor.al.
- **HU** — Aggregates Hungarian macro, sector reports, company financials and local news for emerging markets; decent sector-level context, shallow on fund-level alternatives.
  - _Public sources:_ KSH statistics, MNB statistics/Aranykönyv, local press licensing (Portfolio, VG), registry-derived financials — the public layers (KSH, MNB, filings) are directly accessible to us.
- **ME** — The deepest commercial coverage of Montenegro among global providers: company financials, industry reports, macro data, and news monitoring for the ME market.
  - _Public sources:_ CRPS company registrations, statutory financial statements filed with the Revenue and Customs Administration, MONSTAT statistics, CBCG data, and local media (Vijesti, MINA, Pobjeda) — all of which we can go to directly.
- **MK** — The deepest commercial company-financials coverage of MK: full-company financial statements, industry reports, news aggregation. Paywalled B2B product.
  - _Public sources:_ CRM annual accounts (paid distribution), State Statistical Office data, MSE/SEINet disclosures, local press (Kapital, Faktor). All of these are directly accessible to us: CRM paid channel, stat.mk PX-Web API, MSE RSS trio.
- **PL** — CEE company financials, industry reports, news aggregation for Poland; strong financial-statement depth, sold to banks/advisors.
  - _Public sources:_ KRS financial statements (eKRS repository of financial documents), GUS statistics, PAP wire — all public: the KRS financial-documents repository (ekrs.ms.gov.pl/rdf) is free.
- **XK** — Covers Kosovo company financials, macro and sector reports as part of its SEE package.
  - _Public sources:_ ARBK registry data, ATK, ASK statistics, CBK statistics and local media — every one of these is catalogued directly above.

### SeeNews — AL, BG, MK, XK

- **AL** — Regional SEE wire with steady Albania business coverage and an annual company ranking that includes Albanian corporates.
  - _Public sources:_ QKB/registry financials, INSTAT, Bank of Albania, ALSE announcements, local press — direct routes exist for every one.
- **BG** — Regional SEE business newswire plus data products (TOP 100 SEE ranking, company profiles); strong deal/energy/banking reporting for Bulgaria; partly paywalled.
  - _Public sources:_ National trade registers and annual financial statements, stock-exchange disclosures, own reporting — the CR annual accounts and BSE/X3News feeds are open to us directly.
- **MK** — Regional rankings and company intelligence including MK's largest companies by revenue; M&A and energy-deal newsflow.
  - _Public sources:_ CRM/SSO financials, MSE disclosures, company reports, own reporting. Direct routes for us: same registries plus MSE /en/rss/seinet.
- **XK** — SEE regional business newswire and company-data products include Kosovo corporate news and TOP-100-SEE style rankings.
  - _Public sources:_ Local media monitoring, CBK data, company disclosures, ARBK — direct routes catalogued.

### CompanyWall Business — BA, HR, RS

- **BA** — VERIFIED local/regional company-data provider: ~87k companies, 92k entrepreneurs; financial statements, credit ratings, account blockades, bankruptcy proceedings, ownership and tax debt. Paid tiers 41-1,135 KM. The strongest local company-financials competitor.
  - _Public sources:_ Explicitly cites FIA (FBiH), APIF (RS) and the Brcko Finance Directorate plus court registers — exactly the tier-1 registries we catalog for direct ingestion (fia.ba, apif.net, bizreg.pravosudje.ba).
- **HR** — Regional (HR/RS/BA/ME/SI) company data and credit scores; strong on cross-border SEE entity linkage, nothing on funds/alternatives.
  - _Public sources:_ Same public trio: sudski registar, Fina RGFI, official gazettes/insolvency boards across the region.
- **RS** — Local company-credit data for RS + region: 128k companies, financials, blocked accounts, court/insolvency data, ownership links, tax debt. Strong deterministic base, zero alternatives-specific intelligence (no fund/GP/LP layer, no signals).
  - _Public sources:_ Visibly: APR company register + financial statements, NBS blocked-accounts (prinudna naplata), court/insolvency registers, tax-debtor lists. All of these are public and cataloged above for direct ingestion.

### CRIF — CZ, IT, SK

- **CZ** — LOCAL. The dominant CZ firmographic/credit-data provider: full company universe, financials from filed statements, payment/insolvency flags, ownership links. This is what CZ banks and NPL buyers actually use for counterparty data.
  - _Public sources:_ ARES + obchodní rejstřík bulk data (dataor XML), sbírka listin financial statements, ISIR insolvency feed, Obchodní věstník, VVZ/registr smluv. Every underlying source is public and in our catalog — Cribis' moat is parsing scale, not exclusive access.
- **IT** — Credit bureau + business information on Italian companies (Margò/SkyMinder products); strong on credit events and ownership chains.
  - _Public sources:_ Same InfoCamere registry ingest, Banca d'Italia intermediary lists, insolvency/PVP auction data.
- **SK** — Credit reports and company monitoring on Slovak entities; strong on payment discipline and linkages; paid, no alternatives framing.
  - _Public sources:_ ORSR/RPO, RÚZ financial statements, Obchodný vestník, court/insolvency registers (REPLIK) — direct public routes available to us.

### eKapija — BA, RS

- **BA** — Regional business-news + tender platform with a BiH edition; strong on investment-project announcements and public tenders; bot-blocks scrapers (403).
  - _Public sources:_ ejn.gov.ba tenders, municipal/entity government announcements, company press releases — we ingest those origins directly, respecting their no-scrape posture.
- **RS** — Both a news source and a paid company-data/tender-intelligence provider; strongest local deal/tender/real-estate signal coverage in Serbian. Bot-blocked to our fetcher (403).
  - _Public sources:_ Own journalism plus APR data and the public procurement portal. We ingest headlines/links per copyright discipline and go directly to APR + jnportal for the underlying data; never scrape their paid database.

### Monterey Insight — LU, MT

- **LU** — The Luxembourg Fund Report — the reference local dataset on fund service providers: market shares of fund administrators, custodians/depositaries, auditors, legal advisers, ManCos per fund. Exactly our category-6 service graph.
  - _Public sources:_ Fund annual reports and prospectuses (filed via RCS/LuxSE), CSSF UCI/AIF lists, LuxSE official list — all public and directly harvestable by us.
- **MT** — The most Malta-specific competitor: annual Malta Fund Report ranking fund administrators, custodians, auditors, legal advisers and ManCos by assets serviced — exactly our Institutional Service Graph for Malta.
  - _Public sources:_ Direct surveys of service providers layered on the MFSA register universe — the public skeleton (who is licensed as administrator/custodian/ManCo) is reproducible from fsr.mfsa.mt + ESMA/EIOPA registers + MFSA annual report annexes.

### North Data — DE, LI

- **DE** — The benchmark local player: company graph, financials, register-event timeline for all German entities; no alternatives-specific classification.
  - _Public sources:_ Proves exactly which public sources are machine-usable at scale: Handelsregister + register announcements, Bundesanzeiger annual accounts, Insolvenzbekanntmachungen — go to these directly.
- **LI** — DACH-focused register intelligence; Liechtenstein coverage limited/unclear (its core is German-style register publications). Not a meaningful LI moat.
  - _Public sources:_ Official gazette publications (for LI that would be the eAmtsblatt) and register indices — both directly accessible.

### TTR Data — ES, PT

- **ES** — VERIFIED live. The Iberian M&A/PE/VC/capital-markets deal database; claims 3x more local data than globals; monthly league tables.
  - _Public sources:_ BORME acts, CNMV IP/OIR disclosures, BME/MARF listings, insolvency edicts, law-firm deal announcements — every one a public source we catalog above.
- **PT** — Iberia-specialist M&A/PE/VC deal database — arguably the deepest deal coverage for Portugal specifically, including mid-market and advisor league tables.
  - _Public sources:_ Registry act publications (publicacoes.mj.pt), Diário da República, CMVM/Euronext issuer filings, CITIUS insolvency publicity, law-firm deal announcements and Iberian legal press (Iberian Lawyer).

---

## 4. Single-market local players

Domestic providers, registry resellers, and national business-information
houses. Individually small; collectively they are what a buyer in that
market compares Continuum against.

**AL**

- **bne IntelliNews** — Dedicated Albania country section: macro, banking, energy, occasional deal coverage. Partially free.
  - _Public sources:_ Bank of Albania statistics/press, INSTAT, government ministries, local media (Monitor, Tirana Times) — all directly accessible.
- **CEE Legal Matters** — Covers the Albanian legal/deal market (firm mandates, energy and finance transactions) — more a signal publisher than a data platform.
  - _Public sources:_ Law-firm press releases and self-reported deal announcements — we can ingest the same announcements from its free site.

**AT**

- **Creditreform Österreich** — Same category as KSV1870: credit reports, insolvency trend statistics (their semi-annual insolvency studies are themselves a public signal worth monitoring).
  - _Public sources:_ Firmenbuch, Ediktsdatei, GISA, financial statements filed to Firmenbuch — all reachable directly.
- **Dun & Bradstreet Austria** — Commercial firmographics and marketing data on AT companies; FirmenABC/HEROLD are ad-financed directories with SEO-visible company pages.
  - _Public sources:_ Firmenbuch clearing-house data, WKO Firmen A-Z, GISA — the free WKO and GISA layers give us equivalent breadth at $0.
- **KSV1870** — 640,000 AT companies with payment history, insolvencies, register data; membership/paywall model; the local ground-truth standard for creditworthiness and insolvency stats.
  - _Public sources:_ Firmenbuch (clearing-house feed), Ediktsdatei/Insolvenzdatei (open!), GISA, EVI gazette — every underlying register is public and independently ingestable by us; their proprietary layer is payment-experience data.
- **Wirtschafts-Compass** — Aggregates Firmenbuch, Grundbuch, GISA, Vereinsregister, WiEReG, insolvencies and balance sheets into one paid platform with a real API (api.wirtschaftscompass.at); from EUR 24/yr entry tier. The closest local analogue to an entity-data backbone.
  - _Public sources:_ Exactly the tier-1/3 registers in this catalog (Firmenbuch, Grundbuch, GISA, ZVR, Ediktsdatei, EVI) — validates our source map; we ingest the same registers directly rather than their platform.

**BA**

- **Akta.ba** — Beyond news, runs a company-registry search and a tender-intelligence product; good tender/award tracking and industry profit-leader rankings.
  - _Public sources:_ e-Nabavke procurement portal (ejn.gov.ba), official gazettes, court business registers, FIA/APIF financials — all direct-access for us.
- **Bloomberg Adria** — Markets data + journalism for the Adria region incl. BA; strong on listed securities, macro and banking, not on private funds.
  - _Public sources:_ SASE/BLSE market data feeds, CBBH statistics, entity statistics institutes — all public and cataloged here.
- **LRC BIS** — Long-standing Bosnian credit bureau / business-intelligence house (credit reports, sector analyses, bank-grade scoring) sold into local banks. Its historical domain lrcbis.com did NOT resolve during this session — current web presence needs re-verification, but the firm is the incumbent local BI provider.
  - _Public sources:_ FIA and APIF financial statements, court/business registers, CBBH credit-registry-adjacent data — again the same public tier-1/2 sources we access directly.

**BE**

- **Bizzy** — Free/freemium Belgian company profiles with AI descriptions, real-time updates and sales-intelligence agent; consumer-grade UX, no alternatives focus.
  - _Public sources:_ KBO/CBE, NBB annual accounts, Staatsblad, plus press/social/vacancy scraping — public underlying registers are the same tier1 set we catalog.
- **Companyweb** — Incumbent Belgian credit-information provider (scores, payment behavior, alerts) used widely by finance teams; strong on distress signals.
  - _Public sources:_ KBO/CBE, NBB CBSO financials, RegSol/court insolvency data, Staatsblad publications — the distress layer maps to our tier3 sources.
- **GraydonCreditsafe Belgium** — Credit risk and compliance data on Belgian companies; proprietary payment-experience pool on top of registry data.
  - _Public sources:_ KBO/CBE open data, NBB annual accounts, gazette publications, bankruptcy statistics (Statbel/RegSol-derived).
- **Moody's Bureau van Dijk** — Comprehensive Belgian & Luxembourg financials/ownership product (BvD is Belgian-origin); the institutional standard for BE company financial screening.
  - _Public sources:_ NBB CBSO filings (bulk), KBO/CBE registry, Staatsblad events — again fully public underneath.
- **openthebox** — The strongest local benchmark: ownership graphs, directors, and financials across 3M+ Belgian entities with API and data feeds; owned by Mediafin (De Tijd/L'Echo). Company-data centric, not alternatives-taxonomy aware.
  - _Public sources:_ Explicitly: KBO/CBE for status/directors, NBB CBSO annual accounts, Belgisch Staatsblad publications, UBO register (as obliged-entity access). All except UBO are directly open to us.
- **Staatsbladmonitor.be** — Free Belgian monitoring service over gazette publications with company profiles, alerts and a free API tier (100 req/day) — verified by fetch. Proof that Staatsblad+KBO+CBSO can be productized cheaply.
  - _Public sources:_ Belgisch Staatsblad Rechtspersonen annex, KBO/CBE, NBB annual accounts.
- **Trends Top** — Directory/rankings of top Belgian companies with financials and sector tops; verified redirect trendstop.be → trendstop.knack.be. B2B prospecting oriented.
  - _Public sources:_ NBB CBSO annual accounts and KBO identifiers, packaged into rankings.

**BG**

- **APIS** — Legal-information systems plus company-data product (Apis Register+) built on official registers; the standard tool of Bulgarian lawyers; entity data strong, no investment-intelligence layer.
  - _Public sources:_ Commercial Register bulk data (data.egov.bg), State Gazette, court acts — all public and directly ingestible.
- **Ciela Norma** — Competing legal/registers information provider (Ciela Info) with company dossiers and insolvency tracking; same registry substrate, legal-market oriented.
  - _Public sources:_ Commercial Register, State Gazette, e-justice court acts — identical public substrate.
- **Papagal.bg** — Free web lookups over Commercial Register extracts (ownership, related-party graphs); popular with journalists; prove the CR bulk data is programmatically consumable, but offer no analytics or alternatives focus.
  - _Public sources:_ Periodic Commercial Register bulk extracts from the national open data portal (data.egov.bg) — confirming that bulk route as our tier-1 pipeline.

**CH**

- **Creditreform Switzerland** — Largest creditor-protection association; unique angle: covers sole traders and individuals not in the commercial register.
  - _Public sources:_ SOGC bankruptcy/debt-enforcement publications, commercial register, plus member-contributed ledger experience (proprietary).
- **CRIF Switzerland** — Credit risk, solvency and address data on Swiss companies; 30k+ business customers; strong on payment-behaviour data (proprietary).
  - _Public sources:_ Zefix/SOGC register and gazette data plus debt-enforcement publications; proprietary payment experience pools are not replicable and not needed for our use case.
- **Moneyhouse** — The dominant Swiss company-information platform: 600k+ companies, register excerpts, management, SOGC monitoring, credit checks. B2B API offering.
  - _Public sources:_ Built almost entirely on public primary sources we can hit directly: Zefix/cantonal commercial registers and the SHAB API (search results confirm SHAB publications are retrieved via a Moneyhouse-operated API v2 arrangement). Do NOT scrape Moneyhouse; go to Zefix + shab.ch.
- **Swiss Fund Data** — Authoritative fund reference data for CH-authorised funds, NAVs, documents; operated by SIX Financial Information.
  - _Public sources:_ FINMA authorisation lists + fund providers' own filings. ToS ban systematic extraction — we use the FINMA source lists directly instead.

**CY**

- **IMH group** — Local company rankings, sector directories and awards content (e.g. IN Business Top companies) — reputational rather than registry-grade.
  - _Public sources:_ Own reporting plus company submissions and registrar data; underlying public layer is DRCOR + CSE + CySEC, which we ingest directly.
- **StockWatch** — Local benchmark for CY market data, bank/finance news and company coverage; operates a paid data service alongside the news site.
  - _Public sources:_ CSE feeds and announcements, CySEC decisions, company disclosures, CBC statistics — all public and directly reachable by us.

**CZ**

- **BizMachine** — LOCAL Czech firmographic/predictive-signals provider (growth scoring, tech detection) used by banks/telcos for prospecting. No alternatives focus but demonstrates what is derivable from CZ open registries.
  - _Public sources:_ ARES/RES, commercial register filings, procurement + contract-register open data, web crawling. Direct-source equivalents fully covered in our catalog.
- **Dun & Bradstreet Czech** — LOCAL/global hybrid. Firmographics, scoring, ownership trees (incl. cross-border via D&B WorldBase). Used for KYC/AML and supplier risk; no alternatives-specific intelligence.
  - _Public sources:_ Same public spine: ARES, OR + sbírka listin, ISIR, Obchodní věstník, plus proprietary trade-payment data (not public — we don't need it for entity mapping).
- **Hlídač státu** — LOCAL civic-tech aggregator, free/open with API: contracts, subsidies, insolvency, sponsor/political links across CZ entities. Not a competitor commercially but the best proof-of-concept of CZ open-data fusion; useful as a cross-check layer.
  - _Public sources:_ Registr smluv API, VVZ open data, ISIR, ARES, subsidy registers (DotInfo/CEDR) — all public; its own API is free-key gated (401 without token).
- **Merk.cz** — LOCAL sales-intelligence layer over the CZ registry universe: firmographics, contacts, technographic/web signals, insolvency and turnover estimates. B2B-sales oriented, not investment-grade.
  - _Public sources:_ ARES API, dataor dumps, ISIR, registr smluv, VVZ, company websites. All public and cataloged above.

**DE**

- **Barkow Consulting** — German VC/banking market statistics frequently cited by press.
  - _Public sources:_ Bundesbank statistics, Bundesanzeiger filings, KfW/association data — assembled from the public stack, showing the analysis layer is buildable at $0 data cost.
- **Creditreform** — Credit data on the full German company universe; payment behavior is proprietary.
  - _Public sources:_ Handelsregister, Bundesanzeiger financial statements, insolvency announcements — plus proprietary field data we don't need.
- **FINANCE Deal-Datenbank** — German-speaking PE/M&A transaction lists and newsletters; strong mid-cap recall.
  - _Public sources:_ Press releases, advisor submissions, JUVE/FINANCE reporting — signals-press tier, no registry moat.
- **startupdetector** — Weekly German startup funding/incorporation reports sold to VCs.
  - _Public sources:_ Built almost entirely on Handelsregisterbekanntmachungen (new GmbH/UG registrations, capital increases) — confirms that announcement stream alone yields funding signals pre-press.

**DK**

- **BiQ** — Person-company network data (BiQ, used by journalists) and firmographic/credit data (NN/D&B); B2B sales orientation, no alternatives focus.
  - _Public sources:_ CVR roles/ownership data, Statstidende, published accounts — all open.
- **cvr.dev** — Thin commercial/free API wrappers over CVR for developers; validation that direct ERST Elasticsearch access is the canonical route (we should go direct, not through wrappers).
  - _Public sources:_ ERST's distribution.virk.dk Elasticsearch and regnskabsdata feeds.
- **Experian Danmark** — Consumer/business credit and the RKI debtor register; closed proprietary negative-data, not replicable and not our lane.
  - _Public sources:_ Own proprietary debtor registrations plus CVR/Statstidende; only the public layers (CVR, Statstidende) are accessible to us — do not touch the proprietary register.
- **Lasso** — Danish company-intelligence platform (monitoring, credit, networks) built almost entirely on open registry data; strong CVR/network UX, no alternatives-specific taxonomy.
  - _Public sources:_ CVR Elasticsearch distribution, published XBRL regnskaber, Statstidende notices — precisely the open pipes we catalogued; proof the primary sources support a full product.
- **Proff.dk** — Free Danish company lookup with financials and roles; consumer-grade, no alternatives lens.
  - _Public sources:_ CVR + published annual reports (XBRL). Same open sources.
- **The Hub** — ~11,000 Nordic startups with funding stage, jobs, investors; the de-facto free Danish startup directory. Not a competitor for funds/credit/real assets.
  - _Public sources:_ Startup self-registration + CVR verification. It is itself a public directory (JS app) — discovery aid only, re-verify against CVR.

**EE**

- **Creditinfo Eesti** — Official credit bureau; company reports, payment-default register (maksehäireregister), scoring. The payment-default ledger itself is proprietary member-contributed data (banks report into it) — not replicable from public sources; everything else is registry-derived.
  - _Public sources:_ e-Business Register, EMTA open data, Ametlikud Teadaanded; proprietary layer is bank-reported defaults.
- **Funderbeam** — Estonian-founded funding/secondary marketplace; carries data on its own listed private companies and syndicates — a niche primary source for its own deals rather than a coverage competitor.
  - _Public sources:_ Own listings and issuer disclosures; underlying entities verifiable via ariregister.
- **Inforegister** — Estonian credit-risk and company-intelligence portal: payment defaults, tax arrears, network graphs of boards/owners, distress ratings. Effectively a local moat on registry-derivative analytics; no alternatives-investment framing.
  - _Public sources:_ e-Business Register open data + documents, EMTA open data (tax arrears, paid taxes), Ametlikud Teadaanded insolvency notices, court decisions — 100% public inputs we ingest directly under the same open licenses.
- **Scorestorybook** — Company scoring, media-mention monitoring and B2B prospecting on Estonian companies; strong entity-resolution over local media.
  - _Public sources:_ e-Business Register open data, EMTA quarterly data, Estonian online media (Äripäev/Delfi/Postimees headlines), Ametlikud Teadaanded.
- **Teatmik.ee** — Free lookup layer over the commercial register incl. beneficial owners and annual-report figures; no analytics. Demonstrates how complete the free RIK data is.
  - _Public sources:_ e-Business Register open data and documents exclusively.

**ES**

- **Axesor** — Ratings, company data and risk scores on Spanish companies; MARF rating agency presence.
  - _Public sources:_ BORME, deposited accounts via Registradores, RPC insolvency register, court/gazette edicts.
- **Brainsre** — Spanish real-estate data/analytics platform + free news arm (brainsre.news, verified RSS).
  - _Public sources:_ Catastro open data, Registradores property data, SOCIMI filings on BME Growth, land-registry statistics — the public RE layer we can also tap.
- **Capital & Corporate** — VERIFIED live. Spanish M&A/PE deal intelligence + yearbook + magazine; strong advisor/deal attribution.
  - _Public sources:_ Deal press releases, advisor submissions, BORME confirmations, SpainCap directory.
- **Iberinform** — Company risk data platform on Spain/Portugal.
  - _Public sources:_ Same public base: BORME, Registro Mercantil accounts, RPC.
- **Informa D&B** — Full Spanish company universe with financials, scores, UBO-adjacent linkage; the de-facto registry reseller.
  - _Public sources:_ BORME open data + paid Registro Mercantil deposited accounts + BOE — their entire base layer is public; we can replicate the event layer free via the BORME API, while per-company financials remain paid at the registry.
- **Webcapitalriesgo** — VERIFIED live. Long-run Spanish VC/PE statistics, reports and 30k-article news archive; the historical-series reference for the market.
  - _Public sources:_ SpainCap surveys, CNMV ECR register, self-collected deal press — its published aggregates are citable context.

**FI**

- **Alma Talent Tietopalvelut** — Kauppalehti-branded company information, financials, decision-maker data and TE-500 style rankings; deeply integrated with Alma's business media. Commercial; do not scrape.
  - _Public sources:_ PRH trade register, filed financial statements, official announcements (gazette/insolvency) — same public originals we ingest via avoindata.prh.fi and the insolvency open data.
- **Finder.fi** — Free-tier company lookup (financials snapshots, Business IDs, officers) used widely by Finnish professionals; consumer-grade, no alternatives angle.
  - _Public sources:_ PRH/YTJ open data and filed financials — identical originals to avoindata.prh.fi.
- **Inderes** — Community equity research covering nearly the whole Nasdaq Helsinki main list + First North: estimates, recommendations, insider-trade tracking. Listed-equity only, not private alternatives — but the best public window on Finnish listed RE funds/REIT-likes.
  - _Public sources:_ Nasdaq Helsinki company disclosures (GlobeNewswire/STT wires), company IR pages, FIN-FSA prospectus register — all direct-access sources in our catalog.
- **KTI Property Information** — The authority on Finnish institutional real estate: transaction volumes, rental indices, special investment fund (open-ended RE fund) reviews. Subscription product with meaningful free annual reports.
  - _Public sources:_ Own proprietary surveys (not replicable), plus public deal press releases and FIN-FSA special-investment-fund registrations — the public slice is reachable via FIN-FSA registers and the release wires.
- **Suomen Asiakastieto** — The dominant local company & credit information provider: credit ratings, payment defaults, financials, real-estate/condo data, ESG scores. Covers ALL Finnish companies — the credit/distress layer global platforms lack. Commercial product; do not scrape.
  - _Public sources:_ PRH trade register + financial statements, Legal Register Centre insolvency register, enforcement (ulosotto) data, Vero tax data, court payment-default records — the public originals are avoindata.prh.fi, maksukyvyttomyysrekisteri.om.fi and Vero open data, all cataloged above.
- **Vainu** — Nordic sales-intelligence over 5M+ companies (FI/SE/DK/NO): firmographics, financials, group structures, technographics, change signals. Strong entity backbone, no alternatives-specific intelligence.
  - _Public sources:_ States 'official sources' + financial statements — in practice PRH/YTJ open data and filed financials (avoindata.prh.fi APIs), plus company websites. We reach the same registries directly at $0.

**FR**

- **Altares** — Credit risk, payment behavior, firmographics for the full FR company universe; sell scores not intelligence.
  - _Public sources:_ Greffes/Infogreffe filings, BODACC, Sirene, annual accounts from RNE; their proprietary layer (payment data) is not public — the registry layer underneath is.
- **CFNEWS** — THE French deal reference: near-exhaustive mid-market M&A/LBO/venture and real-estate deal tables, advisor league tables, nominations; subscription DB.
  - _Public sources:_ Own journalism plus BODACC/greffe filings, actulegales JAL announcements, advisor deal submissions and press releases; its free RSS layer (18 feeds) is itself a usable public signal source for us.
- **Pappers** — Free full-text French company intelligence (filings, accounts, beneficial-owner history where public); has become the default FR company lookup.
  - _Public sources:_ Built ENTIRELY on public open data — INPI RNE API/SFTP, BODACC open data, BALO, Infogreffe documents, Sirene — the clearest proof-of-route: everything Pappers shows, we can ingest from the same open endpoints at $0.
- **Societe.com** — Mass-market company lookups, financials, legal events; ad/freemium model.
  - _Public sources:_ Sirene, RCS/Infogreffe, BODACC — same open stack as Pappers.
- **Xerfi** — Sector research studies (incl. asset management, real estate, NPL-adjacent sectors); analysis product, not entity data.
  - _Public sources:_ INSEE statistics, Banque de France/Webstat series, annual accounts from RNE — context sources we already catalog.

**GB**

- **Beauhurst** — The key UK-native competitor: tracks every UK high-growth company incl. UNANNOUNCED equity rounds, at 8-figure company coverage.
  - _Public sources:_ Their visible moat is systematic parsing of Companies House filings — SH01 (allotment of shares) forms reveal fundraises never press-released, plus PSC data, accounts and The Gazette. Every one of those inputs is free via the CH API/bulk products; this is the single most instructive public-source bl
- **FullCircl** — Commodity company-data layers over the registry; not alts-specific but show the data plumbing.
  - _Public sources:_ Companies House bulk products and streaming API, Gazette feeds, accounts iXBRL — confirming those are the canonical $0 routes.

**GR**

- **ICAP CRIF** — Deepest Greek firmographics: credit ratings, financial statements, sector studies, business directories covering the whole corporate universe incl. servicers and real-estate companies. Paid; the de facto local Preqin-for-firmographics.
  - _Public sources:_ GEMI/businessportal filings and financial statements, FEK (et.gr) corporate acts, court/protest data, ELSTAT — GEMI publicity search, search.et.gr and ELSTAT are all directly accessible public feeds.
- **Infobank Hellastat** — Greek business information and sector risk reports; company financials and demographics. Similar public underpinnings to ICAP at smaller scale.
  - _Public sources:_ GEMI filings, FEK, ELSTAT business registers — all direct.
- **Tiresias** — Bank-owned credit bureau: defaults, bounced cheques, credit profiles. Not publicly accessible (bank/consent-gated) — relevant as the reason public insolvency signals must come from solvency.gov.gr, Diavgeia and FEK instead.
  - _Public sources:_ Court registries, protested bills, bank submissions — the public slice we can reach directly is the Electronic Solvency Register and FEK insolvency notices.

**HR**

- **Fina info.BIZ** — Fina's own commercial product over its RGFI monopoly data: financials, sector analytics, rankings. The benchmark for what 'complete Croatian financials' means.
  - _Public sources:_ Fina's internal RGFI + payment-transactions data; the public free route to the same statements is RGFI javna objava (50 docs/day).
- **Fininfo.hr** — Local company-information portal: financial statements, blocked-account status, insolvency flags for HR companies. Volume play, no investment-industry structuring.
  - _Public sources:_ Fina RGFI, Fina blocked-accounts data, sudski registar, e-Oglasna bankruptcies — all direct-access public sources.
- **Poslovna.hr** — Deep local company-data coverage: financials, scores, ownership links for the full Croatian corporate register. No alternatives/fund lens at all.
  - _Public sources:_ Fina RGFI financial statements, sudski registar, Narodne novine oglasni dio, court/insolvency notices (e-Oglasna) — every input is public and catalogued above.

**HU**

- **Céginfo.hu** — Second major local company-data provider; similar registry-derived offering (company data, financials, monitoring, risk flags). Do not scrape.
  - _Public sources:_ Same state pipeline: Céginformációs Szolgálat bulk data, Cégközlöny, e-beszamolo, NAV lists.
- **Dun & Bradstreet Hungary** — Registry-derived firmographics, credit ratings, UBO-adjacent linkage analysis for Hungary within a global graph. Strong corporate-hierarchy data; nothing alternatives-specific.
  - _Public sources:_ State registry bulk data, e-beszamolo filings, NAV databases, gazette publications.
- **Opten** — The leading Hungarian company-information provider: full registry mirror, financials, litigation/insolvency flags, ownership networks, credit scores. This is the local benchmark for entity depth. Do not scrape.
  - _Public sources:_ Bulk registry data purchased from the Céginformációs Szolgálat, Cégközlöny gazette feed, e-beszamolo financial statements, NAV public databases, court/insolvency publications — every underlying source is public or purchasable from the state directly.

**IE**

- **CRIF Vision-net** — The dominant Irish company-information provider: full CRO mirror, credit scores, director networks, daily judgments/insolvency alerts. This is the local benchmark for the entities side.
  - _Public sources:_ CRO bulk data and filings, Iris Oifigiúil (receiverships), CRO Gazette (strike-offs/liquidations), court judgments and registered judgments, ISI registers — every one available directly: opendata.cro.ie, irisoifigiuil.ie, courts.ie, gov.ie ISI registers.
- **Kyckr** — Irish-founded KYB provider reselling live registry lookups across 120+ registers incl. CRO; relevant as proof the CRO Open Services API supports commercial real-time products.
  - _Public sources:_ CRO Open Services API directly — the same keyed API route documented at cro.ie/services-and-help/access-to-cro-data/.
- **SoloCheck** — Consumer-grade Irish company reports and director searches; lighter than Vision-net but shows what a lean CRO-derived product looks like.
  - _Public sources:_ CRO open data + document images, CRO Gazette notices — direct route: opendata.cro.ie.
- **TechIreland** — Non-profit open database of Irish startups/innovation (companies, funding, female-founder reports). Semi-open — closest local analogue to a public startup graph; partner data source for Dealroom.
  - _Public sources:_ Community submissions, press announcements, Enterprise Ireland/IDA announcements — all public; we can ingest the same press layer (Silicon Republic, RTÉ, The Currency feeds verified above).
- **The Currency** — Not a database but the highest-signal Irish deals/courts/funds journalism; effectively the qualitative competitor for 'what's happening in Irish alternatives'.
  - _Public sources:_ Court filings and hearings (Commercial Court), CRO documents, Iris Oifigiúil, interviews — underlying registers all in our catalog; their RSS feed (verified) is itself an ingestible headline signal.

**IS**

- **Creditinfo** — Credit reports, default registers, company monitoring for Iceland; subscription. Strong on private-debt/NPL-relevant signals (defaults, insolvency).
  - _Public sources:_ RSK company & annual-accounts registers, Lögbirtingablað bankruptcy/enforcement notices, district-court data — direct public routes cataloged above.
- **Keldan** — Icelandic companies, financial statements, ownership/management, market data, legal-gazette monitoring; freemium/subscription. The de-facto local benchmark for entity data UX. Site is a JS SPA (returned only shell to fetchers).
  - _Public sources:_ Skatturinn fyrirtækjaskrá + ársreikningaskrá, VAT register, Lögbirtingablað notices, Nasdaq Iceland market/disclosure data, property/vehicle registers — all cataloged above and reachable directly.

**IT**

- **BeBeez Private Data** — THE local benchmark: Italian private equity, venture, private debt, NPL and M&A deal database built on 10+ years of BeBeez reporting; subscription product, do not scrape.
  - _Public sources:_ Own newsroom reporting plus Registro Imprese filings, Borsa Italiana notices, Gazzetta Ufficiale, court/insolvency announcements — all public routes we can go to directly.
- **Cerved** — Dominant Italian company-information and credit-risk group (also a major NPL servicer via Cerved Credit Management); full financials on all Italian companies.
  - _Public sources:_ Bulk licensed InfoCamere/Registro Imprese feed (bilanci, cariche, soci), Gazzetta Ufficiale and court/insolvency records, protesti registers — the register-grade layer is reachable via Telemaco, just paid.
- **Leanus + local observatories** — Leanus: Italian financial-statement analytics platform; the PoliMi startup/VC observatories and AIFI/PwC and VeM reports are the reference market statistics for Italian VC/PE — free PDF layers we can cite.
  - _Public sources:_ Registro Imprese accounts (Leanus), AIFI member surveys, innovative-startup register, public deal press — the free report PDFs themselves are usable signal sources.

**LI**

- **fundinfo** — Distributes documents/NAVs for LI funds (KIDs, prospectuses) — overlaps directly with the LI fund universe.
  - _Public sources:_ Fund documents supplied by LI ManCos; the same universe is publicly enumerable via the LAFV fund list + API, which is LI's official fund publication organ.

**LT**

- **Creditinfo Lietuva** — LOCAL. Incumbent credit bureau; company reports, scoring, debtor registry; LBA associate member.
  - _Public sources:_ JAR, Sodra, courts, plus proprietary bank payment data (not replicable, and we don't need it).
- **Okredo** — LOCAL. Lithuanian company-data/credit-risk API startup (freemium), LT+LV coverage, sells API access.
  - _Public sources:_ JAR bulk data, Sodra open data, court/insolvency records (LITEKO/AVNT), procurement data — all public primaries listed in this catalog.
- **Rekvizitai.lt** — LOCAL. The de-facto public company directory of Lithuania: profiles, financial summaries, employees, debts. Blocks scrapers; commercial re-use restricted.
  - _Public sources:_ JAR raw open data (Registrų centras), RC financial statements, Sodra open data (employees/wages/debts) — we ingest those primary routes at $0 instead.
- **Scorify** — LOCAL. Lithuanian credit-scoring/company-monitoring provider built on open registers.
  - _Public sources:_ JAR raw data, Sodra open data, insolvency data — same public primaries we catalog above.

**LU**

- **Kneip** — LU-based fund reference-data and reporting utilities; cover fund document/data dissemination for domiciled funds. Infrastructure providers more than intelligence competitors, but their existence shows the underlying data flows.
  - _Public sources:_ CSSF filings, fund prospectuses/KIDs, LuxSE official list — the official-list and CSSF routes are open.

**LV**

- **CrediWeb** — Credit-risk profiles, payment-behavior scores and debtor lists on LV companies (not verified by fetch this session; long-standing provider).
  - _Public sources:_ UR registry, VID tax-debtor publications, insolvency register, court/gazette announcements — direct public equivalents catalogued above.
- **Firmas.lv** — Verified local provider: consolidated legal/factual company DB, industry search, monitoring, micro-payment access. Explicitly labels itself a UR data re-user.
  - _Public sources:_ Uzņēmumu reģistrs/Commercial Register, Insolvency Register, Commercial Pledges Register, Land Registry, CSDD vehicle data — all public routes we hold.
- **LETA** — National news agency with paid sector-news service (Nozare.lv) — the deepest paid LV business-news layer; excluded from our source list because it is subscription-only.
  - _Public sources:_ Own reporting plus gazette/registry monitoring; the free public layer (Latvijas Vēstnesis, UR open data, ministry press) is what we ingest directly.
- **Lursoft** — THE local incumbent: full LV company data, annual reports, pledges, insolvency, media monitoring, beneficial-owner and litigation flags. Site 403s to bots (paid product). Not to be scraped — but its existence proves the deterministic build path.
  - _Public sources:_ Licensed re-user of Uzņēmumu reģistrs, Insolvency Register, Commercial Pledge Register, court data, Latvijas Vēstnesis — every one of which we catalogued as a direct public source.

**ME**

- **CompanyWall Business Montenegro** — Local/regional credit-reporting platform with a dedicated Montenegrin company database: financials, blocked-account status, ownership, court/bankruptcy flags.
  - _Public sources:_ CRPS register data, annual financial statements from the tax authority, Commercial Court/gazette insolvency announcements, CBCG blocked-account data — the direct public routes are CRPS, Službeni list, and sudovi.me.
- **SeeNews Data** — SEE-regional company rankings (TOP 100 SEE) and news-derived corporate data including Montenegrin companies.
  - _Public sources:_ National registers and statistical offices across SEE (for ME: CRPS, MONSTAT) plus their own editorial wire — the register routes are in our catalog.

**MK**

- **CompanyWall** — Company credit reports, scoring and debtor flags for MK companies; sell repackaged registry data to local B2B users.
  - _Public sources:_ CRM company register + annual accounts (bulk distribution contract), UJP tax-debtor lists, court/insolvency announcements, gazette notices. Direct routes for us: identical public/paid-registry channels — no need to touch their platforms.

**MT**

- **WhosWho.mt** — Local quasi-competitors for the directory layer: WhosWho.mt (companies + executives + news), FinanceMalta member directory (finance-sector firms). Neither offers structured data export.
  - _Public sources:_ Self-registration by firms plus local press; both are themselves usable public sources (whoswho.mt verified accessible; financemalta.org needs browser access).

**NL**

- **Brookz** — Lower-mid-market NL deal flow: businesses for sale, advisor network, sector multiples reports (Brookz Barometer, Dealsuite M&A Monitor). Marketplace model, not a data platform; reports are free PDFs.
  - _Public sources:_ Self-listed sellers/advisors plus their own surveys; their free market reports are citable market-context sources; underlying deal data is proprietary — analysis only, no scraping.
- **Company.info** — The dominant local company-data provider: full Dutch register coverage, daily-updated, officially recognized KVK service provider, linked to FD news archive. B2B subscription; not an alternatives specialist but the data backbone many NL fintech/CDD tools resell.
  - _Public sources:_ KVK Handelsregister (official service-provider contract), deposited annual accounts, Centraal Insolventieregister, FD/BNR news archive — the public originals (KVK API, CIR webservice, gazettes) are exactly the sources we harvest directly.
- **Drimble** — Free/freemium daily NL insolvency trackers: bankruptcies, suspensions, curator contacts, court reports, per-municipality views. Prove the CIR is fully machine-harvestable; no analytics or alternatives framing.
  - _Public sources:_ Centraal Insolventieregister SOAP webservice (webservice.rechtspraak.nl/cir.asmx), court bankruptcy reports, KVK data, local news — we should go to the CIR webservice directly for our NPL/distressed layer.
- **MenA.nl** — NL/Benelux M&A community: deal news, league tables, advisor directory; Dealmaker.nl premium holds the structured deal database. Strong on advisor ecosystem (category 6 overlap).
  - _Public sources:_ Deal press releases, advisor submissions, public news — the same press-release layer our signals pipeline ingests directly; premium database off-limits.

**NO**

- **Argentum** — Semi-competitor: the best free analytical coverage of the Nordic PE/VC fund universe (fundraising, buyout activity, fund lists) since 2008, published as open reports at info.argentum.no.
  - _Public sources:_ Own LP data plus GP interviews and public announcements — we can cite its published aggregates and reconstruct the underlying fund list from Finanstilsynet + NVCA + press.
- **Dun & Bradstreet Norway** — Credit ratings and payment-remark data on Norwegian entities; enterprise market. Payment remarks are licensed, not open.
  - _Public sources:_ Brreg registers + accounts as the public backbone; payment remarks from licensed debt-collection sources (not available to us — and personal-data rules keep them out of scope anyway).
- **Enin.ai** — Norwegian company-intelligence/credit startup — real-time bankruptcy risk, networks of roles, procurement wins. Closest local analogue to a signals engine, but credit-focused, not alternatives-focused.
  - _Public sources:_ Brreg APIs incl. announcement/bankruptcy feeds, Regnskapsregisteret, Doffin procurement data, court announcements — a validation that these open feeds support a commercial intelligence product.
- **Nordic 9** — Nordic deal-intelligence service tracking VC rounds and investors incl. Norway; lightweight, press-driven.
  - _Public sources:_ Nordic tech press (Shifter, E24, ArcticStartup), press releases — same open press layer we monitor via RSS.
- **Proff.no** — The dominant Norwegian company-information site: financials, roles, shareholders for every registered company; Proff Forvalt is the paid credit/prospecting tier. Not alternatives-aware — no fund/asset-class taxonomy.
  - _Public sources:_ Entirely built on public data: Brreg Enhetsregisteret/Foretaksregisteret + Regnskapsregisteret accounts + Skatteetaten shareholder register extracts. We go to the same registers at source, at $0.
- **Purehelp.no** — Free-tier Norwegian company financials and org data, similar to Proff with lighter UX.
  - _Public sources:_ Brreg open API + Regnskapsregisteret accounts — same open primaries we already ingest.

**PL**

- **Krajowy Rejestr Długów** — Private debt-information bureaus (payment defaults) — adjacent to NPL sourcing but their bureau data is proprietary/consent-based, not public.
  - _Public sources:_ Creditor-submitted data (not replicable); public overlap limited to KRZ/MSiG insolvency notices which we take directly.
- **MGBI** — Local data provider over MSiG/KRZ: insolvency and restructuring datasets, debtor reports, annual bankruptcy report — effectively the commercial layer on the exact gazette/insolvency sources we target.
  - _Public sources:_ MSiG announcements, KRZ proceedings, KRS — they also operate the imsig.pl API we cataloged; we can replicate from the official sources at $0.
- **Notoria** — Polish listed-company fundamentals and ownership data for GPW/NewConnect; the local standard for issuer financials.
  - _Public sources:_ ESPI/EBI disclosures, issuer periodic reports, GPW/KDPW data — we ingest espiebi.pap.pl + Bankier espi.xml + GPW lists directly.
- **Rejestr.io** — Polish registry-graph providers (ownership/management connections, KRS change monitoring) with APIs; strong graph UX over KRS.
  - _Public sources:_ KRS Open API, CRBR UBO register, MSiG — identical public inputs to ours; validates our KRS-graph approach.

**PT**

- **Confidencial Imobiliário** — Local real-estate data house (SIR residential index, Portuguese Housing Market Survey) — the reference for PT housing/investment price data; site is JS-heavy, content behind subscription.
  - _Public sources:_ Built on proprietary deed/agency panels; the public alternatives we catalog are INE housing statistics and Portal BASE/registry data, plus Iberian Property and Vida Imobiliária for deal signals.
- **Informa D&B Portugal** — The dominant local company-information/credit provider — financials, risk scores, ESG scores, directories on effectively all PT companies; sells 'public data files' and database licensing.
  - _Public sources:_ IRN commercial register publications, IES annual accounts filings (official channel), Diário da República, CITIUS insolvency data, Portal BASE procurement — the same official spine we ingest directly at $0.
- **Racius** — Free local company-directory site (company events, dissolutions, statistics) demonstrating what is derivable purely from open registry publications; site itself 403s bots and we do not scrape competitors.
  - _Public sources:_ publicacoes.mj.pt company acts and Diário da República — go direct to those.

**RO**

- **Confidas.ro** — Lightweight local company financials/risk lookup aimed at SMEs; simpler than Termene.
  - _Public sources:_ MF financial statements, ONRC, BPI.
- **KeysFin** — Local financial-data and sector-study provider (now part of a regional group); strong on aggregated sector financials and market sizing studies frequently cited in RO business press.
  - _Public sources:_ MF annual financial statements in bulk, ONRC data — both reachable directly (data.gov.ro ONRC CSVs + mfinante lookup).
- **ListaFirme.ro** — Veteran local company directory/credit-report vendor; broad firmographic + financials coverage, older UX, API offering.
  - _Public sources:_ Same public spine: ONRC registrations, MF bilant data, BPI, court portal.
- **RisCo.ro** — Local credit-risk reports and monitoring (payment incidents, insolvency risk scores) on RO companies.
  - _Public sources:_ ONRC, MF financial statements, BPI, portal.just.ro, plus BNR payment-incident data where public.
- **Termene.ro** — Leading local company-intelligence SaaS: full RO firmographics, financials, litigation, insolvency alerts, UBO-adjacent links. The de-facto local benchmark for entity data depth.
  - _Public sources:_ ONRC/RECOM data, Ministry of Finance annual financial statements, BPI insolvency bulletin, portal.just.ro court data (SOAP), Monitorul Oficial — every one of these is in our entities catalog for direct $0 ingestion.
- **Veridion** — Romanian-founded global company-data API (web-scale firmographics via ML crawling); not RO-specific but proof of local data-engineering talent pool; sells B2B datasets, not an alternatives-intelligence product.
  - _Public sources:_ Open web crawling + public registries; no unique public RO source we lack.

**RS**

- **Boniteti.rs** — Serbian credit-scoring and company-monitoring platform used by banks/corporates; APR-grounded financials and distress flags. Site refused our connection this session (ECONNREFUSED) — existence known, not re-verified. No alternatives layer.
  - _Public sources:_ APR financial statements and status changes, NBS forced-collection register, ALSU/court insolvency data — all directly accessible to us.

**SE**

- **Modular Finance** — Nordic market leader in listed-company ownership data (Holdings) and IR tooling; expanded into unlisted ownership in 2021; also operates the MFN newswire.
  - _Public sources:_ Euroclear Sweden share registers (obtained per-company, not open bulk), FI PDMR and short-position open data, fund holdings reports, Bolagsverket — FI's CSVs and Bolagsverket are directly open to us; Euroclear registers are not.
- **Retriever Business** — Nordic firmographics, media monitoring (Retriever) and risk data (D&B) on all Swedish companies.
  - _Public sources:_ Bolagsverket registers and annual reports, SCB, PoIT gazette announcements — same public backbone we ingest directly.
- **UC** — Dominant SE credit-information provider; allabolag is the consumer-facing free directory with financials, boards, and credit events.
  - _Public sources:_ Bolagsverket, Skatteverket (tax status), Kronofogden (payment remarks), SCB — the registry layer is public; the credit-remark layer partly requires licensed access.
- **Valu8** — Local champion for private-company financials and M&A target screening across Europe from its Swedish base; proprietary cleaned financials on essentially every SE company.
  - _Public sources:_ Bolagsverket annual reports (årsredovisningar) in bulk, SCB business register, group-structure data from registries — proof that the Bolagsverket high-value-datasets API + digital annual reports are the foundation for SE private-company intelligence.

**SI**

- **Bizi.si** — Full Slovenian company universe with financials, credit flags, blocked accounts (3,688 shown), receiverships (359), new companies — the local reference company-data product. No alternatives/fund lens.
  - _Public sources:_ Visibly built on AJPES data: PRS register, JOLP financial statements, eRTR blocked accounts, eObjave insolvency. All of these are public and we ingest them directly from AJPES.
- **EBONITETE.SI** — Credit ratings and payment-default monitoring on SI companies; distress-signal oriented.
  - _Public sources:_ AJPES financial statements, eRTR account blocks, eObjave insolvency filings, FURS tax-debtor lists — all reachable directly at source.
- **GVIN** — Company intelligence, ownership networks, credit scores and news monitoring for SI corporates; enterprise product, no alternatives taxonomy.
  - _Public sources:_ AJPES PRS/JOLP, court and gazette announcements (eObjave, Uradni list/PISRS), media monitoring. Direct public routes identical to ours.

**SK**

- **FinStat** — THE local benchmark: financials, risk flags, debts, insolvency and gazette monitoring for every Slovak company; widely used by banks and journalists. Not alternatives-aware (no asset-class taxonomy, no fund/LP layer).
  - _Public sources:_ Openly built on Register účtovných závierok (RÚZ API), ORSR/RPO, Obchodný vestník structured data, Finančná správa debtor/VAT lists, insolvency register — every one of which we catalog and can ingest directly at $0.
- **foaf.sk** — Free ownership/relationship graph over Slovak registry data — proof of what pure open ORSR/RPO data yields (people-company edges).
  - _Public sources:_ ORSR extracts and RPO open data exclusively — validates our deterministic-first pipeline design.
- **Vestbee** — CEE VC market maps, round roundups and investor lists including Slovakia; media/community layer rather than a database.
  - _Public sources:_ Self-reported VC profiles, press, SLOVCA-type rosters — signals we get from The Recursive/Startitup feeds and SLOVCA directly.

**XK**

- **The Recursive** — SEE startup/VC media with genuine original reporting on Kosovo founders and rounds.
  - _Public sources:_ Original interviews plus ecosystem sources (ICK, STIKK); complements rather than substitutes local feeds.

---

## 5. Country-by-country view

The full picture per market, in the order a go-to-market conversation
would need it.

### AL — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| EMIS (ISI Emerging Markets) | Deepest commercial coverage of Albania among global providers: company financials, industry reports, news aggregation. Subscription-only. | QKB commercial-register filings (annual financial statements), INSTAT statistics, Bank of Albania data, Monitor.al and other local press — all of which we can reach directly via qkb.gov.al, opencorporates.al, instat.gov.al, bankofalbania.org, monitor.al. |
| SeeNews (incl. TOP 100 SEE) | Regional SEE wire with steady Albania business coverage and an annual company ranking that includes Albanian corporates. | QKB/registry financials, INSTAT, Bank of Albania, ALSE announcements, local press — direct routes exist for every one. |
| bne IntelliNews | Dedicated Albania country section: macro, banking, energy, occasional deal coverage. Partially free. | Bank of Albania statistics/press, INSTAT, government ministries, local media (Monitor, Tirana Times) — all directly accessible. |
| Preqin / PitchBook | Near-zero dedicated Albania coverage — no domestic GP ecosystem to track; a handful of SEE-regional funds (often EBRD-backed) with Albanian exposure appear tagged regionally. | EBRD project summary documents, IFC disclosures, fund-manager websites, press releases — we go direct to ebrd.com PSDs and disclosures.ifc.org. |
| Dealroom / Crunchbase | Thin Albanian startup coverage (small ecosystem: a few dozen active startups, accelerator cohorts). Dealroom has Western Balkans reports (with EU/EIT support). | Self-reported founder profiles, accelerator/program lists (Uplift, EU-funded programs), AIDA announcements, local press — direct: aida.gov.al + local media. |
| Debtwire / Reorg | Effectively no Albania coverage; SEE NPL commentary occasionally references Albania at market level only. | Bank of Albania financial stability reports (NPL data), AKF bankruptcy registers — both directly accessible (bankofalbania.org, akf.gov.al), giving us an edge in this niche. |
| OpenCorporates.com (global) | No meaningful Albania jurisdiction coverage; the local AIS-run opencorporates.al (unaffiliated) is the real open-register mirror. | n/a for Albania — use opencorporates.al (AIS) and QKB directly. |
| CEE Legal Matters | Covers the Albanian legal/deal market (firm mandates, energy and finance transactions) — more a signal publisher than a data platform. | Law-firm press releases and self-reported deal announcements — we can ingest the same announcements from its free site. |

### AT — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (global) | Covers the larger Austrian GPs/LPs (Erste/RBI asset-management arms, insurers, Pensionskassen as LPs) and pan-European funds with AT exposure; thin on AT lower-mid-market, NPL servicers, and the service graph. | FMA licence disclosures, ESMA registers, fund annual reports, association data (Invest Europe, which invest.austria feeds), press releases — all reachable directly via FMA/ESMA/OTS. |
| PitchBook (global) | AT PE/VC deal and valuation coverage via press + filings; good on buyouts of Austrian Mittelstand by DACH sponsors; weak on private-debt and real-asset vehicles. | Firmenbuch filings (via commercial clearing-house data), APA-OTS press releases, Wiener Börse disclosures, EVI gazette publications — we can go to justizonline/auszug.at, ots.at, wienerborse.at, evi.gv.at directly. |
| Dealroom (global; local flavor via vienna.dealroom.co with Vienna Business Agency) | Strong Vienna/AT startup + VC round coverage through the co-branded Vienna ecosystem instance (fetch returned 403 — actively bot-protected; do not scrape). | brutkasten, Trending Topics, der Standard startup coverage, invest.austria member data, founders' self-reporting, Firmenbuch capital-increase filings — the press feeds and Firmenbuch route are directly available to us. |
| Crunchbase (global) | Broad but shallow AT startup coverage, mostly self-reported profiles plus funding press; unreliable for legal-entity ground truth. | Company self-submissions and English-language tech press; underlying verifiable layer is the same AT press (brutkasten/TT) + Firmenbuch we ingest directly. |
| KSV1870 (local — Austria's dominant credit bureau) | 640,000 AT companies with payment history, insolvencies, register data; membership/paywall model; the local ground-truth standard for creditworthiness and insolvency stats. | Firmenbuch (clearing-house feed), Ediktsdatei/Insolvenzdatei (open!), GISA, EVI gazette — every underlying register is public and independently ingestable by us; their proprietary layer is payment-experience data. |
| Creditreform Österreich (local credit bureau) | Same category as KSV1870: credit reports, insolvency trend statistics (their semi-annual insolvency studies are themselves a public signal worth monitoring). | Firmenbuch, Ediktsdatei, GISA, financial statements filed to Firmenbuch — all reachable directly. |
| Wirtschafts-Compass / Compass-Verlag (local, 150+ years) | Aggregates Firmenbuch, Grundbuch, GISA, Vereinsregister, WiEReG, insolvencies and balance sheets into one paid platform with a real API (api.wirtschaftscompass.at); from EUR 24/yr entry tier. The closest local analogue to an entity-data backbone. | Exactly the tier-1/3 registers in this catalog (Firmenbuch, Grundbuch, GISA, ZVR, Ediktsdatei, EVI) — validates our source map; we ingest the same registers directly rather than their platform. |
| Dun & Bradstreet Austria (ex-Bisnode) + firm directories (FirmenABC, HEROLD) | Commercial firmographics and marketing data on AT companies; FirmenABC/HEROLD are ad-financed directories with SEO-visible company pages. | Firmenbuch clearing-house data, WKO Firmen A-Z, GISA — the free WKO and GISA layers give us equivalent breadth at $0. |

### BA — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Effectively zero BA-specific fund coverage; Bosnia appears only inside CEE/SEE aggregates and via the handful of regional funds (EBRD/EIF-backed SEE vehicles) that list BA in their geographic mandate. No local GP/LP depth. | Fund manager self-reporting and regulatory filings elsewhere; for BA-touching funds the visible public trail is EBRD/EIF project disclosures and fund press releases — all of which we can ingest directly. |
| PitchBook | Sparse BA deal records, mostly cross-border acquisitions of BA companies (banking consolidation, industrial M&A) and the rare venture round. Company records thin, financials largely absent. | Press coverage (eKapija, Bloomberg Adria, SeeNews), SASE/BLSE issuer disclosures, and Competition Council merger decisions — all directly accessible to us (bihkonk.gov.ba, blberza.com RSS, sase.ba). |
| Dealroom | Best of the globals for the BA startup layer — has BA startup profiles via its ecosystem partnerships in the Western Balkans; funding data mostly self-reported or press-derived. | Startup ecosystem lists (BIT Alliance members, accelerator cohorts), tech press, founder self-reporting. We can go directly to bit-alliance.ba and local tech/business media RSS. |
| Crunchbase | Thin self-reported BA company profiles; funding rounds patchy and often unsourced. Useful only as a lead list, never as a fact source. | Self-registration + press scraping. Underlying verifiable facts trace to the same local press (Klix, BiznisInfo, Akta) we ingest natively. |
| CompanyWall Business (companywall.ba) — LOCAL | VERIFIED local/regional company-data provider: ~87k companies, 92k entrepreneurs; financial statements, credit ratings, account blockades, bankruptcy proceedings, ownership and tax debt. Paid tiers 41-1,135 KM. The strongest local company-financials competitor. | Explicitly cites FIA (FBiH), APIF (RS) and the Brcko Finance Directorate plus court registers — exactly the tier-1 registries we catalog for direct ingestion (fia.ba, apif.net, bizreg.pravosudje.ba). |
| LRC BIS (Sarajevo) — LOCAL | Long-standing Bosnian credit bureau / business-intelligence house (credit reports, sector analyses, bank-grade scoring) sold into local banks. Its historical domain lrcbis.com did NOT resolve during this session — current web presence needs re-verification, but the firm is the incumbent local BI provider. | FIA and APIF financial statements, court/business registers, CBBH credit-registry-adjacent data — again the same public tier-1/2 sources we access directly. |
| Akta.ba (business data arm) — LOCAL | Beyond news, runs a company-registry search and a tender-intelligence product; good tender/award tracking and industry profit-leader rankings. | e-Nabavke procurement portal (ejn.gov.ba), official gazettes, court business registers, FIA/APIF financials — all direct-access for us. |
| eKapija — REGIONAL | Regional business-news + tender platform with a BiH edition; strong on investment-project announcements and public tenders; bot-blocks scrapers (403). | ejn.gov.ba tenders, municipal/entity government announcements, company press releases — we ingest those origins directly, respecting their no-scrape posture. |
| Dun & Bradstreet / former Bisnode SEE — REGIONAL | Sells BA company credit data inside regional packages; coverage is registry-derived, no alternatives-specific intelligence. Local bisnode.ba domain not verified this session. | APIF/FIA financial statements and the court business registers via licensed bulk arrangements — the same registries we hit at source. |
| Bloomberg Adria — REGIONAL | Markets data + journalism for the Adria region incl. BA; strong on listed securities, macro and banking, not on private funds. | SASE/BLSE market data feeds, CBBH statistics, entity statistics institutes — all public and cataloged here. |

### BE — 11 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Global alternatives standard: Belgian GP/fund profiles, performance, and the Belgian LP universe (pension funds, insurers) for fundraising intelligence. Thin on Belgian mid-market service graph and niche alts. | FSMA AIFM/ManCo lists, NBB supervised-institution lists, FSMA IORP register and annual IORP overviews, fund managers' own annual reports filed at NBB CBSO, press releases — all directly reachable via the tier1/tier2 sources cataloged here. |
| PitchBook (Morningstar) | Belgian PE/VC deals, valuations, listed-holding data (Sofina, GBL, Gimv, Brederode). Strong deal history, weaker on gazette-level entity events. | Euronext Brussels disclosures, company press releases, De Tijd/L'Echo coverage, KBO/CBE identifiers, Staatsblad incorporation/merger publications. |
| Dealroom.co | Deepest Belgian startup/scale-up ecosystem coverage; partners with regional agencies for ecosystem dashboards. VC-centric; no private debt/real assets depth. | KBO/CBE open data, Staatsblad publications, startup press (Bloovi, Made in, Tech.eu), accelerator/association lists (Private Capital Belgium), PMV/regional-investor portfolio pages. |
| Crunchbase | Broad but shallow Belgian startup/funding coverage, crowd-sourced plus press-parsed; weak entity hygiene versus registry-grade data. | Press releases and startup media; no visible registry integration for Belgium — a gap we close by anchoring on KBO + CBSO. |
| openthebox (Mediafin) | The strongest local benchmark: ownership graphs, directors, and financials across 3M+ Belgian entities with API and data feeds; owned by Mediafin (De Tijd/L'Echo). Company-data centric, not alternatives-taxonomy aware. | Explicitly: KBO/CBE for status/directors, NBB CBSO annual accounts, Belgisch Staatsblad publications, UBO register (as obliged-entity access). All except UBO are directly open to us. |
| Bizzy | Free/freemium Belgian company profiles with AI descriptions, real-time updates and sales-intelligence agent; consumer-grade UX, no alternatives focus. | KBO/CBE, NBB annual accounts, Staatsblad, plus press/social/vacancy scraping — public underlying registers are the same tier1 set we catalog. |
| Companyweb | Incumbent Belgian credit-information provider (scores, payment behavior, alerts) used widely by finance teams; strong on distress signals. | KBO/CBE, NBB CBSO financials, RegSol/court insolvency data, Staatsblad publications — the distress layer maps to our tier3 sources. |
| GraydonCreditsafe Belgium | Credit risk and compliance data on Belgian companies; proprietary payment-experience pool on top of registry data. | KBO/CBE open data, NBB annual accounts, gazette publications, bankruptcy statistics (Statbel/RegSol-derived). |
| Trends Top (Roularta, trendstop.knack.be) | Directory/rankings of top Belgian companies with financials and sector tops; verified redirect trendstop.be → trendstop.knack.be. B2B prospecting oriented. | NBB CBSO annual accounts and KBO identifiers, packaged into rankings. |
| Moody's Bureau van Dijk — Bel-first | Comprehensive Belgian & Luxembourg financials/ownership product (BvD is Belgian-origin); the institutional standard for BE company financial screening. | NBB CBSO filings (bulk), KBO/CBE registry, Staatsblad events — again fully public underneath. |
| Staatsbladmonitor.be | Free Belgian monitoring service over gazette publications with company profiles, alerts and a free API tier (100 req/day) — verified by fetch. Proof that Staatsblad+KBO+CBSO can be productized cheaply. | Belgisch Staatsblad Rechtspersonen annex, KBO/CBE, NBB annual accounts. |

### BG — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Covers Bulgarian GPs/funds mainly as part of CEE fund universes (e.g., BVCA-member funds, EIF/EBRD-backed vehicles); thin below the fund level and weak on local service graph, NPL servicers and niche alts. | FSC/ESMA fund and manager registers, EIF/EBRD/FMFIB program announcements, fund press releases, association member lists (BVCA) — all directly accessible to us. |
| PitchBook | Good on Bulgarian VC deal flow (LAUNCHub, Eleven, Vitosha, BrightCap ecosystems) and M&A with advisor attribution; weaker on private debt, real assets and state-linked vehicles. | Startup/VC press (The Recursive, Capital), company press releases, Commercial Register filings for confirmations, exchange disclosures (X3News) — we can ingest the same primary feeds. |
| Dealroom | Startup/scaleup mapping for SEE, often via ecosystem partnerships; strong logo-level company coverage, funding rounds crowd-plus-press sourced; little depth on funds' legal entities or LP side. | The Recursive and regional startup media, BESCO/association lists, self-reported company data, Crunchbase-style cross-referencing — the media and association layers are directly available. |
| Crunchbase | Self-reported Bulgarian company and round data; breadth without verification depth; no registry grounding. | Press releases and self-submissions; verification against portal.registryagency.bg is the differentiator we hold. |
| SeeNews (local, Sofia) | Regional SEE business newswire plus data products (TOP 100 SEE ranking, company profiles); strong deal/energy/banking reporting for Bulgaria; partly paywalled. | National trade registers and annual financial statements, stock-exchange disclosures, own reporting — the CR annual accounts and BSE/X3News feeds are open to us directly. |
| APIS (apis.bg, local) | Legal-information systems plus company-data product (Apis Register+) built on official registers; the standard tool of Bulgarian lawyers; entity data strong, no investment-intelligence layer. | Commercial Register bulk data (data.egov.bg), State Gazette, court acts — all public and directly ingestible. |
| Ciela Norma (local) | Competing legal/registers information provider (Ciela Info) with company dossiers and insolvency tracking; same registry substrate, legal-market oriented. | Commercial Register, State Gazette, e-justice court acts — identical public substrate. |
| Papagal.bg / Daxy (local free lookups) | Free web lookups over Commercial Register extracts (ownership, related-party graphs); popular with journalists; prove the CR bulk data is programmatically consumable, but offer no analytics or alternatives focus. | Periodic Commercial Register bulk extracts from the national open data portal (data.egov.bg) — confirming that bulk route as our tier-1 pipeline. |

### CH — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Strong on Swiss GPs/LPs: Partners Group, LGT (Liechtenstein-adjacent), Unigestion, Capital Dynamics and the large pension-fund LP base; fund performance and fundraising for Swiss-domiciled and Swiss-managed vehicles. | FINMA licensee lists (fund management companies, managers of collective assets), OAK BV pension-system reports and pension funds' own annual reports, SECA membership/reports, fund annual reports — all directly accessible to us. |
| PitchBook | Swiss PE/VC deal and company coverage, valuations, service-provider mapping (law firms, banks on deals). | Zefix/SOGC register mutations (capital increases, new entities), SIX/SER issuer disclosures, press releases from firms and startupticker-style media — Zefix REST API and shab.ch API give us the same primary feed at $0. |
| Dealroom | Swiss startup/scaleup ecosystem mapping (works with local ecosystem partners; Swiss startup data also surfaced through swiss.tech and cantonal ecosystem portals). | Startupticker.ch news and the annual Swiss Venture Capital Report (startupticker + SECA), commercial-register incorporations via Zefix, company self-reporting — the SVCR PDF and startupticker archive are public. |
| Crunchbase | Broad but shallow Swiss startup funding rounds; investor profiles; weak on institutional/LP layer. | Press releases, startupticker/fintechnews items, self-reported profiles — we ingest the same press layer via the verified RSS feeds above. |
| Moneyhouse (NZZ Group) — local leader | The dominant Swiss company-information platform: 600k+ companies, register excerpts, management, SOGC monitoring, credit checks. B2B API offering. | Built almost entirely on public primary sources we can hit directly: Zefix/cantonal commercial registers and the SHAB API (search results confirm SHAB publications are retrieved via a Moneyhouse-operated API v2 arrangement). Do NOT scrape Moneyhouse; go to Zefix + shab.ch. |
| CRIF Switzerland (incl. teledata heritage) | Credit risk, solvency and address data on Swiss companies; 30k+ business customers; strong on payment-behaviour data (proprietary). | Zefix/SOGC register and gazette data plus debt-enforcement publications; proprietary payment experience pools are not replicable and not needed for our use case. |
| Creditreform Switzerland | Largest creditor-protection association; unique angle: covers sole traders and individuals not in the commercial register. | SOGC bankruptcy/debt-enforcement publications, commercial register, plus member-contributed ledger experience (proprietary). |
| Swiss Fund Data (SIX) — local official-adjacent | Authoritative fund reference data for CH-authorised funds, NAVs, documents; operated by SIX Financial Information. | FINMA authorisation lists + fund providers' own filings. ToS ban systematic extraction — we use the FINMA source lists directly instead. |

### CY — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Covers Cyprus-domiciled AIFs/RAIFs, AIFMs and fund performance as part of European alternatives; Cyprus is a small but growing fund domicile in their data. | CySEC entity registers and quarterly collective-investment statistics, CIFA publications, fund manager announcements — all directly accessible to us via cysec.gov.cy and cifacyprus.org. |
| PitchBook / Crunchbase / Dealroom | Cyprus PE/VC deals, startup ecosystem and investor profiles; coverage skewed to tech (Exness, Wargaming orbit) and thin on funds/credit. | Press releases and tech media, DRCOR registrar filings, TechIsland and RIF grant announcements, CYBAN portfolio disclosures — we go direct to data.gov.cy CSVs, research.org.cy, thetechisland.org, cyban.com.cy. |
| With Intelligence | Cyprus ManCos and hedge/liquid-alt managers within their EU fund-manager datasets. | CySEC CIF/AIFM/UCITS lists (Excel downloads) and fund press — direct route: cysec.gov.cy entity pages. |
| Debtwire / ION Analytics | Strongest third-party coverage of the Cyprus NPL/distressed market (portfolio sales by Bank of Cyprus, Hellenic, KEDIPES; servicer moves by doValue/Altamira, APS, Themis). | CBC NPL statistics, KEDIPES quarterly progress reports, bank investor-relations disclosures, StockWatch/Financial Mirror reporting — direct routes: kedipes.com.cy, centralbank.cy (browser-fetch), CSE OAM filings. |
| OpenCorporates | Full Cyprus company universe republished. | Exactly the DRCOR open-data CSVs on data.gov.cy (organisations/officials/addresses) — we ingest the same primary files at $0, no need to touch their platform. |
| Moody's Orbis (Bureau van Dijk) / local credit bureaus (Artemis) | Cyprus company financials, ownership trees and credit data sold into compliance/KYC workflows. | DRCOR registrar records and annual-return (HE32) financial filings, gazette insolvency notices — direct routes: DRCOR eSearch, data.gov.cy, insolvency.gov.cy registers, official gazette. |
| Bloomberg / LSEG (Refinitiv) | CSE-listed issuers, prices and corporate actions; minimal alternatives depth for CY. | CSE market data, OAM issuer filings, CySEC issuer register — direct routes: cse.com.cy listing/announcement pages and publicoam.cse.com.cy. |
| StockWatch (local data provider) | Local benchmark for CY market data, bank/finance news and company coverage; operates a paid data service alongside the news site. | CSE feeds and announcements, CySEC decisions, company disclosures, CBC statistics — all public and directly reachable by us. |
| IMH group (InBusiness / GOLD rankings & directories) | Local company rankings, sector directories and awards content (e.g. IN Business Top companies) — reputational rather than registry-grade. | Own reporting plus company submissions and registrar data; underlying public layer is DRCOR + CSE + CySEC, which we ingest directly. |

### CZ — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (now part of BlackRock) | Thin-but-real CZ coverage: a handful of CZ-domiciled GPs (Genesis Capital, Jet Investment, ARX Equity, Enern etc.), CEE funds in fundraising, and CZ institutions as LPs. Weak below the top PE tier; near-zero on CZ niche alts and the service graph. | CNB regulated-entity lists (fund manager licensing), CVCA membership and yearbook, fund annual reports filed to the commercial register (sbírka listin at or.justice.cz), press releases — all of which we can hit directly via ARES/dataor + CVCA + ČNB lists. |
| PitchBook | Better CZ deal coverage than Preqin on buyouts and growth (tracks Jet, Genesis, BHM, Sev.en, PPF, EC Investments deal activity); valuations largely modeled. Service-provider tagging (law firms, advisors) is decent but built from deal press. | Deal press (HN, E15, CzechCrunch, CTK wire), commercial register filings for confirmations, PSE disclosures, CVCA. All directly accessible to us: the same RSS feeds plus ARES/OR filings. |
| Dealroom | Strongest global platform for the CZ startup/VC layer; works with local ecosystem partners and powers regional startup reports. Good founder/round data, weak on PE, debt, real assets. | czechstartups.gov.cz ecosystem data, CzechCrunch and Lupa coverage, ARES for firmographics, accelerator/VC portfolio pages. We can go straight to ARES + cc.cz/feed + CzechInvest programs. |
| Crunchbase | Broad but shallow CZ startup coverage; funding rounds crowd-sourced + press-scraped; entity hygiene noticeably worse than Dealroom for CEE. | Startup press (CzechCrunch, Forbes.cz), company self-submissions, ARES-derived registry data via aggregators. Direct route for us: same press RSS + ARES canonical records. |
| CRIF – Czech Credit Bureau (Cribis) | LOCAL. The dominant CZ firmographic/credit-data provider: full company universe, financials from filed statements, payment/insolvency flags, ownership links. This is what CZ banks and NPL buyers actually use for counterparty data. | ARES + obchodní rejstřík bulk data (dataor XML), sbírka listin financial statements, ISIR insolvency feed, Obchodní věstník, VVZ/registr smluv. Every underlying source is public and in our catalog — Cribis' moat is parsing scale, not exclusive access. |
| Dun & Bradstreet Czech (ex-Bisnode) | LOCAL/global hybrid. Firmographics, scoring, ownership trees (incl. cross-border via D&B WorldBase). Used for KYC/AML and supplier risk; no alternatives-specific intelligence. | Same public spine: ARES, OR + sbírka listin, ISIR, Obchodní věstník, plus proprietary trade-payment data (not public — we don't need it for entity mapping). |
| Merk.cz (Imper CZ) | LOCAL sales-intelligence layer over the CZ registry universe: firmographics, contacts, technographic/web signals, insolvency and turnover estimates. B2B-sales oriented, not investment-grade. | ARES API, dataor dumps, ISIR, registr smluv, VVZ, company websites. All public and cataloged above. |
| BizMachine | LOCAL Czech firmographic/predictive-signals provider (growth scoring, tech detection) used by banks/telcos for prospecting. No alternatives focus but demonstrates what is derivable from CZ open registries. | ARES/RES, commercial register filings, procurement + contract-register open data, web crawling. Direct-source equivalents fully covered in our catalog. |
| Hlídač státu | LOCAL civic-tech aggregator, free/open with API: contracts, subsidies, insolvency, sponsor/political links across CZ entities. Not a competitor commercially but the best proof-of-concept of CZ open-data fusion; useful as a cross-check layer. | Registr smluv API, VVZ open data, ISIR, ARES, subsidy registers (DotInfo/CEDR) — all public; its own API is free-key gated (401 without token). |

### DE — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Strong on German GPs/LPs, fund closings, AIFM landscape; weak on sub-institutional/mid-cap and the service graph. | BaFin InstInfo/FondsInfo AIFM and fund registers; Bundesanzeiger fund/company filings; association statistics (BVK, BAI, Invest Europe) — all directly accessible above. |
| PitchBook (Morningstar) | Deep German deal/valuation coverage for PE/VC and M&A; advisor networks well mapped. | Handelsregister filings and Handelsregisterbekanntmachungen (cap-table/UBO changes), Bundesanzeiger accounts, press (Handelsblatt/FINANCE/JUVE deal reports) — the same gazette+press stack we catalog. |
| Dealroom | German startup/scaleup universe with government/eco-system partnerships; good funding-round recall, weaker on debt/real assets. | Handelsregister new incorporations, startup press (deutsche-startups, Gründerszene, Startbase), association data (Startup-Verband) — all public routes listed. |
| Crunchbase | Broad but shallow DE coverage, self-reported profiles plus press-sourced rounds. | Press releases and startup media; little registry grounding — our registry-first approach out-depths it structurally. |
| North Data (northdata.de, local) | The benchmark local player: company graph, financials, register-event timeline for all German entities; no alternatives-specific classification. | Proves exactly which public sources are machine-usable at scale: Handelsregister + register announcements, Bundesanzeiger annual accounts, Insolvenzbekanntmachungen — go to these directly. |
| startupdetector (local) | Weekly German startup funding/incorporation reports sold to VCs. | Built almost entirely on Handelsregisterbekanntmachungen (new GmbH/UG registrations, capital increases) — confirms that announcement stream alone yields funding signals pre-press. |
| Creditreform / FirmenWissen (local) | Credit data on the full German company universe; payment behavior is proprietary. | Handelsregister, Bundesanzeiger financial statements, insolvency announcements — plus proprietary field data we don't need. |
| Moody's / Bureau van Dijk (Dafne, Orbis) | Structured German financials + ownership; standard in corporate finance. | Bundesanzeiger/Unternehmensregister accounts (largely via Creditreform sourcing) and register data — same public originals we ingest. |
| Barkow Consulting (local) | German VC/banking market statistics frequently cited by press. | Bundesbank statistics, Bundesanzeiger filings, KfW/association data — assembled from the public stack, showing the analysis layer is buildable at $0 data cost. |
| FINANCE Deal-Datenbank / Majunke (deal-advisors.com, local) | German-speaking PE/M&A transaction lists and newsletters; strong mid-cap recall. | Press releases, advisor submissions, JUVE/FINANCE reporting — signals-press tier, no registry moat. |

### DK — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Strong on Danish GPs (Axcel, Polaris, Maj Invest, Nordic Alpha, Seed Capital, NREP on real assets) and especially Danish LPs — ATP, PFA, PKA, PensionDanmark, Sampension are heavily profiled allocators. Fund-level performance where LPs disclose. | Finanstilsynet AIFM/ManCo register, CVR filings and XBRL annual reports, pension funds' own annual/responsible-investment reports, press releases — all directly accessible to us via datacvr.virk.dk, virksomhedsregister.finanstilsynet.dk and fund websites. |
| PitchBook (Morningstar) | Good Danish deal coverage (VC rounds, buyouts, M&A) and advisor league tables; weaker on niche alts and the service graph. | GlobeNewswire/Nasdaq Copenhagen announcements, CVR ownership changes, Aktive Ejere member activity, startup press (Bootstrapping, TechSavvy) — every one of these is public and catalogued above. |
| Dealroom.co | Deep Danish startup/scale-up graph, ecosystem reports (often with public partners); strong on VC rounds and founder data, not on funds-as-entities or credit/real assets. | The Hub startup directory, CVR register data, news crawling of Danish startup media, self-reported profiles. We can go to The Hub + CVR + Bootstrapping/TechSavvy RSS directly. |
| Crunchbase | Broad but shallow Danish startup coverage; self-reported, patchy on Danish-language sources. | Press releases, self-registration, GlobeNewswire — nothing exclusive. |
| The Hub (Danske Bank / Rainmaking) — LOCAL | ~11,000 Nordic startups with funding stage, jobs, investors; the de-facto free Danish startup directory. Not a competitor for funds/credit/real assets. | Startup self-registration + CVR verification. It is itself a public directory (JS app) — discovery aid only, re-verify against CVR. |
| Lasso (lasso.dk / Lassox) — LOCAL | Danish company-intelligence platform (monitoring, credit, networks) built almost entirely on open registry data; strong CVR/network UX, no alternatives-specific taxonomy. | CVR Elasticsearch distribution, published XBRL regnskaber, Statstidende notices — precisely the open pipes we catalogued; proof the primary sources support a full product. |
| Proff.dk (Eniro) — LOCAL | Free Danish company lookup with financials and roles; consumer-grade, no alternatives lens. | CVR + published annual reports (XBRL). Same open sources. |
| cvr.dev / cvrapi.dk — LOCAL developer APIs | Thin commercial/free API wrappers over CVR for developers; validation that direct ERST Elasticsearch access is the canonical route (we should go direct, not through wrappers). | ERST's distribution.virk.dk Elasticsearch and regnskabsdata feeds. |
| BiQ (Ritzau) / NN Markedsdata (Dun & Bradstreet) — LOCAL legacy | Person-company network data (BiQ, used by journalists) and firmographic/credit data (NN/D&B); B2B sales orientation, no alternatives focus. | CVR roles/ownership data, Statstidende, published accounts — all open. |
| Experian Danmark (RKI) — LOCAL credit | Consumer/business credit and the RKI debtor register; closed proprietary negative-data, not replicable and not our lane. | Own proprietary debtor registrations plus CVR/Statstidende; only the public layers (CVR, Statstidende) are accessible to us — do not touch the proprietary register. |

### EE — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Dealroom (global, powers Startup Estonia database) | Strongest startup/VC coverage of Estonia of any global platform — it is the official data partner behind the Startup Estonia database, so Estonian startups, rounds and investor mapping are unusually complete. Weak on private debt, real assets, and the service graph. | e-Business Register open data (avaandmed.ariregister.rik.ee), EMTA quarterly tax/turnover/employee open data (visible in Estonian startup employment/revenue metrics), press releases and startup media (ArcticStartup, Ärigeenius, ERR), self-reported company profiles, Startup Estonia quarterly reports. All of these are directly accessible to us at sou |
| PitchBook | Covers the visible Estonian VC/PE layer (BaltCap, Karma Ventures, Trind, Superangel, Specialist VC, Startup Wise Guys, Plural's Estonian footprint) and larger deals; thin below headline rounds, sparse on Estonian LPs, NPL/servicers and niche alts. | Company registry filings (ariregister annual reports), Nasdaq Baltic disclosures, EstVCA membership and activity reports, fund/firm press releases, English-language media (ERR News, Baltic Times). Direct routes exist for every one. |
| Preqin | Fund-level coverage of Baltic-focused GPs (BaltCap, Livonia, INVL vehicles touching EE) and some LP data via pension-fund reporting; Estonia-specific depth is shallow — few Estonian LPs profiled, almost nothing on service providers. | Finantsinspektsioon fund/AIFM registers, Pensionikeskus fund data, annual reports filed to the e-Business Register, EstVCA publications — all public and directly harvestable. |
| Crunchbase | Broad but shallow Estonian startup coverage, largely self-reported and press-derived; unreliable for round completeness and entity resolution (no registry codes). | Press releases, TechCrunch/ArcticStartup-type media, self-submission. Registry-linked verification is exactly what they lack and we can add via RIK open data. |
| Inforegister (Register OÜ) — local | Estonian credit-risk and company-intelligence portal: payment defaults, tax arrears, network graphs of boards/owners, distress ratings. Effectively a local moat on registry-derivative analytics; no alternatives-investment framing. | e-Business Register open data + documents, EMTA open data (tax arrears, paid taxes), Ametlikud Teadaanded insolvency notices, court decisions — 100% public inputs we ingest directly under the same open licenses. |
| Creditinfo Eesti / e-krediidiinfo.ee — local | Official credit bureau; company reports, payment-default register (maksehäireregister), scoring. The payment-default ledger itself is proprietary member-contributed data (banks report into it) — not replicable from public sources; everything else is registry-derived. | e-Business Register, EMTA open data, Ametlikud Teadaanded; proprietary layer is bank-reported defaults. |
| Scorestorybook (Storybook) — local | Company scoring, media-mention monitoring and B2B prospecting on Estonian companies; strong entity-resolution over local media. | e-Business Register open data, EMTA quarterly data, Estonian online media (Äripäev/Delfi/Postimees headlines), Ametlikud Teadaanded. |
| Teatmik.ee — local | Free lookup layer over the commercial register incl. beneficial owners and annual-report figures; no analytics. Demonstrates how complete the free RIK data is. | e-Business Register open data and documents exclusively. |
| Funderbeam — local origin (marketplace) | Estonian-founded funding/secondary marketplace; carries data on its own listed private companies and syndicates — a niche primary source for its own deals rather than a coverage competitor. | Own listings and issuer disclosures; underlying entities verifiable via ariregister. |

### ES — 11 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (global) | Spanish GPs/LPs and fund performance covered top-down; thin on mid-market and regional service graph. | CNMV SGIIC/SGEIC and capital-riesgo registers, DGSFP pension-fund register (LP side), fund annual accounts filed via Registro Mercantil/BORME — all directly accessible to us. |
| PitchBook (global) | Good on Spanish VC rounds and PE deals via press mining; weaker on debt, NPL, real assets. | BORME incorporation/capital-increase events, CNMV registers, SpainCap yearbook, startup press (El Referente-class outlets) — we can consume the same gazette + press layer. |
| Dealroom (global, strong ES via partnerships) | Startup/VC ecosystem mapping incl. Spain hubs (endorsed by public agencies). | Public startup announcements, ENISA/CDTI award publications, accelerator lists, BORME-derived company data via local data resellers. |
| Crunchbase (global) | Broad but shallow Spanish startup coverage, self-reported heavy. | Press releases and startup media; little registry depth — our BORME/CNMV route out-depths it. |
| TTR Data — Transactional Track Record (Iberia/LatAm local champion) | VERIFIED live. The Iberian M&A/PE/VC/capital-markets deal database; claims 3x more local data than globals; monthly league tables. | BORME acts, CNMV IP/OIR disclosures, BME/MARF listings, insolvency edicts, law-firm deal announcements — every one a public source we catalog above. |
| Capital & Corporate / CapCorpData (local) | VERIFIED live. Spanish M&A/PE deal intelligence + yearbook + magazine; strong advisor/deal attribution. | Deal press releases, advisor submissions, BORME confirmations, SpainCap directory. |
| Informa D&B / eInforma (local company-data incumbent) | Full Spanish company universe with financials, scores, UBO-adjacent linkage; the de-facto registry reseller. | BORME open data + paid Registro Mercantil deposited accounts + BOE — their entire base layer is public; we can replicate the event layer free via the BORME API, while per-company financials remain paid at the registry. |
| Axesor (a Grupo Experian company, local) | Ratings, company data and risk scores on Spanish companies; MARF rating agency presence. | BORME, deposited accounts via Registradores, RPC insolvency register, court/gazette edicts. |
| Iberinform / Insight View (Crédito y Caución, local) | Company risk data platform on Spain/Portugal. | Same public base: BORME, Registro Mercantil accounts, RPC. |
| Webcapitalriesgo (local, semi-academic) | VERIFIED live. Long-run Spanish VC/PE statistics, reports and 30k-article news archive; the historical-series reference for the market. | SpainCap surveys, CNMV ECR register, self-collected deal press — its published aggregates are citable context. |
| Brainsre (local RE data platform) | Spanish real-estate data/analytics platform + free news arm (brainsre.news, verified RSS). | Catastro open data, Registradores property data, SOCIMI filings on BME Growth, land-registry statistics — the public RE layer we can also tap. |

### FI — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (now BlackRock) | Strong on Finnish GP/LP fund-level data: FVCA-member buyout/VC funds, pension LPs (Keva, Varma, Ilmarinen) commitment tracking, fundraising and performance. Thin on Finnish service graph, NPL/distressed, and anything below institutional fund size. | FIN-FSA AIFM/ManCo authorizations, Pääomasijoittajat (FVCA) member and statistics publications, pension providers' own annual/interim reports (Keva, TELA members), press releases — all directly reachable via the FIN-FSA supervised-entities register, paaomasijoittajat.fi, tela.fi/keva.fi listed above. |
| PitchBook | Good Finnish deal coverage (M&A, PE buyouts, VC rounds) and company financials; weaker on LP granularity and local insolvency/credit events. | PRH trade register + financial statements (the avoindata.prh.fi iXBRL API is the direct route), Nasdaq Helsinki disclosures via GlobeNewswire/STT, press wires, FVCA statistics. |
| Dealroom | Best-in-class Finnish startup/VC ecosystem mapping (works with Nordic ecosystem orgs); rounds, valuations, investor graphs. Not focused on debt, real assets, or service graph. | PRH/YTJ open data for entity backbone, Business Finland and FiBAN announcements/statistics, ArcticStartup and Yle/HS press coverage, Tesi portfolio disclosures — all cataloged above as direct sources. |
| Crunchbase | Broad but shallow Finnish startup coverage; self-reported profiles plus press-derived rounds. Frequent gaps and stale data outside VC. | Press releases (STT Info/Epressi wires), company self-reporting, news coverage — nothing they use that we cannot reach via the wires and Yle/HS feeds directly. |
| Suomen Asiakastieto / Enento Group (local) | The dominant local company & credit information provider: credit ratings, payment defaults, financials, real-estate/condo data, ESG scores. Covers ALL Finnish companies — the credit/distress layer global platforms lack. Commercial product; do not scrape. | PRH trade register + financial statements, Legal Register Centre insolvency register, enforcement (ulosotto) data, Vero tax data, court payment-default records — the public originals are avoindata.prh.fi, maksukyvyttomyysrekisteri.om.fi and Vero open data, all cataloged above. |
| Vainu (local) | Nordic sales-intelligence over 5M+ companies (FI/SE/DK/NO): firmographics, financials, group structures, technographics, change signals. Strong entity backbone, no alternatives-specific intelligence. | States 'official sources' + financial statements — in practice PRH/YTJ open data and filed financials (avoindata.prh.fi APIs), plus company websites. We reach the same registries directly at $0. |
| Alma Talent Tietopalvelut (local, Kauppalehti companies) | Kauppalehti-branded company information, financials, decision-maker data and TE-500 style rankings; deeply integrated with Alma's business media. Commercial; do not scrape. | PRH trade register, filed financial statements, official announcements (gazette/insolvency) — same public originals we ingest via avoindata.prh.fi and the insolvency open data. |
| Inderes (local) | Community equity research covering nearly the whole Nasdaq Helsinki main list + First North: estimates, recommendations, insider-trade tracking. Listed-equity only, not private alternatives — but the best public window on Finnish listed RE funds/REIT-likes. | Nasdaq Helsinki company disclosures (GlobeNewswire/STT wires), company IR pages, FIN-FSA prospectus register — all direct-access sources in our catalog. |
| KTI Property Information (local) | The authority on Finnish institutional real estate: transaction volumes, rental indices, special investment fund (open-ended RE fund) reviews. Subscription product with meaningful free annual reports. | Own proprietary surveys (not replicable), plus public deal press releases and FIN-FSA special-investment-fund registrations — the public slice is reachable via FIN-FSA registers and the release wires. |
| Finder.fi (Fonecta, local) | Free-tier company lookup (financials snapshots, Business IDs, officers) used widely by Finnish professionals; consumer-grade, no alternatives angle. | PRH/YTJ open data and filed financials — identical originals to avoindata.prh.fi. |

### FR — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (global) | Strong on French GPs, funds, performance and LP commitments (Bpifrance, insurers, ERAFP/FRR mandates); weaker on deal-level and mid-market detail. | AMF GECO/SGP register (fund-manager universe), France Invest activity & performance reports, BALO fund notices, LP annual reports (ERAFP, FRR, insurers), press releases — all directly accessible to us. |
| PitchBook (global) | Good FR PE/VC deal and valuation coverage, cap tables inferred from filings; strong advisor mapping. | INPI RNE filings and annual accounts (open API/SFTP), BODACC events (open API), Euronext/AMF regulated disclosures via info-financiere.gouv.fr, company press releases. |
| Dealroom (global/regional) | Powers the official La French Tech ecosystem map — deepest FR startup/VC round coverage of the globals. | INSEE Sirene + INPI RNE open data for firmographics, press/startup-media (Maddyness, FrenchWeb, Sifted class), self-reported profiles, France Invest/EDF-style association stats. |
| Crunchbase (global) | Broad but shallow FR coverage; rounds from press and self-report, patchy on non-tech alternatives. | Press releases and startup media, Sirene-derived registry data via aggregators — nothing we cannot get from Sirene + RSS feeds directly. |
| CFNEWS / CFNEWS IMMO (local, France) | THE French deal reference: near-exhaustive mid-market M&A/LBO/venture and real-estate deal tables, advisor league tables, nominations; subscription DB. | Own journalism plus BODACC/greffe filings, actulegales JAL announcements, advisor deal submissions and press releases; its free RSS layer (18 feeds) is itself a usable public signal source for us. |
| Pappers (local, France) | Free full-text French company intelligence (filings, accounts, beneficial-owner history where public); has become the default FR company lookup. | Built ENTIRELY on public open data — INPI RNE API/SFTP, BODACC open data, BALO, Infogreffe documents, Sirene — the clearest proof-of-route: everything Pappers shows, we can ingest from the same open endpoints at $0. |
| Societe.com (local, France) | Mass-market company lookups, financials, legal events; ad/freemium model. | Sirene, RCS/Infogreffe, BODACC — same open stack as Pappers. |
| Altares (D&B France) / Ellisphere (local credit bureaus) | Credit risk, payment behavior, firmographics for the full FR company universe; sell scores not intelligence. | Greffes/Infogreffe filings, BODACC, Sirene, annual accounts from RNE; their proprietary layer (payment data) is not public — the registry layer underneath is. |
| Xerfi (local, France) | Sector research studies (incl. asset management, real estate, NPL-adjacent sectors); analysis product, not entity data. | INSEE statistics, Banque de France/Webstat series, annual accounts from RNE — context sources we already catalog. |

### GB — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Deepest global alt-funds coverage — UK GPs, LPs, fund performance, dry powder; strong on pensions/insurers as LPs. | FCA Financial Services Register (AIFM/manager authorisations), Companies House accounts of fund GPs/LLPs (UK LLP accounts disclose carry vehicles), local-authority pension fund FOI/committee papers, LSE/RNS disclosures — all directly accessible to us. |
| PitchBook (Morningstar) | UK M&A/PE/VC deal coverage, valuations, service-provider league tables. | Companies House filings (SH01 share allotments, charges), RNS announcements via LSE, The Gazette insolvency notices, press releases — the SH01/charges route is fully open via CH API. |
| Dealroom.co | Strong UK/European startup and VC round coverage; powers several UK government/ecosystem reports. | Companies House incorporations and filings, press/funding announcements, accelerator and university spinout lists, Innovate UK/UKRI grant data (GtR API). |
| Crunchbase | Broad but shallow UK startup coverage; self-reported plus press. | Press releases and startup-media announcements (Sifted/UKTN-type sources we ingest directly); little registry depth. |
| Beauhurst (LOCAL, London) | The key UK-native competitor: tracks every UK high-growth company incl. UNANNOUNCED equity rounds, at 8-figure company coverage. | Their visible moat is systematic parsing of Companies House filings — SH01 (allotment of shares) forms reveal fundraises never press-released, plus PSC data, accounts and The Gazette. Every one of those inputs is free via the CH API/bulk products; this is the single most instructive public-source blueprint for our UK build. |
| With Intelligence (London) | Hedge fund, private-credit and asset-owner (LP) data; events-driven; strong UK/EU institutional coverage. | FCA register, US SEC ADV filings, pension-scheme annual reports and local-authority committee documents — the UK LGPS committee-paper route is public and underused. |
| Debtwire / Mergermarket (ION Analytics) | Distressed debt, NPL, restructuring and leveraged-credit intelligence with strong London desk. | The Gazette insolvency notices, Companies House charge registrations (secured lending events), court lists/Find Case Law, administrators' progress reports filed at CH — all directly ingestible. |
| FullCircl / Creditsafe / Endole (UK company-data resellers) | Commodity company-data layers over the registry; not alts-specific but show the data plumbing. | Companies House bulk products and streaming API, Gazette feeds, accounts iXBRL — confirming those are the canonical $0 routes. |

### GR — 7 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Thin-to-moderate Greece coverage: the handful of institutional Greek GPs (mostly EquiFund-era VCs and a few PE/infra managers), Greek exposure of pan-European funds, and some LP records (HDBI, insurance groups). Weak on NPL servicers, service graph, and non-fund entities. | HCMC AIFM lists (via Greek access), ESMA registers, HDBI/EIF EquiFund portfolio disclosures, fund manager websites and press releases — all reachable directly (ESMA + HDBI portfolio page + press). |
| PitchBook | Deal-level coverage of Greek PE/VC and M&A, decent on larger buyouts (CVC/BC Partners activity in Greece), valuations mostly modeled. Weak on private debt/NPL trades and real-asset SPVs. | Press (Kathimerini/Capital/Naftemporiki English wires), ATHEX announcements, GEMI filings for cap-table confirmation, EU/EIF and EBRD project disclosures — GEMI, ATHEX, Diavgeia and EBRD project docs are directly accessible. |
| Dealroom | Strongest global platform for the Greek startup/VC layer; powers or overlaps with the annual 'Startups in Greece' reporting (with Found.ation/Marathon ecosystem actors). Company-level coverage broad, funding data crowdsourced+press. | Elevate Greece registry, The Recursive and Greek startup press, EIF/EquiFund fund lists, founder self-reporting — Elevate Greece and The Recursive RSS are direct routes. |
| Crunchbase | Broad but shallow Greek company/round coverage, self-reported and press-driven; frequent gaps and stale entries outside VC. | Press releases, company self-submissions, TechCrunch-style media — the underlying Greek press (verified RSS set above) is directly ingestable. |
| ICAP CRIF (local leader) | Deepest Greek firmographics: credit ratings, financial statements, sector studies, business directories covering the whole corporate universe incl. servicers and real-estate companies. Paid; the de facto local Preqin-for-firmographics. | GEMI/businessportal filings and financial statements, FEK (et.gr) corporate acts, court/protest data, ELSTAT — GEMI publicity search, search.et.gr and ELSTAT are all directly accessible public feeds. |
| Infobank Hellastat (IBHS, local) | Greek business information and sector risk reports; company financials and demographics. Similar public underpinnings to ICAP at smaller scale. | GEMI filings, FEK, ELSTAT business registers — all direct. |
| Tiresias (Teiresias S.A., local credit bureau) | Bank-owned credit bureau: defaults, bounced cheques, credit profiles. Not publicly accessible (bank/consent-gated) — relevant as the reason public insolvency signals must come from solvency.gov.gr, Diavgeia and FEK instead. | Court registries, protested bills, bank submissions — the public slice we can reach directly is the Electronic Solvency Register and FEK insolvency notices. |

### HR — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Thin-but-real Croatia coverage inside its CEE universe: AIFMs, PE/VC fund vehicles, some LP commitments (EIF/EBRD-backed funds). Weak on service graph, NPLs, and anything below institutional fund size. | HANFA AIF/UCITS registers, CVCA membership, EIF/EBRD press releases, fund-manager websites and annual reports — all directly reachable by us (hanfa.hr/registri, cvca.hr). |
| PitchBook | Croatian deal coverage driven by press and pan-EU filings; decent on VC rounds touching Croatian startups, weak on local mid-market PE, real assets, and credit. | Press releases and media (Poslovni, Netokracija, Forbes HR), sudski registar company events, ZSE disclosures — we can go straight to sudreg API + eho.zse.hr feeds. |
| Dealroom | Best global coverage of the Croatian startup/VC ecosystem (works with regional ecosystem orgs and publishes CEE reports); startup-only lens — no credit, real assets, or service graph. | Self-reported startup profiles, Netokracija and regional tech media, CVCA/CRANE ecosystems, Crunchbase cross-referencing, HAMAG-BICRO program lists — the underlying registries (sudreg, Fina RGFI) are stronger primary routes. |
| Crunchbase | Self-reported Croatian startup/investor profiles; patchy financials, no registry grounding. | Self-submission + news scraping; nothing they have that sudski registar + RGFI + Netokracija don't give us directly. |
| Poslovna.hr (Bisnode / Dun & Bradstreet SEE) | Deep local company-data coverage: financials, scores, ownership links for the full Croatian corporate register. No alternatives/fund lens at all. | Fina RGFI financial statements, sudski registar, Narodne novine oglasni dio, court/insolvency notices (e-Oglasna) — every input is public and catalogued above. |
| Fininfo.hr | Local company-information portal: financial statements, blocked-account status, insolvency flags for HR companies. Volume play, no investment-industry structuring. | Fina RGFI, Fina blocked-accounts data, sudski registar, e-Oglasna bankruptcies — all direct-access public sources. |
| CompanyWall Business (companywall.hr) | Regional (HR/RS/BA/ME/SI) company data and credit scores; strong on cross-border SEE entity linkage, nothing on funds/alternatives. | Same public trio: sudski registar, Fina RGFI, official gazettes/insolvency boards across the region. |
| Fina info.BIZ (incumbent state provider) | Fina's own commercial product over its RGFI monopoly data: financials, sector analytics, rankings. The benchmark for what 'complete Croatian financials' means. | Fina's internal RGFI + payment-transactions data; the public free route to the same statements is RGFI javna objava (50 docs/day). |

### HU — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (global) | Thin-to-moderate Hungary coverage: the larger HU GPs and state-linked funds (Hiventures, MFB group vehicles), some LP records for pension funds and insurers, fundraising/AUM estimates. Weak on service graph, NPL/servicers, and niche alts. | HVCA and Invest Europe member lists/statistics, MNB licensee register (fund manager licenses), ESMA AIFM register, fund annual reports via e-beszamolo-type filings, press releases from GPs — all directly accessible to us. |
| PitchBook (global) | Deal-level HU PE/VC coverage (buyouts, VC rounds, exits) with reasonable recall on announced deals; valuations mostly estimated. Little on private debt, real assets or the institutional service graph. | Hungarian business press (Portfolio.hu, Forbes.hu, Telex/G7, VG), company-register events (Cégközlöny incorporations/changes), HVCA deal statistics, exchange disclosures (BÉT) — we can ingest each at source. |
| Dealroom (global, ecosystem partnerships) | Hungarian startup/scaleup mapping is decent via CEE ecosystem reports and local partnerships; strong on founder/round taxonomy, weak on non-tech alternatives. | Startup Hungary reports, HVCA/EIF program announcements, press (Forbes.hu, Portfolio), accelerator/portfolio pages (e.g. Hiventures portfolio) — all public routes we can hit directly. |
| Crunchbase (global) | Self-reported + press-driven HU startup coverage; patchy on rounds below Series A and on anything non-tech. Entity data often stale versus the company register. | Company self-submissions and English-language press (BBJ, Daily News Hungary); the authoritative upstream (e-cégjegyzék, e-beszámoló) is public and ours to use. |
| Opten (local, Hungary) | The leading Hungarian company-information provider: full registry mirror, financials, litigation/insolvency flags, ownership networks, credit scores. This is the local benchmark for entity depth. Do not scrape. | Bulk registry data purchased from the Céginformációs Szolgálat, Cégközlöny gazette feed, e-beszamolo financial statements, NAV public databases, court/insolvency publications — every underlying source is public or purchasable from the state directly. |
| Céginfo.hu (local, Hungary) | Second major local company-data provider; similar registry-derived offering (company data, financials, monitoring, risk flags). Do not scrape. | Same state pipeline: Céginformációs Szolgálat bulk data, Cégközlöny, e-beszamolo, NAV lists. |
| Dun & Bradstreet Hungary (ex-Bisnode) | Registry-derived firmographics, credit ratings, UBO-adjacent linkage analysis for Hungary within a global graph. Strong corporate-hierarchy data; nothing alternatives-specific. | State registry bulk data, e-beszamolo filings, NAV databases, gazette publications. |
| EMIS (CEE-focused aggregator) | Aggregates Hungarian macro, sector reports, company financials and local news for emerging markets; decent sector-level context, shallow on fund-level alternatives. | KSH statistics, MNB statistics/Aranykönyv, local press licensing (Portfolio, VG), registry-derived financials — the public layers (KSH, MNB, filings) are directly accessible to us. |

### IE — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Deep coverage of Ireland as a fund domicile — Irish AIFMs, ICAVs, QIAIFs, fund administrators, plus Irish LPs (ISIF, pension schemes). Strong on fund-level terms and service-provider relationships; weaker on small domestic GPs and portfolio-company granularity. | Central Bank authorisation lists (pre-robots era) and ESMA registers, CRO filings, ISIF published portfolio and annual reports, pension-scheme annual reports, Irish Funds publications, press releases — all reachable directly via ESMA registers, opendata.cro.ie, isif.ie/portfolio, pensionsauthority.ie. |
| PitchBook | Good Irish PE/VC deal coverage (buyouts, growth, VC rounds) and law-firm/advisor league tables; captures Enterprise Ireland co-investments unevenly. | CRO filings (share allotments B5s reveal rounds), IVCA quarterly VentureP ulse-style reports, Enterprise Ireland Seed & Venture reports, Euronext Dublin disclosures, Irish Times/Silicon Republic/The Currency press — all public: opendata.cro.ie, ivca.ie, enterprise-ireland.com, live.euronext.com. |
| Dealroom | Irish startup ecosystem mapping (often in partnership with local ecosystem bodies); strong on rounds/valualready-public signals, thin on credit, real assets and the service graph. | TechIreland's open startup database, press (Silicon Republic, TechCentral), accelerator/portfolio pages (NDRC, Dogpatch), CRO for incorporation data — direct routes: techireland.org, siliconrepublic.com/feed, opendata.cro.ie. |
| Crunchbase / CB Insights | Broad but shallow Irish startup/funding coverage, self-reported profiles plus press scraping; frequent gaps on Irish-registered holding structures. | Company self-submission, press releases, Silicon Republic and international tech media — the underlying public layer is the same press + CRO incorporations we ingest directly. |
| CRIF Vision-net (vision-net.ie) — LOCAL | The dominant Irish company-information provider: full CRO mirror, credit scores, director networks, daily judgments/insolvency alerts. This is the local benchmark for the entities side. | CRO bulk data and filings, Iris Oifigiúil (receiverships), CRO Gazette (strike-offs/liquidations), court judgments and registered judgments, ISI registers — every one available directly: opendata.cro.ie, irisoifigiuil.ie, courts.ie, gov.ie ISI registers. |
| SoloCheck (solocheck.ie) — LOCAL | Consumer-grade Irish company reports and director searches; lighter than Vision-net but shows what a lean CRO-derived product looks like. | CRO open data + document images, CRO Gazette notices — direct route: opendata.cro.ie. |
| Kyckr — LOCAL-origin (registry aggregation) | Irish-founded KYB provider reselling live registry lookups across 120+ registers incl. CRO; relevant as proof the CRO Open Services API supports commercial real-time products. | CRO Open Services API directly — the same keyed API route documented at cro.ie/services-and-help/access-to-cro-data/. |
| TechIreland (techireland.org) — LOCAL | Non-profit open database of Irish startups/innovation (companies, funding, female-founder reports). Semi-open — closest local analogue to a public startup graph; partner data source for Dealroom. | Community submissions, press announcements, Enterprise Ireland/IDA announcements — all public; we can ingest the same press layer (Silicon Republic, RTÉ, The Currency feeds verified above). |
| The Currency — LOCAL (editorial intelligence) | Not a database but the highest-signal Irish deals/courts/funds journalism; effectively the qualitative competitor for 'what's happening in Irish alternatives'. | Court filings and hearings (Commercial Court), CRO documents, Iris Oifigiúil, interviews — underlying registers all in our catalog; their RSS feed (verified) is itself an ingestible headline signal. |

### IS — 6 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Keldan (keldan.is, local — Iceland's main commercial company-data portal) | Icelandic companies, financial statements, ownership/management, market data, legal-gazette monitoring; freemium/subscription. The de-facto local benchmark for entity data UX. Site is a JS SPA (returned only shell to fetchers). | Skatturinn fyrirtækjaskrá + ársreikningaskrá, VAT register, Lögbirtingablað notices, Nasdaq Iceland market/disclosure data, property/vehicle registers — all cataloged above and reachable directly. |
| Creditinfo (Icelandic-founded global credit bureau; Creditinfo Ísland) | Credit reports, default registers, company monitoring for Iceland; subscription. Strong on private-debt/NPL-relevant signals (defaults, insolvency). | RSK company & annual-accounts registers, Lögbirtingablað bankruptcy/enforcement notices, district-court data — direct public routes cataloged above. |
| Preqin | Thin but present Iceland coverage: pension funds as LPs (the 18 Landssamtök lífeyrissjóða members), a handful of GPs (Frumtak, Crowberry, Brunnur, VEX, Alfa Framtak, Kvika AM funds). | Central Bank supervised-entities & fund registers, pension-fund annual reports (public PDFs on each fund's site), association member lists, press releases. |
| PitchBook | Icelandic VC/PE deals and funds, mostly deal-level from press; covers exits of listed companies via Nasdaq Iceland. | Press/RSS (Northstack, Innherji, Vísir, mbl), Nasdaq Iceland disclosures via GlobeNewswire, company register lookups. |
| Dealroom | Iceland startup/scaleup universe and funding rounds; sometimes partners with Nordic ecosystem bodies; company pages seeded from registries + news. | Fyrirtækjaskrá basics, KLAK/ecosystem program cohorts, Northstack and English-language press, Framvís member funds' portfolio pages. |
| Crunchbase | Shallow Iceland coverage — self-reported profiles plus press-scraped rounds for the visible startups (e.g. Kerecis-type stories). | Press releases and English media (Iceland Review, Grapevine, Northstack), founder self-submission. |

### IT — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Strong on Italian GP/LP fund data (SGRs, closed-end FIA funds, fundraising, LP commitments from casse di previdenza and fondazioni); weak on sub-institutional deals and service-graph entities. | Banca d'Italia SGR/SICAF albi, COVIP pension fund albo and annual reports, ACRI/AdEPP annual reports, fund annual reports filed at Registro Imprese, AIFI/PwC semi-annual market statistics. |
| PitchBook | Good Italian PE/VC deal and valuation coverage, cap tables reconstructed from filings; patchy on private debt, NPL and real assets. | Registro Imprese/InfoCamere company filings (via commercial resellers), Borsa Italiana/Euronext listing notices, Gazzetta Ufficiale, press (Il Sole 24 Ore, MF, BeBeez). |
| Dealroom.co | Best-in-class Italian startup/VC ecosystem mapping (runs co-branded ecosystem reports with local agencies); little depth beyond VC. | startup.registroimprese.it innovative-startup special section (public downloadable register), Italian Tech Alliance and CDP Venture Capital announcements, startup press (StartupItalia, Startupbusiness, EU-Startups). |
| Crunchbase | Broad but shallow Italian startup/funding-round coverage, heavily crowd-sourced; weak entity hygiene (duplicates, stale statuses). | Press releases and startup media, self-reported profiles; the underlying verifiable layer is the same innovative-startup register and funding announcements we can ingest directly. |
| BeBeez Private Data (EdiBeez) | THE local benchmark: Italian private equity, venture, private debt, NPL and M&A deal database built on 10+ years of BeBeez reporting; subscription product, do not scrape. | Own newsroom reporting plus Registro Imprese filings, Borsa Italiana notices, Gazzetta Ufficiale, court/insolvency announcements — all public routes we can go to directly. |
| Cerved | Dominant Italian company-information and credit-risk group (also a major NPL servicer via Cerved Credit Management); full financials on all Italian companies. | Bulk licensed InfoCamere/Registro Imprese feed (bilanci, cariche, soci), Gazzetta Ufficiale and court/insolvency records, protesti registers — the register-grade layer is reachable via Telemaco, just paid. |
| CRIF | Credit bureau + business information on Italian companies (Margò/SkyMinder products); strong on credit events and ownership chains. | Same InfoCamere registry ingest, Banca d'Italia intermediary lists, insolvency/PVP auction data. |
| Moody's/Bureau van Dijk (AIDA, Orbis) | AIDA is the standard academic/PE screening database for Italian company financials (10 yrs of accounts, ownership); licensed product. | InfoCamere financial statements and shareholder filings — originals are obtainable per-document from registroimprese.it/Telemaco. |
| Leanus + local observatories (Osservatori Politecnico di Milano, AIFI/PwC, Osservatorio VeM) | Leanus: Italian financial-statement analytics platform; the PoliMi startup/VC observatories and AIFI/PwC and VeM reports are the reference market statistics for Italian VC/PE — free PDF layers we can cite. | Registro Imprese accounts (Leanus), AIFI member surveys, innovative-startup register, public deal press — the free report PDFs themselves are usable signal sources. |

### LI — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Thin Liechtenstein coverage: a handful of LI-domiciled AIFs/AIFMs and service providers; LI usually folded into DACH/Europe aggregates. No LI-specific depth on foundations/trust structures. | FMA register of licensees (register.fma-li.li), LAFV fund list/API, fund prospectuses/annual reports — all directly accessible to us. |
| PitchBook / Morningstar | Sparse LI deal and company coverage (occasional VP Bank/LLB corporate actions, rare LI startup rounds). Morningstar carries LI-domiciled UCITS/AIF fund data. | LAFV fund data (public API), SIX Swiss Exchange disclosures for LLB/VP Bank, press releases, Handelsregister extracts. |
| Moody's Orbis (Bureau van Dijk) / Dun & Bradstreet | Firmographic records for LI legal entities incl. foundations and Anstalten; strongest commercial coverage of the LI register but resold at high cost. | Handelsregister.li extracts (paid certified extracts), eAmtsblatt commercial-register publications, GLEIF LEI data — the gazette + LEI routes are free to us. |
| North Data | DACH-focused register intelligence; Liechtenstein coverage limited/unclear (its core is German-style register publications). Not a meaningful LI moat. | Official gazette publications (for LI that would be the eAmtsblatt) and register indices — both directly accessible. |
| OpenCorporates | Liechtenstein is effectively absent/limited — the Handelsregister has no open-data licence or bulk route, which blocks their model. Confirms the gap we can fill via gazette-driven ingestion. | Where covered, national registers; for LI no open route exists — the workaround is eAmtsblatt publications + GLEIF. |
| Bloomberg / LSEG Refinitiv | Cover the two listed LI banks (LLB, VP Bank) and LI-domiciled fund NAVs/ISINs; no private-market or foundation depth. | SIX Swiss Exchange market data, LAFV fund data/API, issuer IR pages, FMA announcements. |
| fundinfo (FE fundinfo) | Distributes documents/NAVs for LI funds (KIDs, prospectuses) — overlaps directly with the LI fund universe. | Fund documents supplied by LI ManCos; the same universe is publicly enumerable via the LAFV fund list + API, which is LI's official fund publication organ. |
| Dealroom / Crunchbase | A few dozen LI startups/scaleups (fintech/blockchain skew); patchy, self-reported, often mis-geocoded to CH. | Self-reported profiles, press (Vaterland, startupticker), Digital Liechtenstein ecosystem lists — all reachable directly. |

### LT — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Thin, fund-level Baltic coverage: LT VCA-member funds (BaltCap, Livonia, Practica, Iron Wolf, Coinvest et al.) with AUM/vintages; weak below fund level and on service graph. | Bank of Lithuania AIFM/CIU register, LT VCA statistics and member list, EIF/InvestEU press releases, fund websites — all directly accessible to us. |
| PitchBook | Deal-level LT VC/PE coverage, decent on rounds and exits; company financials thin (relies on registry re-sellers). | Press releases (vz.lt, 15min, Baltic Times), Nasdaq Baltic disclosures, JAR filings via aggregators, Startup Lithuania announcements. |
| Dealroom | Strongest startup/VC coverage of Lithuania — it literally powers the official Startup Lithuania database (white-label), so its LT data is quasi-official. HARD RULE: do not scrape Dealroom or the embedded database. | Startup Lithuania submissions, Innovation Agency data, funding-round press, registry legal-form data — we go to Startup Lithuania news, press RSS, and JAR directly. |
| Crunchbase | Patchy self-reported LT startup profiles; funding data lags Dealroom; no NPL/real-assets/service-graph coverage. | Company self-submissions and TechCrunch-style press — the underlying LT press (15min, vz.lt, Made in Vilnius) is directly accessible. |
| CB Insights | Minimal Lithuania coverage; occasional fintech-market mentions only. | Invest Lithuania fintech reports, Bank of Lithuania licensing statistics — both public. |
| Rekvizitai.lt (Verslo žinios) | LOCAL. The de-facto public company directory of Lithuania: profiles, financial summaries, employees, debts. Blocks scrapers; commercial re-use restricted. | JAR raw open data (Registrų centras), RC financial statements, Sodra open data (employees/wages/debts) — we ingest those primary routes at $0 instead. |
| Okredo | LOCAL. Lithuanian company-data/credit-risk API startup (freemium), LT+LV coverage, sells API access. | JAR bulk data, Sodra open data, court/insolvency records (LITEKO/AVNT), procurement data — all public primaries listed in this catalog. |
| Creditinfo Lietuva | LOCAL. Incumbent credit bureau; company reports, scoring, debtor registry; LBA associate member. | JAR, Sodra, courts, plus proprietary bank payment data (not replicable, and we don't need it). |
| Scorify | LOCAL. Lithuanian credit-scoring/company-monitoring provider built on open registers. | JAR raw data, Sodra open data, insolvency data — same public primaries we catalog above. |

### LU — 7 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Deep coverage of Luxembourg as Europe's #1 fund domicile: AIFs, RAIFs, SIFs, SCSp structures, AIFM/ManCo mapping, LP commitments into LU vehicles. Weak on the local service-provider graph below top-tier admins. | CSSF official lists and bulk XLSX files (AIFM/UCI/AIF lists), LBR/RCS filings and RESA publications, LuxSE prospectuses and official list, ALFI/LPEA reports and statistics — all directly accessible to us. |
| PitchBook | Strong on PE/VC deals and funds whose vehicles sit in Luxembourg (SCSp/SCA fund entities, holdcos); good GP/LP linkage. LU-specific entity depth is filings-driven and patchy for smaller structures. | RCS/RESA incorporation and capital-change filings, LuxSE bond/fund listings, press (Paperjam, Delano, wire services), fund-manager websites. |
| Dealroom | Powers the official national startup database (Startup Luxembourg with Luxinnovation), so LU startup/VC coverage is unusually good for a small market; thin on funds, credit, real assets. | Luxinnovation ecosystem data, startup self-reporting, Silicon Luxembourg and general press, registry cross-checks against RCS — the underlying public routes (Luxinnovation, press, RCS) are open to us. |
| Crunchbase | Basic LU startup and funding-round coverage; self-reported and press-driven, weak entity resolution against RCS names; almost no fund/AIFM coverage. | Press releases, Silicon Luxembourg-type media, company self-submissions. |
| Monterey Insight (local specialist) | The Luxembourg Fund Report — the reference local dataset on fund service providers: market shares of fund administrators, custodians/depositaries, auditors, legal advisers, ManCos per fund. Exactly our category-6 service graph. | Fund annual reports and prospectuses (filed via RCS/LuxSE), CSSF UCI/AIF lists, LuxSE official list — all public and directly harvestable by us. |
| Kneip (Deutsche Börse) / LuxSE-Fundsquare data services | LU-based fund reference-data and reporting utilities; cover fund document/data dissemination for domiciled funds. Infrastructure providers more than intelligence competitors, but their existence shows the underlying data flows. | CSSF filings, fund prospectuses/KIDs, LuxSE official list — the official-list and CSSF routes are open. |
| OpenCorporates / Kyckr / Topograph / Zephira (registry resellers) | Resell or guide access to LU company-register data; OpenCorporates lists the RCS as register #144. Coverage is raw register-grade with no alternatives-specific enrichment. | LBR RCS portal and open-data API, RESA gazette, data.public.lu CC0 datasets — confirming our direct tier-1 route is viable. |

### LV — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Thin but present Baltic coverage: the handful of institutional-grade LV GPs (BaltCap, INVL, Livonia Partners, FlyCap, Expansion Capital) and Altum as LP/fund-of-funds; fund closes and mandates, little below the top tier. | Latvijas Banka AIFM/ManCo register (licensing events), LVCA membership and yearbook, Altum program announcements, fund press releases — all directly accessible to us. |
| PitchBook | Baltic VC/PE deal coverage is decent for rounds with press; company financials for LV are weak. Strong on cross-border acquirers of Latvian targets. | Nasdaq Baltic issuer disclosures, press releases, Delfi/DB business press, UR registry data via re-users — we can go to UR open data and Nasdaq Baltic news directly. |
| Dealroom | Best-in-class Latvian startup/VC graph — works with national ecosystems; Latvian startup counts, rounds, investor mapping. | Startin.LV startup database and Latvian Startup Report, LIAA/Labs of Latvia ecosystem reporting, self-reported profiles — startups.startin.lv and LIAA are directly public. |
| Crunchbase | Self-reported Latvian startup profiles and funding rounds; patchy amounts, stale after seed stage. | Company self-submissions plus tech press (ArcticStartup, Labs of Latvia) — the underlying press is public. |
| Lursoft (lursoft.lv) | THE local incumbent: full LV company data, annual reports, pledges, insolvency, media monitoring, beneficial-owner and litigation flags. Site 403s to bots (paid product). Not to be scraped — but its existence proves the deterministic build path. | Licensed re-user of Uzņēmumu reģistrs, Insolvency Register, Commercial Pledge Register, court data, Latvijas Vēstnesis — every one of which we catalogued as a direct public source. |
| Firmas.lv | Verified local provider: consolidated legal/factual company DB, industry search, monitoring, micro-payment access. Explicitly labels itself a UR data re-user. | Uzņēmumu reģistrs/Commercial Register, Insolvency Register, Commercial Pledges Register, Land Registry, CSDD vehicle data — all public routes we hold. |
| CrediWeb / Creditreform Latvija | Credit-risk profiles, payment-behavior scores and debtor lists on LV companies (not verified by fetch this session; long-standing provider). | UR registry, VID tax-debtor publications, insolvency register, court/gazette announcements — direct public equivalents catalogued above. |
| LETA / Nozare.lv | National news agency with paid sector-news service (Nozare.lv) — the deepest paid LV business-news layer; excluded from our source list because it is subscription-only. | Own reporting plus gazette/registry monitoring; the free public layer (Latvijas Vēstnesis, UR open data, ministry press) is what we ingest directly. |

### ME — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| EMIS (ISI Emerging Markets) | The deepest commercial coverage of Montenegro among global providers: company financials, industry reports, macro data, and news monitoring for the ME market. | CRPS company registrations, statutory financial statements filed with the Revenue and Customs Administration, MONSTAT statistics, CBCG data, and local media (Vijesti, MINA, Pobjeda) — all of which we can go to directly. |
| CompanyWall Business Montenegro (companywall.me) | Local/regional credit-reporting platform with a dedicated Montenegrin company database: financials, blocked-account status, ownership, court/bankruptcy flags. | CRPS register data, annual financial statements from the tax authority, Commercial Court/gazette insolvency announcements, CBCG blocked-account data — the direct public routes are CRPS, Službeni list, and sudovi.me. |
| Dun & Bradstreet (via Bisnode legacy SEE network) | WorldBase-level firmographics for Montenegrin entities used for compliance/KYB; no alternatives-specific intelligence. | CRPS register extracts and gazette notices, resold through local partners; the primary source is CRPS which we target directly. |
| Preqin | Near-zero dedicated Montenegro content — the country appears only inside Balkans/CEE-mandate funds' geographic footnotes; no local GP/LP profiles of substance. | Fund-manager self-reporting plus regulator lists; for ME the underlying public route is the SCMN fund-manager and fund registers, which we catalog directly. |
| PitchBook | Sparse: a handful of Montenegrin companies/deals captured via regional M&A press; no systematic register coverage. | Press (SeeNews, IntelliNews, local portals) and advisor league-table submissions; the direct public equivalents are the news feeds and CRPS/MNSE disclosures in our catalog. |
| Dealroom | Thin Western-Balkans startup layer; Montenegro entries mostly via regional ecosystem reports rather than local partnership. | Self-reported startup profiles, Innovation Fund grant announcements, ICT Cortex ecosystem lists, The Recursive coverage — all public and cataloged here. |
| Crunchbase | A few dozen self-registered Montenegrin startups; stale and incomplete; no fund/LP layer. | Self-reporting and press releases; no registry ingestion for ME — nothing they have that CRPS + Innovation Fund + ICT Cortex don't provide directly. |
| SeeNews Data (AI/company-data arm of SeeNews) | SEE-regional company rankings (TOP 100 SEE) and news-derived corporate data including Montenegrin companies. | National registers and statistical offices across SEE (for ME: CRPS, MONSTAT) plus their own editorial wire — the register routes are in our catalog. |

### MK — 6 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Dealroom (+ Startup Macedonia data platform) | Best structured coverage of the MK startup/VC slice. Startup Macedonia's app.startupmacedonia.mk is a Dealroom-style ecosystem database (startups, support orgs, investors); Dealroom's global platform carries the same thin MK layer. Nothing on PE, credit, or real assets. | Startup Macedonia community submissions, FITR grant-call results, IT.mk/The Recursive press, company self-reporting. Direct routes for us: FITR grantee lists, Startup Macedonia public pages, IT.mk RSS. |
| Preqin / PitchBook | Near-zero dedicated MK coverage — a handful of regional funds (SEE-focused PE like Mid Europa-adjacent or EBRD-backed vehicles) tagged with North Macedonia as a geography. No local GP/LP depth; MK pension funds not profiled as LPs in any depth. | Press releases, fund-manager self-reporting, EBRD/EIF/IFC project disclosures. Direct routes for us: EBRD/EIF project pages, MAPAS pension registers, SEC fund-manager register. |
| EMIS (ISI Emerging Markets) | The deepest commercial company-financials coverage of MK: full-company financial statements, industry reports, news aggregation. Paywalled B2B product. | CRM annual accounts (paid distribution), State Statistical Office data, MSE/SEINet disclosures, local press (Kapital, Faktor). All of these are directly accessible to us: CRM paid channel, stat.mk PX-Web API, MSE RSS trio. |
| CompanyWall / Bonitet.mk / D&B partners (local credit bureaus) | Company credit reports, scoring and debtor flags for MK companies; sell repackaged registry data to local B2B users. | CRM company register + annual accounts (bulk distribution contract), UJP tax-debtor lists, court/insolvency announcements, gazette notices. Direct routes for us: identical public/paid-registry channels — no need to touch their platforms. |
| Crunchbase | Thin, self-reported MK startup profiles; funding data patchy and often missing FITR grants. | Founder self-submission and press. Direct route for us: FITR + IT.mk + The Recursive give better primary coverage. |
| SeeNews (data products) / TOP 100 SEE | Regional rankings and company intelligence including MK's largest companies by revenue; M&A and energy-deal newsflow. | CRM/SSO financials, MSE disclosures, company reports, own reporting. Direct routes for us: same registries plus MSE /en/rss/seinet. |

### MT — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Thin dedicated Malta coverage: Malta appears as a fund domicile (PIFs/NAIFs/AIFMs) and service-provider jurisdiction rather than a deal market; some Malta-domiciled AIFMs and funds profiled. | MFSA Financial Services Register / ESMA AIFM register, fund annual reports filed at MBR, press releases — all reachable directly via fsr.mfsa.mt (browser), registers.esma.europa.eu, and register.mbr.mt. |
| PitchBook | Covers Maltese companies mainly through gaming/fintech M&A and the occasional VC round; Malta-domiciled holdcos of foreign groups appear frequently. | MBR filings (via aggregators), MSE announcements, international deal press — direct routes: register.mbr.mt, MSE Officially Appointed Mechanism, BusinessNow.mt/Times of Malta. |
| Dealroom | Maintains Malta startup-ecosystem data (counts, funding); partners with national promotion bodies in other markets — Malta coverage largely self-reported plus press. | Tech.mt/Malta Enterprise announcements, startup press, Crunchbase-style self-reporting — direct routes: tech.mt news, maltaenterprise.com, BusinessNow.mt RSS. |
| Crunchbase | Sparse Malta coverage: gaming/crypto companies and a handful of funded startups; heavy reliance on self-reported profiles. | Self-reported data plus press; underlying verifiable layer is MBR company data and news — go direct to register.mbr.mt and the verified RSS feeds above. |
| Monterey Insight (Malta Fund Report) | The most Malta-specific competitor: annual Malta Fund Report ranking fund administrators, custodians, auditors, legal advisers and ManCos by assets serviced — exactly our Institutional Service Graph for Malta. | Direct surveys of service providers layered on the MFSA register universe — the public skeleton (who is licensed as administrator/custodian/ManCo) is reproducible from fsr.mfsa.mt + ESMA/EIOPA registers + MFSA annual report annexes. |
| OpenCorporates | Lists Malta as a jurisdiction sourced from the Malta Business Registry; depth/freshness varies given MBR's lack of open data. | MBR public register — go direct to register.mbr.mt (browser-grade) rather than relying on the aggregator. |
| Moody's Orbis / Kompany (BvD) | Malta company financials and ownership via registry-filings resale; used by compliance teams for Maltese holdcos. | MBR filed accounts and registry extracts (paid documents at source) — direct route is register.mbr.mt document purchase; beneficial-ownership access is legally restricted. |
| With Intelligence (ex-HFM/EuroHedge) | Covers Malta as a hedge-fund servicing domicile (ManCos, administrators, PIF regime commentary); largely editorial plus manager-reported data. | MFSA register + circulars, FinanceMalta materials, service-provider announcements — all reachable directly via the sources catalogued above. |
| WhosWho.mt / FinanceMalta directory (local) | Local quasi-competitors for the directory layer: WhosWho.mt (companies + executives + news), FinanceMalta member directory (finance-sector firms). Neither offers structured data export. | Self-registration by firms plus local press; both are themselves usable public sources (whoswho.mt verified accessible; financemalta.org needs browser access). |

### NL — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Strong on NL institutional LPs (APG, PGGM, MN, pension funds' alternatives allocations) and pan-European GP/fund performance; weaker on lower-mid-market NL deals and the service graph. | DNB pension fund register + pension funds' own annual reports (Dutch funds must publish detailed investment mixes), AFM AIFM register, fund annual accounts filed at KVK, manager press releases — all directly harvestable by us. |
| PitchBook (Morningstar) | Good NL PE/VC deal and valuation coverage, strong advisor league tables; US-centric bias, thin on NL private debt/NPL and real assets. | Press releases and news (FD, Silicon Canals equivalents), KVK filings for cap-table/financials confirmation, ACM merger decisions, Euronext disclosures — we can go to KVK/ACM/Euronext directly. |
| Dealroom.co (Amsterdam HQ — also a local provider) | The strongest NL startup/VC dataset; powers Techleap Finder and many Dutch government ecosystem reports; covers funding rounds, investor portfolios, ecosystem stats. Weak on non-VC alternatives (credit, real assets, LPs). | KVK register data, funding press releases, startup/investor self-reporting, Techleap ecosystem partnership, news media — the public underlying layer (KVK + press) is directly accessible to us; do not scrape Dealroom or Finder. |
| Crunchbase | Broad but shallow NL startup coverage; community-edited, patchy for funding amounts and anything non-tech. | Press releases, company self-submissions, news crawling — nothing NL-specific we can't get from Silicon Canals/Emerce/MT-Sprout feeds + KVK. |
| Company.info (FD Mediagroep) | The dominant local company-data provider: full Dutch register coverage, daily-updated, officially recognized KVK service provider, linked to FD news archive. B2B subscription; not an alternatives specialist but the data backbone many NL fintech/CDD tools resell. | KVK Handelsregister (official service-provider contract), deposited annual accounts, Centraal Insolventieregister, FD/BNR news archive — the public originals (KVK API, CIR webservice, gazettes) are exactly the sources we harvest directly. |
| Moody's Orbis / Bureau van Dijk (Dutch-origin) | Deep NL company financials and ownership chains (useful for OpCo/PropCo and SPV structures); expensive, no signals layer. | KVK deposited annual accounts, EU business registers via BRIS, gazette announcements — all public originals available to us at source. |
| Drimble / FaillissementsDossier.nl / Faillissementen.com (local insolvency aggregators) | Free/freemium daily NL insolvency trackers: bankruptcies, suspensions, curator contacts, court reports, per-municipality views. Prove the CIR is fully machine-harvestable; no analytics or alternatives framing. | Centraal Insolventieregister SOAP webservice (webservice.rechtspraak.nl/cir.asmx), court bankruptcy reports, KVK data, local news — we should go to the CIR webservice directly for our NPL/distressed layer. |
| Brookz / Dealsuite (local M&A marketplaces) | Lower-mid-market NL deal flow: businesses for sale, advisor network, sector multiples reports (Brookz Barometer, Dealsuite M&A Monitor). Marketplace model, not a data platform; reports are free PDFs. | Self-listed sellers/advisors plus their own surveys; their free market reports are citable market-context sources; underlying deal data is proprietary — analysis only, no scraping. |
| MenA.nl / Dealmaker.nl (Sijthoff Media) | NL/Benelux M&A community: deal news, league tables, advisor directory; Dealmaker.nl premium holds the structured deal database. Strong on advisor ecosystem (category 6 overlap). | Deal press releases, advisor submissions, public news — the same press-release layer our signals pipeline ingests directly; premium database off-limits. |

### NO — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Strong on Norwegian LPs (NBIM/GPFG, Folketrygdfondet, KLP, Storebrand, Argentum) and established buyout/infrastructure GPs (FSN, Verdane, HitecVision, Norvestor); fund-level performance where LPs disclose. Thin on sub-threshold AIFMs and niche alts. | Finanstilsynet registry (AIFM/fund licences), NBIM and Folketrygdfondet public holdings/annual reports, Argentum's State of Nordic PE reports, Brreg annual accounts, NVCA membership — all directly accessible to us via the sources above. |
| PitchBook | Good Norwegian VC/PE deal coverage and cap-table estimates; covers Verdane/Norvestor/HitecVision deal histories and Oslo Børs listings/exits. Estimates (valuations, dry powder) are proprietary modeling. | Brreg filings (share capital changes signal rounds), NewsWeb/Euronext disclosures for listed events, NTB press releases, Shifter/E24/DN deal reporting, NVCA and Argentum statistics — we can hit the same primaries directly. |
| Dealroom | Broad Norwegian startup/scaleup mapping (works with Nordic ecosystem bodies); good on rounds, founders, ecosystem taxonomies. Weak on debt, real assets, service graph. | Brreg open API for entity data, Shifter and E24 funding coverage, Innovation Norway/Investinor portfolio pages, company self-reporting — the registry and press primaries are open to us. |
| Crunchbase | Patchy Norway coverage skewed to internationally-visible startups; self-reported plus press-scraped rounds; unreliable for entity completeness. | English-language press, TechCrunch/Sifted, company submissions. Its gaps (Norwegian-language press, registry data) are exactly what Brreg + Shifter + DN give us directly. |
| Proff.no (Proff AS) | The dominant Norwegian company-information site: financials, roles, shareholders for every registered company; Proff Forvalt is the paid credit/prospecting tier. Not alternatives-aware — no fund/asset-class taxonomy. | Entirely built on public data: Brreg Enhetsregisteret/Foretaksregisteret + Regnskapsregisteret accounts + Skatteetaten shareholder register extracts. We go to the same registers at source, at $0. |
| Purehelp.no | Free-tier Norwegian company financials and org data, similar to Proff with lighter UX. | Brreg open API + Regnskapsregisteret accounts — same open primaries we already ingest. |
| Enin.ai | Norwegian company-intelligence/credit startup — real-time bankruptcy risk, networks of roles, procurement wins. Closest local analogue to a signals engine, but credit-focused, not alternatives-focused. | Brreg APIs incl. announcement/bankruptcy feeds, Regnskapsregisteret, Doffin procurement data, court announcements — a validation that these open feeds support a commercial intelligence product. |
| Dun & Bradstreet Norway (ex-Bisnode) | Credit ratings and payment-remark data on Norwegian entities; enterprise market. Payment remarks are licensed, not open. | Brreg registers + accounts as the public backbone; payment remarks from licensed debt-collection sources (not available to us — and personal-data rules keep them out of scope anyway). |
| Argentum (State of Nordic PE / market database) | Semi-competitor: the best free analytical coverage of the Nordic PE/VC fund universe (fundraising, buyout activity, fund lists) since 2008, published as open reports at info.argentum.no. | Own LP data plus GP interviews and public announcements — we can cite its published aggregates and reconstruct the underlying fund list from Finanstilsynet + NVCA + press. |
| Nordic 9 | Nordic deal-intelligence service tracking VC rounds and investors incl. Norway; lightweight, press-driven. | Nordic tech press (Shifter, E24, ArcticStartup), press releases — same open press layer we monitor via RSS. |

### PL — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Polish GPs, LPs (PTE pension societies, PFR), fund closes and performance where disclosed; strongest on institutional fund data, weak on sub-threshold ASI vehicles and local service graph. | KNF registers (TFI/ZASI), annual reports of pension societies, PSIK/Invest Europe statistics, press releases — all of which we can ingest directly (KNF register pages, IZFiA stats, PSIK reports). |
| PitchBook (Morningstar) | PL PE/VC deals, valuations (modeled), advisors on deals; good buyout coverage via advisor networks, patchy seed coverage outside Warsaw. | Company press releases, KRS filings (capital increases as round evidence), UOKiK merger clearances, MSiG notices, news media — KRS Open API + UOKiK decisions DB + MSiG give us the same deterministic backbone at $0. |
| Dealroom | Startup/VC ecosystem mapping; runs the official Polish ecosystem instance in partnership with PFR (dealroom-powered database of Polish startups), so PL coverage is unusually good for a global platform. | PFR/PFR Ventures data sharing, startup self-reporting, MamStartup/press round announcements, Crunchbase cross-feeds. We go direct to PFR Ventures portfolio + quarterly PFR/Inovo VC reports and MamStartup RSS. |
| Crunchbase | Broad but shallow PL startup coverage; self-reported profiles, frequent gaps in amounts and dates. | Self-reporting and English-language press; little registry grounding — our KRS/ZASI grounding is a direct differentiator. |
| EMIS (ISI Emerging Markets) | CEE company financials, industry reports, news aggregation for Poland; strong financial-statement depth, sold to banks/advisors. | KRS financial statements (eKRS repository of financial documents), GUS statistics, PAP wire — all public: the KRS financial-documents repository (ekrs.ms.gov.pl/rdf) is free. |
| Notoria | Polish listed-company fundamentals and ownership data for GPW/NewConnect; the local standard for issuer financials. | ESPI/EBI disclosures, issuer periodic reports, GPW/KDPW data — we ingest espiebi.pap.pl + Bankier espi.xml + GPW lists directly. |
| MGBI | Local data provider over MSiG/KRZ: insolvency and restructuring datasets, debtor reports, annual bankruptcy report — effectively the commercial layer on the exact gazette/insolvency sources we target. | MSiG announcements, KRZ proceedings, KRS — they also operate the imsig.pl API we cataloged; we can replicate from the official sources at $0. |
| Rejestr.io / Transparent Data | Polish registry-graph providers (ownership/management connections, KRS change monitoring) with APIs; strong graph UX over KRS. | KRS Open API, CRBR UBO register, MSiG — identical public inputs to ours; validates our KRS-graph approach. |
| Krajowy Rejestr Długów (KRD) + BIG bureaus | Private debt-information bureaus (payment defaults) — adjacent to NPL sourcing but their bureau data is proprietary/consent-based, not public. | Creditor-submitted data (not replicable); public overlap limited to KRZ/MSiG insolvency notices which we take directly. |

### PT — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Covers Portuguese GPs/LPs/funds as part of pan-European alternatives coverage — strongest on fund vehicles, LP commitments and performance estimates; PT depth is modest (few dozen active GPs). | CMVM register of management companies and funds (our route: ESMA registers, since CMVM portal is JS-blocked), APCRI member roster, APFIPP AUM statistics, fund annual reports, Diário da República fund-vehicle acts. |
| PitchBook | PT PE/VC deal and company coverage via news-driven collection plus registry lookups; good on cross-border buyouts touching Portugal, thinner on domestic small-cap. | Company-act publications (publicacoes.mj.pt), Diário da República, Euronext Lisbon issuer disclosures, and press (ECO, Jornal de Negócios, Jornal Económico) — all directly cataloged here. |
| Dealroom | Strong Lisbon/Porto startup ecosystem coverage; runs ecosystem mapping in partnership with government startup bodies. | Startup Portugal ecosystem mapping platform and reports, Portugal Ventures portfolio pages, accelerator/incubator portfolio lists, startup media (Link to Leaders, ECO) — all public and cataloged. |
| Crunchbase | Broad but shallow PT startup coverage, largely self-reported profiles plus funding-round press. | Startup press releases and PT startup media; the underlying verifiable layer is the same publicacoes.mj.pt incorporation/act stream and news RSS we catalog. |
| TTR Data (Transactional Track Record) | Iberia-specialist M&A/PE/VC deal database — arguably the deepest deal coverage for Portugal specifically, including mid-market and advisor league tables. | Registry act publications (publicacoes.mj.pt), Diário da República, CMVM/Euronext issuer filings, CITIUS insolvency publicity, law-firm deal announcements and Iberian legal press (Iberian Lawyer). |
| Informa D&B Portugal (CESCE group) | The dominant local company-information/credit provider — financials, risk scores, ESG scores, directories on effectively all PT companies; sells 'public data files' and database licensing. | IRN commercial register publications, IES annual accounts filings (official channel), Diário da República, CITIUS insolvency data, Portal BASE procurement — the same official spine we ingest directly at $0. |
| Racius | Free local company-directory site (company events, dissolutions, statistics) demonstrating what is derivable purely from open registry publications; site itself 403s bots and we do not scrape competitors. | publicacoes.mj.pt company acts and Diário da República — go direct to those. |
| Confidencial Imobiliário | Local real-estate data house (SIR residential index, Portuguese Housing Market Survey) — the reference for PT housing/investment price data; site is JS-heavy, content behind subscription. | Built on proprietary deed/agency panels; the public alternatives we catalog are INE housing statistics and Portal BASE/registry data, plus Iberian Property and Vida Imobiliária for deal signals. |

### RO — 10 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Global alternatives database; Romania appears thinly — a handful of CEE-regional GPs/funds with RO exposure (PE, private debt, infra), LP profiles for regional pension/insurance investors. Weak below the fund level and on local NPL/servicer ecosystem. | Regulator registers (ASF fund/AIFM lists), fund annual reports, GP press releases, association data (Invest Europe/ROPEA-adjacent stats) — all directly accessible to us via asfromania.ro registers, ROPEA, and issuer filings. |
| PitchBook | RO deal coverage driven by press-sourced M&A/PE transactions and advisor league tables; decent on larger buyouts (e.g. former-SIF ecosystem, regional funds), sparse on local mid-market and service-graph entities. | Business press (Ziarul Financiar, Profit.ro, Business Review), law-firm/advisor deal announcements, BVB disclosures — we catalog all of these with working RSS. |
| Dealroom | Strongest global platform for RO startups/VC; cooperates with local ecosystem organizations and government-linked ecosystem reports. Good founder/round data; nothing on debt, real assets, or the institutional service graph. | StartupCafe/Romania-Insider startup press, VC fund announcements, How to Web ecosystem reports, self-reported company data, ONRC-derived firmographics via local partners — the ONRC bulk CSVs on data.gov.ro are the direct route. |
| Crunchbase | Self-reported + press-sourced RO startup/VC coverage; shallower than Dealroom locally, weak entity hygiene for RO legal names. | Press releases, TechCrunch-style media, self-submissions; verifiable RO facts trace back to the same startup press we ingest directly. |
| Termene.ro | Leading local company-intelligence SaaS: full RO firmographics, financials, litigation, insolvency alerts, UBO-adjacent links. The de-facto local benchmark for entity data depth. | ONRC/RECOM data, Ministry of Finance annual financial statements, BPI insolvency bulletin, portal.just.ro court data (SOAP), Monitorul Oficial — every one of these is in our entities catalog for direct $0 ingestion. |
| ListaFirme.ro | Veteran local company directory/credit-report vendor; broad firmographic + financials coverage, older UX, API offering. | Same public spine: ONRC registrations, MF bilant data, BPI, court portal. |
| RisCo.ro | Local credit-risk reports and monitoring (payment incidents, insolvency risk scores) on RO companies. | ONRC, MF financial statements, BPI, portal.just.ro, plus BNR payment-incident data where public. |
| KeysFin | Local financial-data and sector-study provider (now part of a regional group); strong on aggregated sector financials and market sizing studies frequently cited in RO business press. | MF annual financial statements in bulk, ONRC data — both reachable directly (data.gov.ro ONRC CSVs + mfinante lookup). |
| Veridion | Romanian-founded global company-data API (web-scale firmographics via ML crawling); not RO-specific but proof of local data-engineering talent pool; sells B2B datasets, not an alternatives-intelligence product. | Open web crawling + public registries; no unique public RO source we lack. |
| Confidas.ro | Lightweight local company financials/risk lookup aimed at SMEs; simpler than Termene. | MF financial statements, ONRC, BPI. |

### RS — 7 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin (BlackRock) | Thin on Serbia: a handful of regional GPs/funds that touch Serbia (SEE/CEE buyout and infra vehicles) and DFI LPs; essentially no coverage of local service graph, NPL market, or sub-institutional managers. Serbia usually appears only inside CEE aggregates. | Fund manager self-reporting plus public filings and DFI disclosures. Direct-route equivalents for us: EBRD/IFC project disclosures, Serbian SEC (KHOV) fund and ManCo registers, Invest Europe CEE activity reports. |
| PitchBook | Covers headline Serbian VC/PE deals (Nordeus/Take-Two, Tenderly, Ominimo) and M&A with named advisors, but long-tail and local mid-market deals are patchy; financials often absent because they don't mine APR. | Press releases, startup media, law-firm deal announcements. Direct routes for us: The Recursive/Netokracija/Startit RSS, eKapija deal reporting, APR financial statements for the actual numbers. |
| Dealroom | Best-in-class Serbian startup mapping via co-branded ecosystem reports with local partners (Digital Serbia Initiative orbit); strong on startups/rounds, weak on PE, credit, real assets and the institutional layer. | Ecosystem partners (DSI), accelerator/awardee lists, startup media. Direct routes: DSI member/eco data, Innovation Fund public-call results (incl. Serbia Ventures backed funds), Netokracija/Startit feeds. |
| Crunchbase | Broad but shallow self-reported Serbian company profiles; funding data inconsistent, no registry grounding, no distressed/credit dimension. | Self-reporting and news scraping. Direct routes: same news feeds plus APR as the corrective registry spine we have and they lack. |
| CompanyWall Business (local, companywall.rs — verified live) | Local company-credit data for RS + region: 128k companies, financials, blocked accounts, court/insolvency data, ownership links, tax debt. Strong deterministic base, zero alternatives-specific intelligence (no fund/GP/LP layer, no signals). | Visibly: APR company register + financial statements, NBS blocked-accounts (prinudna naplata), court/insolvency registers, tax-debtor lists. All of these are public and cataloged above for direct ingestion. |
| Boniteti.rs / CUBE Risk Management Solutions (local) | Serbian credit-scoring and company-monitoring platform used by banks/corporates; APR-grounded financials and distress flags. Site refused our connection this session (ECONNREFUSED) — existence known, not re-verified. No alternatives layer. | APR financial statements and status changes, NBS forced-collection register, ALSU/court insolvency data — all directly accessible to us. |
| eKapija (local, dual role) | Both a news source and a paid company-data/tender-intelligence provider; strongest local deal/tender/real-estate signal coverage in Serbian. Bot-blocked to our fetcher (403). | Own journalism plus APR data and the public procurement portal. We ingest headlines/links per copyright discipline and go directly to APR + jnportal for the underlying data; never scrape their paid database. |

### SE — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Strong on Swedish GPs, fund performance and the LP side — AP1–AP7, insurers (Folksam, Alecta, AMF) are heavily profiled; alternatives allocations and commitments tracked. | AP-fund annual reports and holdings disclosures (ap1–ap7.se), FI company register for AIFM/manager identification, SVCA membership, fund managers' own reports — all directly accessible to us. |
| PitchBook | Deep on Swedish PE/VC deals, valuations and cap tables; good service-provider tagging (law firms, advisors). | Bolagsverket filings (via data resellers), MFN/Cision/GlobeNewswire press releases, Nasdaq Stockholm/First North listings and prospectuses, SVCA member data — the underlying registry + wire routes are in our catalog. |
| Dealroom | Best-in-class Swedish startup/scaleup ecosystem mapping; runs co-branded ecosystem dashboards with Nordic agencies. | Bolagsverket/SCB company data, Vinnova grant open data, startup media (Breakit, Di Digital, ArcticStartup), funds' portfolio pages — all public routes we've cataloged. |
| Crunchbase | Broad but shallow Swedish funding-round coverage, English-language bias, self-reported profiles. | Press releases (MFN/Cision/GlobeNewswire), TechCrunch/Breakit-type media, self-submission — the press-wire layer is directly available to us. |
| Valu8 (Swedish; acquired by Datasite, May 2026) | Local champion for private-company financials and M&A target screening across Europe from its Swedish base; proprietary cleaned financials on essentially every SE company. | Bolagsverket annual reports (årsredovisningar) in bulk, SCB business register, group-structure data from registries — proof that the Bolagsverket high-value-datasets API + digital annual reports are the foundation for SE private-company intelligence. |
| Modular Finance (Holdings / Monitor / MFN) | Nordic market leader in listed-company ownership data (Holdings) and IR tooling; expanded into unlisted ownership in 2021; also operates the MFN newswire. | Euroclear Sweden share registers (obtained per-company, not open bulk), FI PDMR and short-position open data, fund holdings reports, Bolagsverket — FI's CSVs and Bolagsverket are directly open to us; Euroclear registers are not. |
| UC / allabolag.se (Enento Group) | Dominant SE credit-information provider; allabolag is the consumer-facing free directory with financials, boards, and credit events. | Bolagsverket, Skatteverket (tax status), Kronofogden (payment remarks), SCB — the registry layer is public; the credit-remark layer partly requires licensed access. |
| Retriever Business / Dun & Bradstreet (ex-Bisnode) | Nordic firmographics, media monitoring (Retriever) and risk data (D&B) on all Swedish companies. | Bolagsverket registers and annual reports, SCB, PoIT gazette announcements — same public backbone we ingest directly. |

### SI — 7 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Covers European alternatives funds and LPs; Slovenia coverage is thin — a handful of SI-domiciled or SI-investing GPs/LPs, mostly via pan-CEE funds. Weak on local service graph, NPLs, and lower-mid-market. | ESMA/national regulator registers (AIFM authorizations), fund annual reports (AJPES JOLP equivalents), LP annual reports (KAD, Modra, SID banka), press releases. We can go directly to ESMA registers, AJPES JOLP, KAD/Modra/SID publications. |
| PitchBook | Tracks Slovenian VC/PE deals and startups (historically e.g. Outfit7, Celtra, Zemanta exits); decent deal history, weak on registries, real assets and credit. | Company press releases, startup media, LJSE/SEOnet disclosures, business-register filings. Direct routes for us: SEOnet RSS, AJPES ePRS/JOLP, Startup Slovenia news, Finance.si. |
| Dealroom | Strong SI startup/scaleup coverage via ecosystem partnerships and CEE reports; startup-only lens — no credit, real assets, or institutional graph. | Ecosystem directories (Startup Slovenia, accelerators, Slovene Enterprise Fund beneficiary lists), founder/press submissions. We can use startup.si directory and SPS 'Prejemniki sredstev' lists directly. |
| Crunchbase | Crowd-sourced SI startup profiles; patchy funding data, no registry grounding. | Press releases and self-reported profiles. Direct route: same press signals via RTV/N1/Finance RSS plus AJPES for ground truth. |
| Bizi.si (TSmedia) — local | Full Slovenian company universe with financials, credit flags, blocked accounts (3,688 shown), receiverships (359), new companies — the local reference company-data product. No alternatives/fund lens. | Visibly built on AJPES data: PRS register, JOLP financial statements, eRTR blocked accounts, eObjave insolvency. All of these are public and we ingest them directly from AJPES. |
| GVIN (Dun & Bradstreet Slovenia) — local | Company intelligence, ownership networks, credit scores and news monitoring for SI corporates; enterprise product, no alternatives taxonomy. | AJPES PRS/JOLP, court and gazette announcements (eObjave, Uradni list/PISRS), media monitoring. Direct public routes identical to ours. |
| EBONITETE.SI / CompanyWall — local credit bureaus | Credit ratings and payment-default monitoring on SI companies; distress-signal oriented. | AJPES financial statements, eRTR account blocks, eObjave insolvency filings, FURS tax-debtor lists — all reachable directly at source. |

### SK — 9 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Institutional alternatives database; Slovakia appears mainly through pan-CEE fund vehicles, a handful of local GPs, and LP records (pension DSS/insurers) — thin, fund-level, not entity-graph deep. | NBS supervised-entity register (fund managers/AIFMs), fund annual reports filed to Register účtovných závierok, association rosters (SLOVCA), press releases — all directly accessible to us via subjekty.nbs.sk, registeruz.sk API and slovca.sk. |
| PitchBook | Deal- and company-level PE/VC coverage of Slovakia via its global taxonomy; decent on venture rounds touching SK founders, weaker on local mid-market and NPL/credit. | Company registry filings (ORSR/RPO), press wires (TASR/SITA), startup media, firm websites. Direct routes for us: RPO API, RÚZ API, teraz.sk + SITA feeds, SLOVCA roster. |
| Dealroom | Best of the globals on the Slovak startup/VC ecosystem (works with national ecosystem reports and local partners); startup-only lens — no credit, real assets or service graph. | Self-reported startup profiles, SIH/SBA program disclosures, startup media (Startitup, The Recursive), SLOVCA. All four are in our catalog as direct sources. |
| Crunchbase | Broad but shallow SK coverage; self-reported profiles and funding-round news; unreliable for legal-entity ground truth. | Press releases and self-submission; underlying verifiable layer is ORSR/RPO which we take directly. |
| FinStat (local, finstat.sk) | THE local benchmark: financials, risk flags, debts, insolvency and gazette monitoring for every Slovak company; widely used by banks and journalists. Not alternatives-aware (no asset-class taxonomy, no fund/LP layer). | Openly built on Register účtovných závierok (RÚZ API), ORSR/RPO, Obchodný vestník structured data, Finančná správa debtor/VAT lists, insolvency register — every one of which we catalog and can ingest directly at $0. |
| CRIF — Slovak Credit Bureau (cribis.sk) | Credit reports and company monitoring on Slovak entities; strong on payment discipline and linkages; paid, no alternatives framing. | ORSR/RPO, RÚZ financial statements, Obchodný vestník, court/insolvency registers (REPLIK) — direct public routes available to us. |
| Dun & Bradstreet (ex-Bisnode) Slovensko | Firmographics and scoring for SK within its global graph; commodity registry data resold with analytics. | RPO/ORSR bulk data, RÚZ, gazette — all open. |
| foaf.sk (Alvaria/open-data community) | Free ownership/relationship graph over Slovak registry data — proof of what pure open ORSR/RPO data yields (people-company edges). | ORSR extracts and RPO open data exclusively — validates our deterministic-first pipeline design. |
| Vestbee | CEE VC market maps, round roundups and investor lists including Slovakia; media/community layer rather than a database. | Self-reported VC profiles, press, SLOVCA-type rosters — signals we get from The Recursive/Startitup feeds and SLOVCA directly. |

### XK — 8 providers observed

| Provider | Coverage | Public sources they draw on |
|---|---|---|
| Preqin | Negligible Kosovo coverage — no domestic GP/LP universe to track; Kosovo appears only inside mandates of SEE-regional funds (e.g., EBRD-backed Western Balkans vehicles). | DFI disclosures (EBRD project summary documents, IFC disclosures), GP press releases — all reachable directly via the EBRD projects database catalogued above. |
| PitchBook | Sparse: occasional Kosovo startup rounds and the rare regional PE deal touching Kosovo assets. | Company/investor press releases, international tech media, self-reported profiles; local underlying signals are Telegrafi/Prishtina Insight-type coverage we ingest directly. |
| Dealroom | Best startup-side coverage of Kosovo among globals, via Western Balkans ecosystem partnerships; tracks Kosovo startups, rounds and hubs. | Ecosystem partners' data (Innovation Centre Kosovo, STIKK member lists), founder self-reporting, local startup news — ICK and STIKK are catalogued directly above. |
| Crunchbase | Thin, self-reported Kosovo startup profiles; funding data patchy and often stale. | Founder submissions and press releases; no registry integration for Kosovo. |
| EMIS (ISI Emerging Markets) | Covers Kosovo company financials, macro and sector reports as part of its SEE package. | ARBK registry data, ATK, ASK statistics, CBK statistics and local media — every one of these is catalogued directly above. |
| SeeNews / SeeNext | SEE regional business newswire and company-data products include Kosovo corporate news and TOP-100-SEE style rankings. | Local media monitoring, CBK data, company disclosures, ARBK — direct routes catalogued. |
| The Recursive | SEE startup/VC media with genuine original reporting on Kosovo founders and rounds. | Original interviews plus ecosystem sources (ICK, STIKK); complements rather than substitutes local feeds. |
| Moody's Orbis (Bureau van Dijk) | Kosovo entities present with basic registry data and limited financials. | Local information providers aggregating ARBK filings — ARBK is the direct route. |

