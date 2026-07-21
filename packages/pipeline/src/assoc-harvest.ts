import "./env";
import { createEntity, db, entities, entityTags, eq, organizations, resolveEntity } from "@continuum/db";

/**
 * CLEAN-100 Part 4 — national PE/VC association member directories (the GP
 * cheat-sheet). $0, probe-first; parse recipes probed 2026-07-21.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/assoc-harvest.ts [--only psik,nvp] [--cap 400]
 *
 * Association membership is DECLARATIVE, not register-grade: new entities
 * land status='provisional' + needs_verification (Wikidata doctrine);
 * matched entities only gain the association tag. Country defaults to the
 * association's home country — a small share of cross-border members will
 * carry the wrong country until verification; the needs_verification gate
 * keeps them out of publication until reviewed.
 *
 * Documented non-imports (2026-07-21 probes): Invest Europe + AIMA
 * (member-gated), France Invest (full catalogue login-gated), SpainCap
 * (Livewire JS), LVCA (Wix SPA), ROPEA/BVCA-BG/CVCA-HR/LT-VCA (logo grids,
 * names only derivable from image filenames/domains — too lossy to import).
 * TMA Europe exposes chapters, not member directories.
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

type AssocAdapter = {
  key: string;
  assoc: string;
  country: string;
  fetch: () => Promise<{ name: string; website?: string | null }[]>;
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  return response.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)))
    .replace(/\s+/g, " ")
    .trim();
}

function collect(html: string, re: RegExp, group = 1): { name: string }[] {
  const out: { name: string }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = decodeEntities(m[group] ?? "");
    if (name.length < 3 || name.length > 120 || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    out.push({ name });
  }
  return out;
}

const ADAPTERS: AssocAdapter[] = [
  {
    key: "psik",
    assoc: "PSIK",
    country: "PL",
    fetch: async () => {
      const html = await fetchText("https://psik.org.pl/pl/czlonkowie/fundusze");
      return collect(html, /<img[^>]*class="el-image[^"]*"[^>]*alt="([^"]{3,120})"/g);
    },
  },
  {
    key: "cvca_cz",
    assoc: "CVCA (Czechia)",
    country: "CZ",
    fetch: async () => {
      const out: { name: string }[] = [];
      for (const url of [
        "https://cvca.cz/clenstvi/radni-clenove/",
        "https://cvca.cz/clenstvi/pridruzeni-clenove/",
      ]) {
        out.push(...collect(await fetchText(url), /<h2 class="entry-title"><a[^>]*>([^<]+)<\/a>/g));
        await sleep(1000);
      }
      return out;
    },
  },
  {
    key: "slovca",
    assoc: "SLOVCA",
    country: "SK",
    fetch: async () => {
      const out: { name: string }[] = [];
      for (const page of ["riadni-clenovia", "pridruzeni-clenovia", "partnerski-clenovia"]) {
        out.push(
          ...collect(
            await fetchText(`https://www.slovca.sk/sk/clenstvo/${page}.html`),
            /<h2 class="[^"]*partner-title[^"]*">\s*<a[^>]*>([^<]+)<\/a>/g,
          ),
        );
        await sleep(1000);
      }
      return out;
    },
  },
  {
    key: "hvca_hu",
    assoc: "HVCA (Hungary)",
    country: "HU",
    fetch: async () => {
      const html = await fetchText("https://www.hvca.hu/hu/tagok");
      return collect(html, /<h2 class="title">([^<]+)<\/h2>/g);
    },
  },
  {
    key: "hvca_gr",
    assoc: "HVCA (Greece)",
    country: "GR",
    fetch: async () => {
      const html = await fetchText("https://hvca.gr/melh.html");
      // Labeled blocks: company name follows the Εταιρία label cell.
      return collect(html, /Εταιρ[ίι]α\s*:?\s*(?:<\/[^>]+>\s*<[^>]+>|<[^>]+>)*([^<>]{3,120})</g);
    },
  },
  {
    key: "estvca",
    assoc: "EstVCA",
    country: "EE",
    fetch: async () => {
      const html = await fetchText("https://estvca.ee/members");
      return collect(html, /<h3[^>]*>([^<]{3,120})<\/h3>/g);
    },
  },
  {
    key: "nvp",
    assoc: "NVP",
    country: "NL",
    fetch: async () => {
      const html = await fetchText("https://nvp.nl/over/ledenoverzicht/leden/");
      return collect(html, /<h3 class="js-mTitle"[^>]*>([^<]+)<\/h3>/g);
    },
  },
  {
    key: "aifi",
    assoc: "AIFI",
    country: "IT",
    fetch: async () => {
      const html = await fetchText("https://www.aifi.it/it/associati");
      return collect(html, /<h2 class="associate-card__title"[^>]*>([^<]+)<\/h2>/g);
    },
  },
  {
    key: "seca",
    assoc: "SECA",
    country: "CH",
    fetch: async () => {
      const html = await fetchText("https://www.seca.ch/en/find-members/");
      // Anchor text when present; slug title-cased as fallback.
      const out: { name: string }[] = [];
      const seen = new Set<string>();
      const re = /href="\/en\/find-members\/([a-z0-9-]+)\/"[^>]*>([^<]*)</g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const slug = m[1]!;
        if (seen.has(slug) || slug === "") {
          continue;
        }
        seen.add(slug);
        const text = decodeEntities(m[2] ?? "");
        const name =
          text.length >= 3
            ? text
            : slug
                .split("-")
                .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
                .join(" ");
        if (name.length >= 3 && name.length <= 120) {
          out.push({ name });
        }
      }
      return out;
    },
  },
  {
    key: "bvk",
    assoc: "BVK",
    country: "DE",
    fetch: async () => {
      const out: { name: string }[] = [];
      for (const gruppe of ["2", "3"]) {
        for (let page = 1; page < 15; page++) {
          let html: string;
          try {
            html = await fetchText(
              page === 1
                ? `https://www.bvkap.de/der-bvk/mitglieder?gruppe=${gruppe}`
                : `https://www.bvkap.de/der-bvk/mitglieder?gruppe=${gruppe}&page_e54=${page}`,
            );
          } catch {
            break; // past the last page — bvkap 404s beyond pagination
          }
          const batch = collect(html, /<div class="company-name"[^>]*>([^<]+)<\/div>/g);
          if (batch.length === 0) {
            break;
          }
          out.push(...batch);
          await sleep(1000);
        }
      }
      return out;
    },
  },
  {
    key: "fvca",
    assoc: "Pääomasijoittajat (FVCA)",
    country: "FI",
    fetch: async () => {
      const out: { name: string }[] = [];
      for (const type of ["general_partner", "limited_partners", "associate_member"]) {
        const html = await fetchText(
          `https://paaomasijoittajat.fi/en/members/member-directory/?type=${type}`,
        );
        out.push(...collect(html, /<div class="flex-item four member[^"]*"[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g));
        await sleep(1000);
      }
      return out;
    },
  },
  {
    key: "nvca_no",
    assoc: "NVCA (Norway)",
    country: "NO",
    fetch: async () => {
      const html = await fetchText("https://www.nvca.no/liste-medlem-medlemmer/");
      return collect(html, /<a [^>]*class="members-card-link"[^>]*>([^<]+)<\/a>/g);
    },
  },
  {
    key: "aktiveejere",
    assoc: "Aktive Ejere (ex-DVCA)",
    country: "DK",
    fetch: async () => {
      const html = await fetchText("https://aktiveejere.dk/alle-medlemmer/");
      return collect(html, /<span class="uk-link-heading"[^>]*>([^<]+)<\/span>/g);
    },
  },
  {
    key: "svca",
    assoc: "SVCA",
    country: "SE",
    fetch: async () => {
      const out: { name: string }[] = [];
      const seen = new Set<string>();
      for (const url of [
        "https://www.svca.se/ordinarie-medlemmar/",
        "https://www.svca.se/associerade-medlemmar/",
      ]) {
        const html = await fetchText(url);
        const re = /<a href="(https?:\/\/[^"]+)"[^>]*target="_blank"[^>]*>([^<]{3,220})<\/a>/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
          const href = m[1]!;
          const name = decodeEntities(m[2]!);
          if (/facebook|linkedin|twitter|instagram|youtube|mailto|svca\.se/.test(href)) {
            continue;
          }
          if (name.length < 3 || /^(läs mer|read more|here|här)$/i.test(name) || seen.has(name.toLowerCase())) {
            continue;
          }
          seen.add(name.toLowerCase());
          out.push({ name });
        }
        await sleep(1000);
      }
      return out;
    },
  },
  {
    key: "invest_austria",
    assoc: "invest.austria (ex-AVCO)",
    country: "AT",
    fetch: async () => {
      const html = await fetchText("https://www.invest-austria.com/ourmembers");
      // Wix SSR warmup JSON carries firms AND individuals; keep titles with a
      // corporate signal to avoid importing people.
      const corporate =
        /\b(GmbH|AG|KG|SE|Partners?|Capital|Ventures?|Invest|Equity|Fund|Advisors?|Advisory|Management|Holding|SICAV|Bank|Beteiligung|Group)\b/i;
      return collect(html, /"title":"([^"]{3,120})"/g).filter((r) => corporate.test(r.name));
    },
  },
];

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const onlyIdx = argv.indexOf("--only");
  const only = onlyIdx >= 0 ? new Set(argv[onlyIdx + 1]!.split(",").map((s) => s.trim())) : null;
  const capIdx = argv.indexOf("--cap");
  const cap = capIdx >= 0 ? Number.parseInt(argv[capIdx + 1] ?? "400", 10) : 400;

  const summary: string[] = [];
  for (const adapter of ADAPTERS) {
    if (only !== null && !only.has(adapter.key)) {
      continue;
    }
    let members: { name: string; website?: string | null }[];
    try {
      members = (await adapter.fetch()).slice(0, cap);
    } catch (error) {
      summary.push(`✗ ${adapter.assoc}: fetch failed — ${String(error).slice(0, 100)}`);
      continue;
    }
    if (members.length < 5) {
      summary.push(`✗ ${adapter.assoc}: only ${members.length} names parsed — site drifted, skipped`);
      continue;
    }
    let created = 0;
    let merged = 0;
    let ambiguous = 0;
    const tag = `assoc_${adapter.key}`;
    for (const member of members) {
      const resolved = await resolveEntity({
        name: member.name,
        country: adapter.country,
        kindHint: "organization",
      });
      if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
        const tagRows = await db
          .select({ tag: entityTags.tag })
          .from(entityTags)
          .where(eq(entityTags.entityId, resolved.entityId));
        if (!tagRows.some((t) => t.tag === tag)) {
          await db.insert(entityTags).values([{ entityId: resolved.entityId, tag }]);
        }
        merged += 1;
        continue;
      }
      if (resolved.outcome === "ambiguous") {
        ambiguous += 1;
        continue;
      }
      const entity = await createEntity({
        kind: "organization",
        name: member.name,
        country: adapter.country,
        tags: [tag, "needs_verification"],
      });
      await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, entity.id));
      await db.insert(organizations).values({
        entityId: entity.id,
        website: member.website ?? null,
        verificationNote: `${adapter.assoc} member directory (clean-100 Part 4; awaiting verification)`,
      });
      created += 1;
    }
    summary.push(
      `✓ ${adapter.assoc}: ${members.length} names — created ${created} provisional, merged ${merged}, ambiguous ${ambiguous}`,
    );
    await sleep(1500);
  }

  console.log("\n=== association harvest report ===");
  for (const line of summary) {
    console.log(line);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
