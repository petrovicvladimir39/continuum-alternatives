import Link from "next/link";

export default function AdminTimelinePage() {
  return (
    <div>
      <h1 className="type-h2">Timeline</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Timeline facts are managed on entity pages — find an entity in{" "}
        <Link href="/admin/entities" className="text-accent hover:underline">
          Entities
        </Link>{" "}
        and use its Timeline section.
      </p>
    </div>
  );
}
