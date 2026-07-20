import { getBySlug } from "@continuum/db";
import { OG_SIZE, ogEntityImage } from "@/lib/og";
import { countryName } from "@/lib/public-labels";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Deal record — Continuum Alternatives";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getBySlug(slug);
  return ogEntityImage({
    name: detail?.entity.name ?? "Continuum Alternatives",
    kindLabel: "Deal",
    country: detail?.entity.country ? countryName(detail.entity.country) : null,
  });
}
