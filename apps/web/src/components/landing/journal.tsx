"use client";

/**
 * "Blog with search — magazine" Aceternity block, adapted as the landing
 * news section: cover story + fuzzy-searchable archive grid, fed from the
 * mock editorial articles (fictional entities). Cards link into /v2/news.
 */

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FuzzySearch from "fuzzy-search";
import { Container } from "@/components/landing/container";

export type JournalPost = {
  title: string;
  description: string;
  date: string;
  slug: string;
  image: string;
  author: string;
  readMinutes: number;
};

function truncate(text: string, length: number) {
  return text.length > length ? text.slice(0, length) + "…" : text;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Monogram avatar — no external headshots for fictional bylines. */
function AuthorAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 ${className ?? ""}`}
    >
      {initials}
    </span>
  );
}

export function LandingJournal({ posts }: { posts: JournalPost[] }) {
  const featured = posts[0];
  if (!featured) {
    return null;
  }

  return (
    <div
      id="news"
      className="relative overflow-hidden bg-neutral-50 px-4 dark:bg-neutral-950 md:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.12),transparent)]" />
      <Container className="relative pb-24 pt-12 md:pt-20">
        <header className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
              Editorial
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50 md:text-5xl">
              News &amp; analysis
            </h2>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
              Long-form notes from the desk — fund closes, market structure and
              the institutions behind them. Search the archive or start with this
              week&apos;s cover story.
            </p>
          </div>
        </header>

        <MagazineFeatured post={featured} />

        <MagazineSearchGrid posts={posts} featuredSlug={featured.slug} />
      </Container>
    </div>
  );
}

function MagazineFeatured({ post }: { post: JournalPost }) {
  return (
    <Link
      href={`/v2/news/${post.slug}`}
      className="group/cover relative mb-14 block overflow-hidden rounded-3xl border border-neutral-200/80 bg-neutral-900 shadow-sm dark:border-neutral-800 dark:shadow-none"
    >
      <div className="relative aspect-[21/9] min-h-[220px] md:aspect-[2.4/1]">
        {/* Plain <img>: seeded picsum placeholder, no next/image remote config. */}
        <img
          src={post.image}
          alt={post.title}
          className="h-full w-full object-cover transition duration-500 group-hover/cover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <span className="mb-2 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Cover story
          </span>
          <h3 className="max-w-3xl font-serif text-2xl font-medium leading-tight text-white md:text-4xl">
            {post.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
            {truncate(post.description, 160)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/90">
            <span className="flex items-center gap-2">
              <AuthorAvatar name={post.author} className="h-7 w-7 ring-2 ring-white/30" />
              {post.author}
            </span>
            <span className="text-white/50">·</span>
            <time dateTime={post.date}>{format(new Date(post.date), "MMMM d, yyyy")}</time>
            <span className="text-white/50">·</span>
            <span>{post.readMinutes} min</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MagazineSearchGrid({
  posts: allPosts,
  featuredSlug,
}: {
  posts: JournalPost[];
  featuredSlug: string;
}) {
  const [search, setSearch] = useState("");

  const searcher = useMemo(
    () => new FuzzySearch(allPosts, ["title", "description"], { caseSensitive: false }),
    [allPosts],
  );

  const [results, setResults] = useState(allPosts);
  useEffect(() => {
    setResults(searcher.search(search));
  }, [search, searcher]);

  const gridItems = useMemo(() => {
    if (search.trim()) {
      return results;
    }
    return results.filter((post) => post.slug !== featuredSlug);
  }, [results, search, featuredSlug]);

  return (
    <section aria-labelledby="archive-heading">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id="archive-heading"
          className="font-serif text-2xl font-medium text-neutral-900 dark:text-neutral-100"
        >
          From the archive
        </h3>
        <label className="relative w-full sm:max-w-md">
          <span className="sr-only">Search articles</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or topic…"
            className="w-full rounded-full bg-white py-3 pl-12 pr-4 text-sm text-neutral-800 shadow-sm shadow-black/10 outline-none ring-1 ring-black/10 transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-700/50"
          />
        </label>
      </div>

      {gridItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No articles match that search.
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gridItems.map((post) => (
            <li key={post.slug}>
              <MagazineCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MagazineCard({ post }: { post: JournalPost }) {
  return (
    <Link
      href={`/v2/news/${post.slug}`}
      className="group/card flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/10 ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-700"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {/* Plain <img>: seeded picsum placeholder, no next/image remote config. */}
        <img
          src={post.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover/card:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <time
          className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          dateTime={post.date}
        >
          {format(new Date(post.date), "MMM d, yyyy")}
        </time>
        <h4 className="mt-2 font-serif text-lg font-medium leading-snug text-neutral-900 dark:text-neutral-100">
          {post.title}
        </h4>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {truncate(post.description, 110)}
        </p>
        <div className="mt-4 flex items-center gap-2 pt-4">
          <AuthorAvatar name={post.author} className="h-6 w-6" />
          <span className="text-xs text-neutral-600 dark:text-neutral-300">{post.author}</span>
        </div>
      </div>
    </Link>
  );
}
