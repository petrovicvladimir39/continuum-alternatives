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
    title: "Companies",
    description:
      "Companies in Europe's alternative-asset record — portfolio companies, debtors, lenders, and advisors, with sourced timelines.",
    // Filtered/paginated views canonicalize to the base index; deep pages noindex.
    alternates: { canonical: "https://continuumalternatives.com/companies" },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

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
      intro="Organizations tracked across Europe — portfolio companies, debtors in insolvency, lenders, servicers, and advisors. Every profile is built from cited primary sources."
      searchParams={await searchParams}
    />
  );
}
