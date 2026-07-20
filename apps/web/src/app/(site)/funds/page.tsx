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
    title: "Funds",
    description:
      "Fund vehicles investing across Europe — PE, VC, private credit, and distressed strategies, with managers and vintages.",
    alternates: { canonical: "https://continuumalternatives.com/funds" },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FundsIndexPage({
  searchParams,
}: {
  searchParams: Promise<IndexSearchParams>;
}) {
  return (
    <EntityIndex
      kind="fund_vehicle"
      basePath="/funds"
      title="Funds"
      intro="Fund vehicles active across Europe in private equity, venture, credit, and special situations, linked to their managers and deals."
      searchParams={await searchParams}
    />
  );
}
