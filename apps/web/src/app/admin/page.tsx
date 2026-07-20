import Link from "next/link";

export default function AdminIndexPage() {
  return (
    <div>
      <h1 className="type-h2">Admin</h1>
      <p className="mt-2 max-w-xl text-ink-secondary">
        Working surface for the Continuum Alternatives universe. Entities, edges and timeline facts
        are managed from entity pages; proposed items await decisions in Review.
      </p>
      <ul className="mt-6 space-y-2 text-[13px]">
        <li>
          <Link href="/admin/entities" className="text-accent hover:underline">
            Entities
          </Link>{" "}
          — search, create and edit universe entries
        </li>
        <li>
          <Link href="/admin/review" className="text-accent hover:underline">
            Review
          </Link>{" "}
          — approve or reject proposed edges and facts
        </li>
      </ul>
    </div>
  );
}
