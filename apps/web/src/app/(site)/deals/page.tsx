import type { Metadata } from "next";
import { EntityIndex, type IndexSearchParams } from "@/components/public/entity-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Transactions in Europe's alternative-asset record — NPL sales, buyouts, rounds, credit facilities, and restructurings.",
};

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
