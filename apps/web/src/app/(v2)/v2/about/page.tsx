import type { Metadata } from "next";
import Link from "next/link";
import { fmtInt } from "@/lib/v2/format";
import { TOTAL_COUNTRIES, TOTAL_ENTITIES } from "@/lib/v2/coverage";
import { V2_STRATEGY_COUNT } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "About" };

/**
 * P8 — manifesto (provenance-first), methodology (real numbers: 84 sources
 * + human review gate), honest pricing, contact.
 */

const TIERS: {
  name: string;
  price: string;
  line: string;
  includes: string[];
  solid?: boolean;
}[] = [
  {
    name: "Founding",
    price: "€490 / year",
    line: "For individuals who work the record daily.",
    includes: [
      "Full feed, watchlists and alerts",
      "Analyst tools (NPL simulator, comps)",
      "API keys (60 req/min) + MCP access",
      "Founding badge, locked-in price",
    ],
    solid: true,
  },
  {
    name: "Vendor",
    price: "€1,900 / year",
    line: "For advisors, servicers and data-adjacent firms.",
    includes: [
      "Everything in Founding",
      "Claimed vendor profile + mandates",
      "Coverage-area placement",
      "Up to 5 seats",
    ],
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    line: "For institutions wiring the record into systems.",
    includes: [
      "Bulk API + export contracts",
      "MCP for internal agents",
      "Custom coverage requests",
      "SLAs and security review",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-12">
      {/* Manifesto */}
      <section>
        <div className="type-label">About Continuum Alternatives</div>
        <h1 className="type-display mt-3">The record is the product</h1>
        <div className="type-body mt-6 max-w-[640px] space-y-4 text-[15px] leading-[1.7]">
          <p>
            European alternative assets run on private information — and on a public record that
            nobody reads end to end: registers, gazettes, court filings, regulator notices,
            disclosures. We read it, structure it, and cite it.
          </p>
          <p>
            Provenance first: every fact in the record carries its source. Where we synthesize, the
            citations stand beside the synthesis. Where the record is thin, we say so — a short
            answer beats a padded one.
          </p>
          <p>
            The timeline is append-only. Corrections are new facts with their own provenance, never
            silent edits. Nothing publishes below its confidence threshold without a human
            approving it.
          </p>
        </div>
      </section>

      {/* Methodology */}
      <section id="methodology" className="mt-16 scroll-mt-16 border-t border-line pt-8">
        <h2 className="type-h1">Methodology</h2>
        <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {(
            [
              ["Entities", fmtInt(TOTAL_ENTITIES)],
              ["Countries", String(TOTAL_COUNTRIES)],
              ["Monitored sources", "84"],
              ["Strategies mapped", String(V2_STRATEGY_COUNT)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-surface px-4 py-4">
              <div className="type-label">{label}</div>
              <div className="type-data mt-1 text-[22px] leading-7">{value}</div>
            </div>
          ))}
        </div>
        <div className="type-body mt-6 max-w-[640px] space-y-4 text-ink-secondary">
          <p>
            <span className="text-ink">Sources.</span> 84 monitored sources — national business
            registers (16 register adapters), insolvency gazettes, regulator publications, GLEIF,
            curated press. Each source carries a reliability class that flows into fact confidence.
          </p>
          <p>
            <span className="text-ink">The review gate.</span> Extraction proposes; humans approve.
            Facts below the publication threshold queue for review and never render publicly until
            cleared. LLMs extract and synthesize — they never do arithmetic on amounts; every
            number is deterministic code over stated inputs.
          </p>
          <p>
            <span className="text-ink">Bitemporality.</span> Every fact records when it happened
            and when the record learned it. The feed sorts by recorded-at; tear sheets show both.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mt-16 scroll-mt-16 border-t border-line pt-8">
        <h2 className="type-h1">Pricing — honest</h2>
        <p className="type-small mt-2 max-w-[560px] text-ink-secondary">
          No seat-gouging, no surprise renewals. Public prices for individuals and vendors;
          enterprise is a conversation because contracts differ, not because the price is secret.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div key={tier.name} className={`border bg-surface p-4 ${tier.solid === true ? "border-ink" : "border-line"}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="type-h3">{tier.name}</h3>
                <span className="type-data">{tier.price}</span>
              </div>
              <p className="type-small mt-1 text-ink-secondary">{tier.line}</p>
              <ul className="mt-3 space-y-1.5">
                {tier.includes.map((inc) => (
                  <li key={inc} className="type-small text-ink-secondary">
                    · {inc}
                  </li>
                ))}
              </ul>
              <Link
                href="/v2/about#contact"
                className={`type-label mt-4 inline-block px-3 py-1.5 transition-colors ${
                  tier.solid === true
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                }`}
              >
                {tier.price === "Talk to us" ? "Contact" : "Subscribe"}
              </Link>
            </div>
          ))}
        </div>
        <p className="type-mono mt-3 text-ink-muted">
          PROTOTYPE NOTE: CHECKOUT RUNS THROUGH THE PRODUCTION MEMBERSHIP SYSTEM AT CUTOVER
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="mt-16 scroll-mt-16 border-t border-line pt-8">
        <h2 className="type-h1">Contact</h2>
        <p className="type-body mt-3 max-w-[560px] text-ink-secondary">
          We answer fastest on email. If you found an error in the record, say so plainly — the
          dispute runs through the review gate and the correction cites you if you want it to.
        </p>
        <div className="type-data mt-4 space-y-1">
          <div>hello@continuumalternatives.com</div>
          <div>corrections@continuumalternatives.com</div>
        </div>
      </section>
    </div>
  );
}
