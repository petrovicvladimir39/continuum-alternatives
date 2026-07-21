import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseAsOf } from "@continuum/shared";
import { getPublicProfile, getRelated } from "@continuum/db";
import { EntityProfile } from "@/components/public/entity-profile";
import { profileJsonLd, profileMetadata } from "@/lib/profile-seo";

// Public profiles exist for organizations, fund vehicles, and deals only.
// People pages are DELIBERATELY EXCLUDED — GDPR: no public person profiles.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfile(slug, "organization");
  if (profile === null) {
    return { title: "Company" };
  }
  return profileMetadata(profile);
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ asof?: string }>;
}) {
  const { slug } = await params;
  // Phase 34A: ?asof reconstructs the record at a past date (both time
  // dimensions — see repo/public.ts).
  const asof = parseAsOf((await searchParams).asof, new Date().toISOString().slice(0, 10));
  // Only status='active' entities render; provisional and everything else 404.
  const profile = await getPublicProfile(slug, "organization", { asof });
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
      <EntityProfile
        profile={profile}
        similar={similar}
        asof={asof}
        basePath={`/companies/${slug}`}
      />
    </>
  );
}
