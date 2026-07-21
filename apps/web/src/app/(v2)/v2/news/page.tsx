import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsCanvas } from "@/components/v2/news/news-canvas";

export const metadata: Metadata = { title: "News" };

/** /v2/news — same canvas as the home front. */
export default function NewsPage() {
  return (
    <Suspense>
      <NewsCanvas />
    </Suspense>
  );
}
