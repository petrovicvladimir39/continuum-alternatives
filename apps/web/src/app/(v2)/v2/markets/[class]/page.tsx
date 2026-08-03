import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClassFront } from "@/components/v2/markets/class-front";
import { V2_CLASSES, v2ClassBySlug } from "@/lib/v2/taxonomy";

export function generateStaticParams() {
  return V2_CLASSES.map((c) => ({ class: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ class: string }>;
}): Promise<Metadata> {
  const { class: slug } = await params;
  const cls = v2ClassBySlug(slug);
  return { title: cls === null ? "Markets" : `${cls.label} — Markets` };
}

export default async function MarketClassPage({
  params,
}: {
  params: Promise<{ class: string }>;
}) {
  const { class: slug } = await params;
  if (v2ClassBySlug(slug) === null) {
    notFound();
  }
  return <ClassFront classSlug={slug} />;
}
