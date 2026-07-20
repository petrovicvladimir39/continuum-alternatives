import Link from "next/link";
import { ALT_TAXONOMY, CLASS_LEVEL } from "@continuum/shared";
import { CHANNELS } from "@continuum/shared";
import { articleDetailById, db, articles, desc, documents, eq } from "@continuum/db";
import { ArticleView } from "@/components/editorial/article-view";
import { EntityPicker } from "@/components/admin/entity-picker";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { publishDraftAction, saveDraftAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The writing desk (Phase 27C). Server-roundtrip live preview: every Save
 * re-renders the REAL article template beside the form — kicker, rule, and
 * chip react to the class selection on save. Markdown subset only
 * (paragraphs, bold, links); the sanitizer strips the rest. NO LLM.
 */
export default async function WriteDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; fromDoc?: string; saved?: string; published?: string }>;
}) {
  const { id, fromDoc, saved, published } = await searchParams;

  const drafts = await db
    .select({ id: articles.id, headline: articles.headline, createdAt: articles.createdAt })
    .from(articles)
    .where(eq(articles.status, "draft"))
    .orderBy(desc(articles.createdAt));

  const detail = id !== undefined ? await articleDetailById(id) : null;
  const editing = detail !== null && detail.article.status === "draft" ? detail : null;

  // "Draft article from this" (from /admin/documents): prefill title + source URL.
  let prefillHeadline = "";
  let prefillSource = "";
  if (fromDoc !== undefined && editing === null) {
    const docRows = await db
      .select({ title: documents.title, url: documents.url })
      .from(documents)
      .where(eq(documents.id, fromDoc));
    prefillHeadline = docRows[0]?.title?.slice(0, 90) ?? "";
    prefillSource = docRows[0]?.url ?? "";
  }

  const article = editing?.article ?? null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="type-h2">Writing desk</h1>
        <Link href="/admin/write" className="text-[13px] text-accent hover:underline">
          New piece
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-[13px] text-ink-muted">
        Operator-authored pieces. Markdown subset: paragraphs, **bold**, [links](https://…) —
        headers, lists, images, and HTML are stripped. Published pieces appear everywhere Desk
        articles do; the byline stays Continuum Desk (one voice).
      </p>
      {saved === "1" ? <p className="mt-2 text-[13px] text-equity">Draft saved — preview updated below.</p> : null}
      {published === "1" ? <p className="mt-2 text-[13px] text-equity">Published.</p> : null}

      {drafts.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-line py-2 text-[13px]">
          <span className="type-label">Drafts</span>
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/admin/write?id=${draft.id}`}
              className={`hover:text-accent ${draft.id === article?.id ? "font-medium text-ink" : "text-ink-secondary"}`}
            >
              {draft.headline.slice(0, 40)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <form action={saveDraftAction} className="space-y-4">
          {article !== null ? <input type="hidden" name="articleId" value={article.id} /> : null}
          <div>
            <label className={labelClass} htmlFor="w-headline">
              Headline (≤90)
            </label>
            <input
              id="w-headline"
              name="headline"
              maxLength={90}
              required
              className={`${inputClass} font-serif text-[18px]`}
              defaultValue={article?.headline ?? prefillHeadline}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="w-deck">
              Deck (≤160)
            </label>
            <input
              id="w-deck"
              name="deck"
              maxLength={160}
              className={inputClass}
              defaultValue={article?.deck ?? ""}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="w-body">
              Body (paragraphs · **bold** · [links](url))
            </label>
            <textarea
              id="w-body"
              name="bodyMd"
              rows={16}
              required
              className={inputClass}
              defaultValue={article?.bodyMd ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="w-class">
                Asset class · strategy (author&apos;s choice)
              </label>
              <select
                id="w-class"
                name="classification"
                className={inputClass}
                defaultValue={
                  article?.assetClass
                    ? `${article.assetClass}:${article.strategy ?? CLASS_LEVEL}`
                    : ""
                }
              >
                <option value="">Neutral (no classification)</option>
                {ALT_TAXONOMY.map((assetClass) => (
                  <optgroup key={assetClass.slug} label={assetClass.label}>
                    <option value={`${assetClass.slug}:${CLASS_LEVEL}`}>
                      {assetClass.label} (class-level)
                    </option>
                    {assetClass.strategies.map((s) => (
                      <option key={s.slug} value={`${assetClass.slug}:${s.slug}`}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <span className={labelClass}>Channels</span>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-baseline gap-1">
                    <input
                      type="checkbox"
                      name="channels"
                      value={channel}
                      defaultChecked={article?.channels.includes(channel) ?? false}
                    />
                    {channel}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <EntityPicker label="Primary entity (optional)" name="primaryEntitySlug" />
          <div>
            <label className={labelClass} htmlFor="w-sources">
              Source URLs (whitespace-separated, rendered in the citation footer)
            </label>
            <textarea
              id="w-sources"
              name="sourceUrls"
              rows={2}
              className={inputClass}
              defaultValue={(article?.sourceUrls ?? (prefillSource !== "" ? [prefillSource] : [])).join("\n")}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="ghost">
              Save draft
            </Button>
          </div>
        </form>

        <div>
          <h2 className="type-label mb-3">Live preview (re-renders on save)</h2>
          {editing !== null ? (
            <div className="border border-line bg-ground p-5">
              <ArticleView detail={editing} preview />
              <form action={publishDraftAction} className="mt-6 border-t border-line pt-4">
                <input type="hidden" name="articleId" value={editing.article.id} />
                <Button type="submit">Publish</Button>
              </form>
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">
              Save a draft to see the real template render here — the kicker, top rule, and class
              chip respond to the class selection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
