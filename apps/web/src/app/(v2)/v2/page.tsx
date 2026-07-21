import { Suspense } from "react";
import { NewsCanvas } from "@/components/v2/news/news-canvas";

/** /v2 — News & AI Command Canvas is the default front. */
export default function V2Home() {
  return (
    <Suspense>
      <NewsCanvas />
    </Suspense>
  );
}
