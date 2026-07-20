import type { Metadata } from "next";
import type { PublicProfile } from "@continuum/db";
import { SITE_ORIGIN } from "@/lib/public-labels";

export function profileUrl(profile: PublicProfile): string {
  const base =
    profile.entity.kind === "organization"
      ? "companies"
      : profile.entity.kind === "fund_vehicle"
        ? "funds"
        : "deals";
  return `${SITE_ORIGIN}/${base}/${profile.entity.slug}`;
}

export function profileDescription(profile: PublicProfile): string {
  const { entity } = profile;
  if (entity.summary !== null && entity.summary !== "") {
    return entity.summary;
  }
  const firstFact = profile.facts[0];
  if (firstFact !== undefined) {
    return firstFact.title;
  }
  return `${entity.name} on Continuum Alternatives — the map of European alternative assets.`;
}

export function profileMetadata(profile: PublicProfile): Metadata {
  const url = profileUrl(profile);
  const description = profileDescription(profile);
  return {
    // Root layout template renders "{name} — Continuum Alternatives".
    title: profile.entity.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: profile.entity.name, description, url },
  };
}

/**
 * schema.org JSON-LD: Organization for companies (name, url, address country);
 * funds and deals are plain WebPage with `about`. Event is deliberately not used.
 */
export function profileJsonLd(profile: PublicProfile): Record<string, unknown> {
  const { entity } = profile;
  const url = profileUrl(profile);
  if (entity.kind === "organization") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: entity.name,
      url,
      ...(entity.country !== null
        ? { address: { "@type": "PostalAddress", addressCountry: entity.country } }
        : {}),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: entity.name,
    url,
    about: {
      "@type": "Thing",
      name: entity.name,
      description: profileDescription(profile),
    },
  };
}
