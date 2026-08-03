import type { Metadata } from "next";
import { Suspense } from "react";
import { Screener } from "@/components/v2/products/screener";

export const metadata: Metadata = { title: "Company Intelligence — Products" };

export default function CompanyIntelligencePage() {
  return (
    <Suspense>
      <Screener />
    </Suspense>
  );
}
