import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How Continuum Alternatives is built: primary sources, deterministic structuring, mechanical anti-fabrication guards, and human review before anything publishes.",
};

/** Resources → Methodology (Phase 25A). Honest description of the live pipeline only. */
export default function MethodologyPage() {
  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">Methodology</h1>

      <h2 className="type-h2 mt-8">Sources</h2>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-ink-secondary">
        The corpus is built from primary sources: official registers (GLEIF LEI records, national
        regulator registers such as CSSF, AMF, NBS, and the Bank of Lithuania), court and
        insolvency registries, official gazettes, firm newsrooms, and business press. Register
        records carry their register identifier as a deterministic key; register-grade rows are
        the only ones that activate without a further gate.
      </p>

      <h2 className="type-h2 mt-8">Structuring</h2>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-ink-secondary">
        Extraction is guarded mechanically: entity names must appear verbatim in the source,
        every fact carries a verbatim excerpt from its document, and monetary figures are
        transcribed as printed — the platform never computes, converts, or estimates amounts.
        Ambiguous name matches are never merged automatically; they queue for human judgment.
      </p>

      <h2 className="type-h2 mt-8">Review</h2>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-ink-secondary">
        Nothing publishes without approval. Extracted facts, relationships, and Desk articles all
        land in a review queue as proposals; a human approves or rejects each one. Published
        items keep their citations — every fact on the site links to where it came from.
      </p>

      <h2 className="type-h2 mt-8">Corrections</h2>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-ink-secondary">
        The timeline is append-only: corrections are recorded as new facts rather than silent
        edits, preserving the record of what was known when. Write to{" "}
        <a href="mailto:hello@continuumalternatives.com" className="text-accent hover:underline">
          hello@continuumalternatives.com
        </a>{" "}
        about anything that looks wrong.
      </p>
    </div>
  );
}
