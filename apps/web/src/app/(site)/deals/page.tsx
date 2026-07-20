import type { Metadata } from "next";
import { EntityIndex, type IndexSearchParams } from "@/components/public/entity-index";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<IndexSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return {
    title: "Deals",
    description:
      "Transactions in Europe's alternative-asset record — NPL sales, buyouts, rounds, credit facilities, and restructurings.",
    alternates: { canonical: "https://continuumalternatives.com/deals" },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DealsIndexPage({
  searchParams,
}: {
  searchParams: Promise<IndexSearchParams>;
}) {
  return (
    <EntityIndex
      kind="deal"
      basePath="/deals"
      title="Deals"
      intro="Recorded transactions — NPL portfolio sales, buyouts, venture rounds, credit facilities, and restructurings — each with amounts as reported and cited sources."
      searchParams={await searchParams}
    />
  );
}
