import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community guidelines",
  description:
    "How discussion works on Continuum Alternatives: real names, professional conduct, and what moderation does.",
};

/**
 * /community-guidelines (Phase 30D) — plain language, ToS-grade substance
 * without legalese. Formal Terms of Service and privacy pages are an
 * operator+counsel task (docs/POST-RUN-CHECKLIST.md); we deliberately
 * render NO placeholder legal links — a "Terms" page that says nothing
 * would be worse than none.
 */
export default function CommunityGuidelinesPage() {
  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">Community guidelines</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
        Discussion here is attached to the record — an entity, an article — and written under your
        real name with the role you chose to state. These rules keep it worth reading.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="type-h2">Professional conduct</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
            Write as you would to a counterparty you respect. Disagree with statements, not with
            people. No harassment, no slurs, no dogpiling. Posts are flat and chronological —
            make one point well rather than arguing in fragments.
          </p>
        </section>
        <section>
          <h2 className="type-h2">No confidential information</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
            Do not post material non-public information, client-confidential terms, or anything
            you are bound to keep private — NDAs, MNPI, deal terms not yet public. If a fact
            belongs in the record, send the source through the proper channel instead.
          </p>
        </section>
        <section>
          <h2 className="type-h2">No market manipulation</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
            No pumping, no talking your book while pretending not to, no coordinated narratives.
            State your interest where it is material — your name and firm are already on the post.
          </p>
        </section>
        <section>
          <h2 className="type-h2">Moderation</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
            Any member can report a post. Moderators remove posts that break these rules — the
            thread keeps a &ldquo;Removed by moderators&rdquo; stub, so nothing disappears
            silently — and repeated violations suspend posting for a period. Moderation decisions
            are human; there is no algorithmic policing.
          </p>
        </section>
        <section>
          <h2 className="type-h2">Your words</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
            Posts are member speech, not the platform&rsquo;s editorial voice, and not investment
            advice. You are responsible for what you write.
          </p>
        </section>
      </div>
    </div>
  );
}
