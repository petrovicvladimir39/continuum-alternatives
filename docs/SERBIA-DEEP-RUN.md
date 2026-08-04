# SERBIA DEEP RUN — pilot report (2026-08-04)

Success metric is **field completeness**, not entity count. Deliverable:
`exports/serbia/continuum-serbia.xlsx` (825 rows × 64 columns, sheets
Entities / Facts / Sources / Coverage).

---

## The headline number, and the honest caveat

| Field | Before | After |
|---|---|---|
| Entities (RS) | 568 | **825** |
| Website | 12 (2%) | **89 (11%)** |
| Logo | 11 (2%) | **257 (31%)** |
| Summary (own words) | 0 (0%) | **257 (31%)** |
| Corporate email | ~0 | **79 (10%)** |
| Corporate phone | ~0 | **84 (10%)** |
| Registered address | 4 (0.7%) | **82 (10%)** |
| HQ city | — | **87 (11%)** |
| Rooftop/street coordinates | 0 | **5 (1%)** |
| Classified (any level) | ~0 | **98 (12%)** |
| PIB / matični broj | 0 | **0 (0%)** |

**The caveat that matters more than the numbers**: the two sources that
produced this completeness — the Foreign Investors Council and AmCham Serbia —
are **general business chambers, not alternatives directories**. They gave
outstanding field density (FIC rows arrive 100% with website and address, 85%
with email; AmCham rows 100% with a logo) but their membership is Carlsberg,
Delhaize, Toyo Tire, Fresenius, Titan Cementara. Useful as the Serbian
corporate substrate and as LP/portfolio-company context — **not** the
alternative-investment universe this platform is about.

That is the pilot's real lesson, and it should redirect the source strategy
for every country that follows: **field completeness and relevance come from
different sources**. Chambers give you complete rows about the wrong
companies; regulator registers give you the right companies with thin rows.
The winning pattern is regulator registers for the SPINE, chambers and the
website crawler for the FIELDS.

---

## What was built

| Step | Script | Status |
|---|---|---|
| S1 discovery | `serbia-discover.ts` | FIC + AmCham done; regulators NOT done |
| S2 APR enrichment | — | **blocked**, see below |
| S3 site crawler | `serbia-site-enrich.ts` | done, 89 sites crawled |
| S4 classification | `serbia-classify.ts` | done, 98 proposed |
| S5 workbook | `europe-export-xlsx.ts --country RS --out …` | done |
| S5 map `/v2/serbia` | — | **not built** |

### S1 — discovery yield per source

| Source | Rows | With website | With logo | With email | With address |
|---|---|---|---|---|---|
| FIC (Foreign Investors Council) | 92 | **100%** | 0% | **85%** | **100%** |
| AmCham Serbia | 236 | 0% | **100%** | 0% | 0% |

FIC's `/members/` page paginates client-side (every `/page/N/` serves page 1),
so the correct route is the **WordPress REST API** — `wp-json/wp/v2/posts`,
filtered structurally to posts carrying a `Tel:`/`Web:` contact block. That
lifted the harvest from 20 rows to 92. FIC also encodes the member's parent
country as a category slug, which gives deterministic domestic/foreign
ownership tagging at no extra cost.

AmCham embeds each member's logo URL and company-written blurb inside a
tooltip payload — double-escaped HTML, decoded twice, then parsed.

### S3 — the website crawler (the metric multiplier)

89 sites crawled, up to 8 pages each, cheerio only, no LLM, no JS runtime:
**48 logos · 47 summaries · 7 emails · 4 phones · 35 addresses → 5 rooftop.**

Every crawled field is provenance-stamped into
`organizations.enrichment.website_crawl` with the exact page URLs and
`fetched_at`. Summaries are stored **verbatim** from the company's own site,
never paraphrased — which is what makes them publishable as the company's own
words.

Why only 5 rooftop from 35 addresses: Nominatim resolves Serbian street
addresses inconsistently, and Belgrade addresses without a house number
degrade to city precision. Honest, and improvable with a Serbian gazetteer.

### S4 — classification

98 classifications PROPOSED (review-gated, never auto-approved); **727
entities left honestly unclassified** rather than force-fit. Distribution:
service_graph 52 · real_assets 25 · private_debt 13 · liquid_alts 5 ·
pe_growth 2 · niche_alts 1.

---

## S2 — APR: blocked, and precisely why

- `openapi.apr.gov.rs` **is alive** — the root returns `{"title": "success"}`
  — but every documentation and route guess returns `{"title": "404 Not
  Found"}`: `/swagger/index.html`, `/swagger/v1/swagger.json`, `/api`,
  `/api/v1`, `/docs`, `/registri`, `/pretraga`, `/opendata`. **The endpoint
  contract is not publicly discoverable.** It almost certainly requires
  registration and documentation supplied by APR directly.
- APR's own open-data page (`apr.gov.rs/registri/otvoreni-podaci.2005.html`)
  returns 200 but exposes **no** `.csv/.xlsx/.json/.zip` links and no API
  references in its markup.
- `data.gov.rs` has no APR organization at the path probed.

**Consequence: PIB and matični broj remain 0%.** That is the single largest
gap in the Serbian record, and it is an operator step — request API access
from APR — not something more crawling will solve. The adapter is designed
and ready for the moment credentials exist; it is deliberately match-only
(never bulk-import the company register as discovery).

Also not yet probed: Registar finansijskih izveštaja (revenue/assets/
employees) and Registar zaloge (pledge register — a genuine private-credit
signal source).

---

## Not done, named honestly

1. **Regulatory discovery (the actual alternatives universe).** KHOV
   (`sec.gov.rs`) publishes its registers through a Joomla document manager
   with Cyrillic paths; my guessed register URLs 404'd and the homepage is a
   news feed. NBS register paths likewise 404'd. BELEX refused the connection.
   **Fund managers, investment funds, broker-dealers, custodian banks and
   voluntary pension funds are therefore NOT yet in the Serbian record** —
   this is the most important remaining work and the reason relevance lags
   completeness.
2. **`/v2/serbia` map route** — not built.
3. **Domain resolution** for the 736 entities without a website — not built;
   only crawling of already-known websites was done.
4. **Logo normalization to square transparent PNG in blob storage** — logos
   are stored as source URLs, not yet fetched/normalized (no blob credentials
   in `.env`).
5. **Fund/portfolio edge extraction** from crawled sites — not implemented.

## A data-quality issue found in the sample

`BDK Advokati` appears with two different classification rows
(`service_graph/Advisor` and `esoteric/Advisor`). Worth a dedupe pass on
`entity_classifications` before the next country.

---

## 25 most complete records (the "what done looks like" sample)

Records carrying website + logo + summary, ordered by coordinate precision:

ProCredit Bank · Evocon · Sava Neživotno Osiguranje · BDK Advokati ·
LeitnerLeitner Consulting · Titan Cementara Kosjerić · Orion Telekom ·
Messer Tehnogas · ACB (insurance brokerage) · Banca Intesa Beograd ·
AIK Banka · Atlantic Grupa · BNV Bristol · Fond za inovacionu delatnost ·
OTP banka Srbija · **Integral Venture Partners** · Fresenius Medical Care
Srbija · A1 Srbija · Toyo Tire Serbia · Marsh (insurance brokerage) ·
Delhaize Serbia · Carlsberg Srbija · Alma Quattro · CETIN · Titan.

Of these 25, the genuinely alternatives-relevant ones are ProCredit, Sava
Osiguranje, BDK Advokati, LeitnerLeitner, ACB, Banca Intesa, AIK, OTP, Marsh,
Fond za inovacionu delatnost and **Integral Venture Partners** — roughly 11 of
25. That ratio is the relevance problem stated numerically.

## Richest sources, ranked

1. **FIC via WP REST API** — 8 fields per row (name, street, city, postal,
   phone, email, website, parent country). Nothing else came close.
2. **Company websites (S3 crawler)** — logo + verbatim summary for ~53% of
   the sites crawled.
3. **AmCham tooltip payload** — logo + description for 236 companies.

## Review-gate status

All 98 classifications are PROPOSED. All directory-sourced entities are
`provisional` + `needs_verification`. Nothing here publishes without the
operator's review session.
