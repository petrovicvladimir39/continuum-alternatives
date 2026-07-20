import Link from "next/link";
import { notFound } from "next/navigation";
import { articleDetailById } from "@continuum/db";
import { approveArticleAction, rejectArticleAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { ArticleEditForm } from "./article-edit-form";

export const dynamic = "force-dynamic";

export default async function ReviewArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await articleDetailById(id);
  if (detail === null) {
    notFound();
  }
  const { article, entity, citations } = detail;

  return (
    <div>
      <p className="text-[13px]">
        <Link href="/admin/review?filter=articles" className="text-accent hover:underline">
          ← Review
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="type-h2">Article review</h1>
        <Tag>{article.status}</Tag>
        <span className="type-data text-ink-muted">
          {article.byline}
          {entity !== null ? ` · ${entity.name}` : ""} · {article.channels.join(", ") || "no channels"}
        </span>
      </div>

      {article.status === "proposed" ? (
        <div className="mt-4 flex items-center gap-3">
          <form action={approveArticleAction}>
            <input type="hidden" name="articleId" value={article.id} />
            <Button type="submit">Approve → publish</Button>
          </form>
          <form action={rejectArticleAction}>
            <input type="hidden" name="articleId" value={article.id} />
            <Button type="submit" variant="ghost">
              Reject
            </Button>
          </form>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="type-label mb-3">Draft (editable while proposed)</h2>
          <ArticleEditForm
            articleId={article.id}
            editable={article.status === "proposed"}
            initial={{
              headline: article.headline,
              deck: article.deck ?? "",
              bodyMd: article.bodyMd,
            }}
          />
        </div>
        <div>
          <h2 className="type-label mb-3">Underlying facts + verbatim excerpts</h2>
          <div className="space-y-4">
            {citations.map((citation) => (
              <div key={citation.factId} className="border border-line bg-surface p-4">
                <p className="text-[14px] font-medium">{citation.factTitle}</p>
                <p className="type-data mt-1 text-ink-muted">
                  {citation.occurredOn}
                  {citation.sourceName !== null ? ` · ${citation.sourceName}` : ""}
                </p>
                {citation.excerpt !== null ? (
                  <blockquote className="type-small mt-2 border-l-2 border-line-strong pl-3 text-ink-secondary">
                    “{citation.excerpt}”
                  </blockquote>
                ) : null}
                {citation.documentUrl !== null ? (
                  <p className="type-small mt-2">
                    <a
                      href={citation.documentUrl}
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {citation.documentUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                    </a>
                  </p>
                ) : null}
              </div>
            ))}
            {citations.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No fact citations attached.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
