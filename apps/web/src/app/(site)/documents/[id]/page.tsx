import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  getDocumentForChat,
  getMemberByClerkId,
  listDocChats,
  resolveMemberTier,
  upsertMemberProfile,
} from "@continuum/db";
import { FilingChatBox } from "@/components/filing-chat-box";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false, follow: false },
};

/**
 * /documents/[id] (Phase 34C) — member-gated single-document view with
 * grounded Q&A. Answers quote the document verbatim or say plainly that
 * it doesn't state the thing; cached answers render for everyone free.
 */
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound();
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    notFound();
  }
  const document = await getDocumentForChat(id);
  if (document === null) {
    notFound();
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  const founding = (await resolveMemberTier(member.id)) === "founding";
  const chats = await listDocChats(id);

  return (
    <div className="max-w-3xl py-10">
      <h1 className="type-h1">{document.title ?? "Source document"}</h1>
      <p className="type-small mt-2 text-ink-muted">
        {document.sourceName ?? "Unattributed source"}
        {document.fetchedAt !== null ? ` · fetched ${document.fetchedAt.toISOString().slice(0, 10)}` : ""}
        {document.language !== null ? ` · ${document.language}` : ""}
        {document.url !== null ? (
          <>
            {" · "}
            <a href={document.url} rel="noopener noreferrer" className="text-accent hover:underline">
              original ↗
            </a>
          </>
        ) : null}
      </p>

      <section className="mt-6">
        <h2 className="type-label">Ask this document</h2>
        <p className="type-small mt-1 text-ink-muted">
          Answers come only from this document&apos;s text, with verbatim quotes — or an honest
          &ldquo;it doesn&apos;t say.&rdquo;
          {founding ? "" : " Free members: 3 questions/day."}
        </p>
        <FilingChatBox documentId={id} />
      </section>

      {chats.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-label">Asked of this document</h2>
          <div className="mt-3 space-y-5">
            {chats.map((chat, index) => (
              <div key={index} className="border-t border-line pt-3">
                <p className="text-[13px] font-medium text-ink">{chat.question}</p>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-secondary">
                  {chat.answer.answer}
                </p>
                {chat.answer.quotes.map((quote, quoteIndex) => (
                  <blockquote
                    key={quoteIndex}
                    className="mt-2 border-l-2 border-line-strong pl-3 text-[13px] leading-[1.55] text-ink"
                  >
                    &ldquo;{quote.verbatim}&rdquo;
                    {quote.note !== "" ? (
                      <span className="type-small block text-ink-muted">— {quote.note}</span>
                    ) : null}
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 border-t border-line pt-4">
        <h2 className="type-label">Document text (excerpt)</h2>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.6] text-ink-secondary">
          {document.contentText.slice(0, 4000)}
          {document.contentText.length > 4000 ? "…" : ""}
        </p>
      </section>
    </div>
  );
}
