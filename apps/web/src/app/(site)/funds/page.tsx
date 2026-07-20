import type { Metadata } from "next";
import { EntityIndex, type IndexSearchParams } from "@/components/public/entity-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funds",
  description:
    "Fund vehicles investing in emerging Europe — PE, VC, private credit, and distressed strategies, with managers and vintages.",
};

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
      intro="Fund vehicles active in emerging Europe across private equity, venture, credit, and special situations, linked to their managers and deals."
      searchParams={await searchParams}
    />
  );
}
