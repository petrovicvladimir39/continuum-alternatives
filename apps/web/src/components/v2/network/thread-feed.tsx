"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildMockThreads,
  MOCK_ENTITIES,
  MOCK_MEMBERS,
  mockAvatar,
  splitMentions,
  type MockThread,
} from "@continuum/shared";
import { EntityHoverCard } from "@/components/v2/entity-hover-card";
import { timeAgo } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * P3 — ThreadFeed. Posts embed @{Entity} mentions rendered as hover-cards;
 * the composer's @ autocompletes against the mock entity set ($-tickers
 * resolve fund vehicles). Reactions follow the platform model shape
 * (Validate=credible / Dispute=doubtful). Mock state is session-local;
 * cutover points the composer and reactions at the threads API.
 */

export function MentionBody({ body }: { body: string }) {
  return (
    <>
      {splitMentions(body).map((part, i) =>
        part.type === "mention" ? (
          <EntityHoverCard key={i} name={part.value} />
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}

export function MemberLine({ memberId, at }: { memberId: string; at: string }) {
  const member = MOCK_MEMBERS.find((m) => m.id === memberId);
  if (member === undefined) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      <img src={mockAvatar(member.avatarSeed)} alt="" width={20} height={20} className="h-5 w-5 border border-line" />
      <span className="type-small text-ink">{member.name}</span>
      <span className="type-small text-ink-muted">· {member.organization}</span>
      <span className="type-data ml-auto text-ink-muted" suppressHydrationWarning>
        {timeAgo(at)}
      </span>
    </div>
  );
}

export function ThreadCard({ thread, detail = false }: { thread: MockThread; detail?: boolean }) {
  const [expanded, setExpanded] = useState(detail);
  const [reaction, setReaction] = useState<"validate" | "dispute" | null>(null);
  const accent = v2Accent(thread.assetClass, null);
  const cls = v2ClassFor(thread.assetClass);

  return (
    <article className={`border-b border-line bg-surface px-4 py-3 ${accent?.left ?? ""}`}>
      <div className={`type-label ${accent?.text ?? "text-ink-muted"}`}>{cls?.label}</div>
      <div className="mt-1.5">
        <MemberLine memberId={thread.root.memberId} at={thread.root.postedAt} />
      </div>
      <p className="type-body mt-2">
        <MentionBody body={thread.root.body} />
      </p>
      <div className="mt-2 flex items-center gap-1 text-ink-muted">
        <button
          type="button"
          onClick={() => setReaction(reaction === "validate" ? null : "validate")}
          className={`type-label cursor-pointer px-1.5 py-0.5 transition-colors hover:text-ink ${reaction === "validate" ? "text-positive" : ""}`}
        >
          [ Validate {thread.validates + (reaction === "validate" ? 1 : 0)} ]
        </button>
        <button
          type="button"
          onClick={() => setReaction(reaction === "dispute" ? null : "dispute")}
          className={`type-label cursor-pointer px-1.5 py-0.5 transition-colors hover:text-ink ${reaction === "dispute" ? "text-negative" : ""}`}
        >
          [ Dispute {thread.disputes + (reaction === "dispute" ? 1 : 0)} ]
        </button>
        {detail ? (
          <span className="type-label px-1.5 py-0.5">[ {thread.replies.length} replies ]</span>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="type-label cursor-pointer px-1.5 py-0.5 transition-colors hover:text-ink"
          >
            [ {expanded ? "Hide" : "Show"} {thread.replies.length} replies ]
          </button>
        )}
        {!detail ? (
          <Link href={`/v2/network/threads/${thread.id}`} className="type-label ml-auto px-1.5 py-0.5 transition-colors hover:text-ink">
            [ Open ]
          </Link>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-l border-line pl-4">
          {thread.replies.map((reply) => (
            <div key={reply.id}>
              <MemberLine memberId={reply.memberId} at={reply.postedAt} />
              <p className="type-small mt-1 text-ink-secondary">
                <MentionBody body={reply.body} />
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** Composer with @entity autocomplete and $fund tickers. */
export function ThreadComposer({ onPost }: { onPost: (body: string) => void }) {
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => {
    if (mentionQuery === null || mentionQuery.length < 1) {
      return [];
    }
    const q = mentionQuery.toLowerCase();
    const pool = mentionQuery.startsWith("$")
      ? MOCK_ENTITIES.filter((e) => e.kind === "fund_vehicle")
      : MOCK_ENTITIES;
    const needle = q.replace(/^\$/, "");
    return pool.filter((e) => e.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [mentionQuery]);

  const handleChange = (next: string) => {
    setValue(next);
    const caret = inputRef.current?.selectionStart ?? next.length;
    const upToCaret = next.slice(0, caret);
    const m = /(^|\s)([@$])([\w .&-]{1,40})$/.exec(upToCaret);
    setMentionQuery(m === null ? null : `${m[2] === "$" ? "$" : ""}${m[3]}`);
  };

  const insertMention = (name: string) => {
    const caret = inputRef.current?.selectionStart ?? value.length;
    const upToCaret = value.slice(0, caret);
    const rest = value.slice(caret);
    const replaced = upToCaret.replace(/(^|\s)([@$])[\w .&-]{0,40}$/, `$1@{${name}} `);
    setValue(replaced + rest);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  return (
    <div className="relative border-b border-line bg-surface p-3">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        rows={2}
        placeholder="Post to the network… @ mentions entities, $ mentions funds"
        className="type-body w-full resize-none bg-transparent outline-none placeholder:text-ink-muted"
      />
      {suggestions.length > 0 ? (
        <div className="absolute left-3 top-full z-30 -mt-1 w-[320px] border border-line-strong bg-popover">
          {suggestions.map((e) => {
            const cls = v2ClassFor(e.assetClass);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => insertMention(e.name)}
                className="flex w-full cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <span className="type-small min-w-0 truncate">{e.name}</span>
                <span className={`type-label shrink-0 ${cls?.accent.text ?? "text-ink-muted"}`}>{cls?.code}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className="type-mono text-ink-muted">MOCK COMPOSER · POSTS ARE SESSION-LOCAL</span>
        <button
          type="button"
          disabled={value.trim() === ""}
          onClick={() => {
            onPost(value.trim());
            setValue("");
          }}
          className="type-label cursor-pointer bg-primary px-3 py-1 text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-default disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}

export function ThreadFeed({ classFilter }: { classFilter?: string }) {
  const reduced = useReducedMotion();
  const baseThreads = useMemo(() => buildMockThreads(), []);
  const [posted, setPosted] = useState<MockThread[]>([]);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTicker((c) => (c < 5 ? c + 1 : c)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const threads = useMemo(() => {
    const all = [...posted, ...baseThreads];
    return classFilter === undefined ? all : all.filter((t) => t.assetClass === classFilter);
  }, [posted, baseThreads, classFilter]);

  const handlePost = (body: string) => {
    const me = MOCK_MEMBERS[0]!;
    setPosted((prev) => [
      {
        id: `local-${prev.length + 1}`,
        root: { id: `local-${prev.length + 1}-root`, memberId: me.id, postedAt: new Date().toISOString(), body },
        replies: [],
        assetClass: "private-equity",
        validates: 0,
        disputes: 0,
        saves: 0,
      },
      ...prev,
    ]);
  };

  return (
    <div className="border border-line">
      <ThreadComposer onPost={handlePost} />
      {ticker > 0 ? (
        <div className="type-mono border-b border-line bg-surface px-4 py-1.5 text-ink-secondary">
          ▲ {ticker} NEW POST{ticker > 1 ? "S" : ""} IN THE NETWORK
        </div>
      ) : null}
      {threads.length === 0 ? (
        <div className="terminal-empty m-4">[ 0 THREADS MATCH THIS FILTER ]</div>
      ) : (
        threads.map((t, i) => (
          <motion.div
            key={t.id}
            initial={reduced === true ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.25) }}
          >
            <ThreadCard thread={t} />
          </motion.div>
        ))
      )}
    </div>
  );
}
