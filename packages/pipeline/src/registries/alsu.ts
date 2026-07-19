import { FETCH_TIMEOUT_MS, USER_AGENT } from "../crawl-shared";
import type { RegistryHandler, RegistryItem } from "./types";

/**
 * ALSU (alsu.gov.rs) — Serbian bankruptcy supervision agency. Both listings are
 * server-rendered WordPress pages, newest first, paginated with ?paged=N.
 * Parsers are tolerant regex extraction; meta captures listing values verbatim
 * as raw strings — no interpretation, no entity resolution (Phase 10's job).
 */

const FIELD_KEYS: Record<string, string> = {
  Суд: "court",
  "Број судског решења": "caseRef",
  "Стечајни управник": "administrator",
  Општина: "municipality",
  Град: "city",
  "Матични број": "registryId",
  "Статус стечајног поступка": "status",
  "Метод продаје": "saleMethod",
  Место: "place",
  "Процењена вредност": "estimatedValue",
  "Почетна цена": "startingPrice",
  Вредност: "value",
  "Статус продаје": "saleStatus",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInfoFields(block: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const match of block.matchAll(
    /<span class="info_title">([^<]+?):<\/span>(?:&nbsp;|\s)*([^<]*)</g,
  )) {
    const label = decodeEntities(match[1] ?? "");
    const value = decodeEntities(match[2] ?? "");
    const key = FIELD_KEYS[label];
    if (key !== undefined && value !== "") {
      meta[key] = value;
    }
  }
  return meta;
}

/** Case registry rows: /ci/stecajni-postupak/stecajevi/ */
export function parseAlsuStecajevi(html: string): RegistryItem[] {
  const items: RegistryItem[] = [];
  for (const match of html.matchAll(
    /<a href="([^"]+)" class="ste-item-link"><div class="ste-item">([\s\S]*?)<\/div><\/a>/g,
  )) {
    const url = match[1];
    const block = match[2];
    if (url === undefined || block === undefined) {
      continue;
    }
    const name = decodeEntities(/<h3>([\s\S]*?)<\/h3>/.exec(block)?.[1] ?? "");
    const openedOn = decodeEntities(/Датум отварања:\s*([0-9.]+)/.exec(block)?.[1] ?? "");
    const meta = parseInfoFields(block);
    if (name !== "") {
      meta.debtorName = name;
    }
    if (openedOn !== "") {
      meta.openedOn = openedOn;
    }
    meta.listing = "alsu-stecajevi";
    items.push({
      url,
      title: name === "" ? url : name,
      ...(openedOn !== "" ? { publishedAt: openedOn } : {}),
      meta,
    });
  }
  return items;
}

/** Asset-sale announcement cards: /ci/stecajni-postupak/oglasi-prodaje/ */
export function parseAlsuProdaje(html: string): RegistryItem[] {
  const items: RegistryItem[] = [];
  for (const match of html.matchAll(
    /<article class="oglas-card[^"]*">\s*<a href="([^"]+)" class="full-link">[\s\S]*?<\/article>/g,
  )) {
    const url = match[1];
    const block = match[0];
    if (url === undefined) {
      continue;
    }
    const name = decodeEntities(/<h4>([\s\S]*?)<\/h4>/.exec(block)?.[1] ?? "");
    const saleDate = decodeEntities(
      /<span class="sale-date">([^<]*)<\/span>/.exec(block)?.[1] ?? "",
    );
    const publishedOn = decodeEntities(
      /<span class="pub-date">\s*Објављено:\s*([^<]*)<\/span>/.exec(block)?.[1] ?? "",
    );
    const meta = parseInfoFields(block);
    if (name !== "") {
      meta.debtorName = name;
    }
    if (saleDate !== "") {
      meta.saleDate = saleDate;
    }
    if (publishedOn !== "") {
      meta.publishedOn = publishedOn;
    }
    meta.listing = "alsu-prodaje";
    items.push({
      url,
      title: name === "" ? url : name,
      ...(publishedOn !== "" ? { publishedAt: publishedOn } : {}),
      meta,
    });
  }
  return items;
}

async function fetchListing(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for listing ${url}`);
  }
  return response.text();
}

export const alsuStecajeviHandler: RegistryHandler = async (source) => {
  if (!source.url) {
    throw new Error(`Source "${source.name}" has no url`);
  }
  return { items: parseAlsuStecajevi(await fetchListing(source.url)) };
};

export const alsuProdajeHandler: RegistryHandler = async (source) => {
  if (!source.url) {
    throw new Error(`Source "${source.name}" has no url`);
  }
  return { items: parseAlsuProdaje(await fetchListing(source.url)) };
};
