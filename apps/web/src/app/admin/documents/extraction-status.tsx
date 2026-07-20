import { Tag } from "@/components/ui/tag";

export function extractionStatus(meta: unknown): string | null {
  if (meta === null || typeof meta !== "object") {
    return null;
  }
  const extraction = (meta as Record<string, unknown>).extraction;
  if (extraction === null || typeof extraction !== "object") {
    return null;
  }
  const status = (extraction as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

export function ExtractionStatusTag({ meta }: { meta: unknown }) {
  const status = extractionStatus(meta);
  if (status === null) {
    return <span className="text-[13px] text-ink-muted">pending</span>;
  }
  return <Tag variant={status === "error" ? "distressed" : "neutral"}>{status}</Tag>;
}
