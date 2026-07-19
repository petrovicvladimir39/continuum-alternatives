import { Tag } from "@/components/ui/tag";

export function formatTimestamp(value: Date | null): string {
  return value === null ? "" : value.toISOString().slice(0, 16).replace("T", " ");
}

export function RunStatus({ status }: { status: string | null }) {
  if (status === null) {
    return <span className="text-[13px] text-ink-muted">never</span>;
  }
  return <Tag variant={status === "error" ? "distressed" : "neutral"}>{status}</Tag>;
}
