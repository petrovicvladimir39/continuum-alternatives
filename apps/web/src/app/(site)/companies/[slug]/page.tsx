import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only status='active' entities render; provisional and everything else 404.
  const profile = await getPublicProfile(slug, "organization");
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
      <EntityProfile profile={profile} similar={similar} />
    </>
  );
}
