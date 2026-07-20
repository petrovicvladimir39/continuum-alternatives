import { publishedArticleBySlug } from "@continuum/db";
import { OG_SIZE, ogArticleImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Continuum Desk article";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await publishedArticleBySlug(slug);
  return ogArticleImage({ headline: detail?.article.headline ?? "Continuum Desk" });
}
