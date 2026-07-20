import Link from "next/link";
import type { ReactNode } from "react";
import type { ArticleDetail } from "@continuum/db";
import { EntityLogo } from "@/components/ui/entity-logo";
import { Tag } from "@/components/ui/tag";
import { ClassChip, ClassKicker, ClassTopRule } from "@/components/editorial/class-accent";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";
import { SubscribeBlock } from "@/components/subscribe-block";

/**
 * ONE article template (Phase 27D) — kicker/rule/chip are the only class
 * accent slots; neutral (unclassified) articles simply omit them. Serves
 * the public article page AND the desk's live preview.
 */

/** Markdown SUBSET renderer: paragraphs, **bold**, [links](https-only). */
export function renderArticleBody(bodyMd: string): ReactNode[] {
  return bodyMd
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((paragraph, index) => (
      <p key={index} className="mb-4 text-[15px] leading-[1.65] text-ink">
        {renderInline(paragraph)}
      </p>
    ));
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tokenize links first, then bold inside remaining text.
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(...renderBold(text.slice(cursor, match.index), () => key++));
    }
    nodes.push(
      <a
        key={`l${key++}`}
        href={match[2]!}
        rel="noopener noreferrer"
        className="text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
      >
        {match[1]}
      </a>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    nodes.push(...renderBold(text.slice(cursor), () => key++));
  }
  return nodes;
}

function renderBold(text: string, nextKey: () => number): ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={`b${nextKey()}`} className="font-medium">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function entityPath(kind: string, slug: string): string {
  const base = kind === "organization" ? "companies" : kind === "fund_vehicle" ? "funds" : "deals";
  return `/${base}/${slug}`;
}

export function ArticleView({ detail, preview = false }: { detail: ArticleDetail; preview?: boolean }) {
  const { article, entity, citations } = detail;
  const publishedOn = article.publishedAt?.toISOString().slice(0, 10) ?? null;

  return (
    <article>
      <ClassTopRule assetClass={article.assetClass} />
      <div className="mt-3">
        <ClassKicker assetClass={article.assetClass} strategy={article.strategy} />
      </div>
      <h1 className="mt-2 font-serif text-[34px] font-medium leading-[1.15] text-ink">
        {article.headline}
      </h1>
      {article.deck !== null ? (
        <p className="mt-3 text-[16px] leading-[1.5] text-ink-secondary">{article.deck}</p>
      ) : null}
      <p className="type-data mt-3 flex flex-wrap items-center gap-2 border-b border-line pb-4 text-ink-muted">
        <span>{article.byline}</span>
        {publishedOn !== null ? <span>· {publishedOn}</span> : null}
        <ClassChip assetClass={article.assetClass} strategy={article.strategy} />
        {article.channels.map((channel) => (
          <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
            {channel}
          </Tag>
        ))}
      </p>

      <div className="mt-6 flex flex-wrap gap-8">
        <div className="min-w-0 max-w-[68ch] flex-1">{renderArticleBody(article.bodyMd)}</div>
        {entity !== null ? (
          <aside className="w-[220px] shrink-0">
            <div className="border border-line p-4">
              <EntityLogo name={entity.name} logoUrl={entity.logoUrl} size="md" />
              <p className="mt-2.5 text-[14px] font-medium leading-snug">{entity.name}</p>
              {entity.country !== null ? (
                <p className="type-small mt-0.5 text-ink-muted">{countryName(entity.country)}</p>
              ) : null}
              {!preview ? (
                <Link
                  href={entityPath(entity.kind, entity.slug)}
                  className="type-small mt-2 block text-accent"
                >
                  Full profile →
                </Link>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {!preview ? (
        <div className="mt-8 max-w-xl">
          <SubscribeBlock compact />
        </div>
      ) : null}

      {citations.length > 0 || article.sourceUrls.length > 0 ? (
        <footer className="mt-8 border-t border-line pt-4">
          <p className="type-label mb-2">Sources</p>
          <ol className="space-y-1.5">
            {citations.map((citation, index) => (
              <li key={citation.factId} className="type-small text-ink-secondary">
                {index + 1}. {citation.factTitle} · {citation.occurredOn}
                {citation.sourceName !== null ? ` · ${citation.sourceName}` : ""}
                {citation.documentUrl !== null ? (
                  <>
                    {" · "}
                    <a
                      href={citation.documentUrl}
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {citation.documentUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                    </a>
                  </>
                ) : null}
              </li>
            ))}
            {article.sourceUrls.map((url, index) => (
              <li key={url} className="type-small text-ink-secondary">
                {citations.length + index + 1}.{" "}
                <a href={url} rel="noopener noreferrer" className="text-accent hover:underline">
                  {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
                </a>
              </li>
            ))}
          </ol>
        </footer>
      ) : null}
    </article>
  );
}
