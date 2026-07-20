import Link from "next/link";
import { notFound } from "next/navigation";
import { db, digestItems, digests, entities, eq, timelineFacts } from "@continuum/db";
import { loadDigestSections } from "@continuum/pipeline";
import { toggleDigestItemAction } from "@/app/admin/actions";
import { Tag } from "@/components/ui/tag";
import type { ReactNode } from "react";
import { formatTimestamp } from "../../sources/run-status";
import { ApproveAndSend, SendAgain } from "./send-controls";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function DigestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(digests).where(eq(digests.id, id));
  const digest = rows[0];
  if (!digest) {
    notFound();
  }
  // All items (incl. excluded) for the editor view.
  const items = await db
    .select({
      id: digestItems.id,
      channel: digestItems.channel,
      rank: digestItems.rank,
      included: digestItems.included,
      title: timelineFacts.title,
      occurredOn: timelineFacts.occurredOn,
      confidence: timelineFacts.confidence,
      entityName: entities.name,
      entitySlug: entities.slug,
    })
    .from(digestItems)
    .innerJoin(timelineFacts, eq(digestItems.factId, timelineFacts.id))
    .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
    .where(eq(digestItems.digestId, id));
  const sections = await loadDigestSections(id);
  const channels = [...new Set(items.map((item) => item.channel))];
  const delivery = digest.delivery as Record<string, unknown>;
  const isDraft = digest.status === "draft";

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="type-h2">{digest.subject ?? String(digest.digestDate)}</h1>
        <Tag variant={digest.status === "draft" ? "equity" : "neutral"}>{digest.status ?? ""}</Tag>
        {digest.sentAt !== null ? (
          <span className="type-data text-ink-muted">sent {formatTimestamp(digest.sentAt)}</span>
        ) : null}
        {digest.status === "sent" ? (
          <Link
            href={`/digest/${String(digest.digestDate)}`}
            className="text-[13px] text-accent hover:underline"
          >
            public page
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        {channels.map((channel) => (
          <Section key={channel} title={channel}>
            <div className="space-y-3">
              {items
                .filter((item) => item.channel === channel)
                .sort((a, b) => a.rank - b.rank)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-wrap items-baseline justify-between gap-3 border border-line bg-surface p-3 ${
                      item.included === false ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <p className="text-[14px]">{item.title}</p>
                      <p className="type-data mt-0.5 text-ink-muted">
                        <Link
                          href={`/admin/entities/${item.entitySlug}`}
                          className="text-accent hover:underline"
                        >
                          {item.entityName}
                        </Link>{" "}
                        · {String(item.occurredOn)} · conf {item.confidence}
                      </p>
                    </div>
                    {isDraft ? (
                      <form action={toggleDigestItemAction}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="digestId" value={id} />
                        <button
                          type="submit"
                          className="text-[11px] text-ink-muted uppercase tracking-wide hover:text-accent"
                        >
                          {item.included === false ? "include" : "exclude"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
            </div>
          </Section>
        ))}

        <Section title="Delivery">
          {isDraft ? (
            <ApproveAndSend digestId={id} />
          ) : digest.status === "approved" ? (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-secondary">
                Approved but not fully sent — see the report below.
              </p>
              <SendAgain digestId={id} />
            </div>
          ) : (
            <p className="text-[13px] text-ink-secondary">
              Sent. {sections.reduce((sum, section) => sum + section.items.length, 0)} items
              delivered across {sections.length} channel(s).
            </p>
          )}
          {Object.keys(delivery).length > 0 ? (
            <pre className="type-data mt-4 max-w-xl overflow-x-auto border border-line bg-surface p-3 whitespace-pre-wrap">
              {JSON.stringify(delivery, null, 2)}
            </pre>
          ) : null}
        </Section>
      </div>
    </div>
  );
}
