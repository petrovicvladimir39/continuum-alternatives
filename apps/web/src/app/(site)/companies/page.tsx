import type { Metadata } from "next";
import { EntityIndex, type IndexSearchParams } from "@/components/public/entity-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Companies in emerging Europe's private capital record — portfolio companies, debtors, lenders, and advisors, with sourced timelines.",
};

export default async function CompaniesIndexPage({
  searchParams,
}: {
  searchParams: Promise<IndexSearchParams>;
}) {
  return (
    <EntityIndex
      kind="organization"
      basePath="/companies"
      title="Companies"
      intro="Organizations tracked across emerging Europe — portfolio companies, debtors in insolvency, lenders, servicers, and advisors. Every profile is built from cited primary sources."
      searchParams={await searchParams}
    />
  );
}
