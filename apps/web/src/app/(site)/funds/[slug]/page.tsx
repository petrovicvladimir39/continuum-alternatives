import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseAsOf } from "@continuum/shared";
import { getPublicProfile, getRelated } from "@continuum/db";
import { EntityProfile } from "@/components/public/entity-profile";
import { profileJsonLd, profileMetadata } from "@/lib/profile-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfile(slug, "fund_vehicle");
  if (profile === null) {
    return { title: "Fund" };
  }
  return profileMetadata(profile);
}

export default async function FundPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ asof?: string }>;
}) {
  const { slug } = await params;
  // Phase 34A: ?asof reconstructs the record at a past date.
  const asof = parseAsOf((await searchParams).asof, new Date().toISOString().slice(0, 10));
  const profile = await getPublicProfile(slug, "fund_vehicle", { asof });
  if (profile === null) {
    notFound();
  }
  const similar = await getRelated(profile.entity.id);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd(profile)) }}
      />
      <EntityProfile profile={profile} similar={similar} asof={asof} basePath={`/funds/${slug}`} />
    </>
  );
}
