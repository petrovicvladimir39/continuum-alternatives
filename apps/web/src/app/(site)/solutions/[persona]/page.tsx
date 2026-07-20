import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { diversifyRail } from "@continuum/shared";
import { administratorRanking, listAskFeed, listAuctions, type FeedItem } from "@continuum/db";
import { SubscribeBlock } from "@/components/subscribe-block";
import { countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * Solutions pages (Phase 25D). Persona copy is restrained and drawn ONLY
 * from live features — what a visitor can click today. No vaporware claims,
 * no "AI" labels. Screenshots are replaced by live data modules.
 */

type Persona = {
  slug: string;
  label: string;
  headline: string;
  paragraphs: string[];
  channels: string[];
  module: "deals" | "auctions" | "mandates" | "rounds" | "fund_closes";
  moduleTitle: string;
  factTypes: string[];
  reportHref: string;
  reportLabel: string;
};

const PERSONAS: Persona[] = [
  {
    slug: "investors",
    label: "For Investors",
    headline: "The record behind your next screen.",
    paragraphs: [
      "Track deals, rounds, and fund closes across six European market verticals — every fact cited to a register, filing, or named source, never estimated.",
      "Ask the record in plain words from the News front (\"distressed deals in Poland\"), keep the views you use as saved filters, and open any company, fund, or deal profile to see its full sourced timeline and relationships.",
    ],
    channels: ["pe", "vc_founders"],
    module: "deals",
    moduleTitle: "Latest deals & rounds",
    factTypes: ["acquisition", "funding_round", "fund_close"],
    reportHref: "/reports",
    reportLabel: "Browse data-compiled reports →",
  },
  {
    slug: "lenders-servicers",
    label: "For Lenders & Servicers",
    headline: "Court-sourced distressed flow, as it is filed.",
    paragraphs: [
      "Insolvency openings and bankruptcy asset sales land here from the registries themselves, with case references and verbatim excerpts — the auction tracker shows what closes and when.",
      "Follow the distressed and private-credit channels in the digest, and watch court and administrator league tables built from the same filings.",
    ],
    channels: ["distressed", "private_credit"],
    module: "auctions",
    moduleTitle: "Upcoming auctions",
    factTypes: ["asset_sale_announced"],
    reportHref: "/reports/serbian-insolvency-monitor-q3-2026",
    reportLabel: "Serbian Insolvency Monitor →",
  },
  {
    slug: "advisors",
    label: "For Advisors",
    headline: "Mandates and administrators, in one wire.",
    paragraphs: [
      "Advisor and servicing mandates surface as cited facts; administrator league tables show who is busiest in the courts, computed live from the filings record.",
      "The service-provider directory sits on the same register-verified corpus — 14,000+ entities with deterministic register identifiers.",
    ],
    channels: ["vendors"],
    module: "mandates",
    moduleTitle: "Latest mandates",
    factTypes: ["advisor_mandate", "servicing_mandate"],
    reportHref: "/reports",
    reportLabel: "Browse reports →",
  },
  {
    slug: "founders",
    label: "For Founders",
    headline: "Who funds, who closed, who is active.",
    paragraphs: [
      "Venture rounds and fund closes across Europe, with investor profiles built from registers and cited sources — see who is actually deploying before you write the first email.",
      "The venture front keeps a live rail of activity; the vc channel of the digest delivers it weekly.",
    ],
    channels: ["vc_founders"],
    module: "rounds",
    moduleTitle: "Latest rounds",
    factTypes: ["funding_round"],
    reportHref: "/markets/venture-capital",
    reportLabel: "The venture front →",
  },
  {
    slug: "institutions",
    label: "For Institutions",
    headline: "Fund closes and the managers behind them.",
    paragraphs: [
      "Fund closes, manager relationships, and register-verified fund vehicles (GLEIF, CSSF, AMF and more) in one browsable record — each with its deterministic register identifier.",
      "The LP front tracks closes and institutions; the institutional digest channel summarizes the week.",
    ],
    channels: ["lp_institutional"],
    module: "fund_closes",
    moduleTitle: "Latest fund closes",
    factTypes: ["fund_close"],
    reportHref: "/markets/lps-institutions",
    reportLabel: "LPs & Institutions front →",
  },
];

export function generateStaticParams(): { persona: string }[] {
  return PERSONAS.map((p) => ({ persona: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>;
}): Promise<Metadata> {
  const { persona: slug } = await params;
  const persona = PERSONAS.find((p) => p.slug === slug);
  return persona === undefined
    ? { title: "Solutions" }
    : { title: persona.label, description: `${persona.headline} ${persona.paragraphs[0]}` };
}

function WireRow({ item }: { item: FeedItem }) {
  return (
    <div className="border-t border-line py-2.5">
      <span className="type-data text-ink-muted">{item.occurredOn}</span>{" "}
      {item.entityHref !== null ? (
        <Link href={item.entityHref} className="text-[13px] font-medium hover:text-accent">
          {item.title}
        </Link>
      ) : (
        <span className="text-[13px] font-medium">{item.title}</span>
      )}
      <p className="type-small mt-0.5 text-ink-muted">
        {item.entityName}
        {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
      </p>
    </div>
  );
}

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona: slug } = await params;
  const persona = PERSONAS.find((p) => p.slug === slug);
  if (persona === undefined) {
    notFound();
  }

  const [feed, auctions, advisors] = await Promise.all([
    persona.module === "auctions"
      ? Promise.resolve(null)
      : listAskFeed({ factTypes: persona.factTypes, limit: 12 }),
    persona.module === "auctions" ? listAuctions("upcoming") : Promise.resolve(null),
    persona.module === "mandates" ? administratorRanking(6) : Promise.resolve([]),
  ]);
  const rail = feed === null ? [] : diversifyRail(feed.items, 6, (item) => item.entityCountry);
  const nextAuctions = auctions === null ? [] : auctions.rows.slice(0, 6);

  return (
    <div className="max-w-2xl py-12">
      <p className="type-label">{persona.label}</p>
      <h1 className="mt-2 font-serif text-[32px] font-medium leading-[1.15] text-ink">
        {persona.headline}
      </h1>
      {persona.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="mt-4 text-[14px] leading-[1.65] text-ink-secondary">
          {paragraph}
        </p>
      ))}

      {rail.length > 0 ? (
        <section className="mt-8 border border-line p-4">
          <h2 className="type-label">{persona.moduleTitle} — live</h2>
          <div className="mt-1">
            {rail.map((item) => (
              <WireRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {nextAuctions.length > 0 ? (
        <section className="mt-8 border border-line p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="type-label">{persona.moduleTitle} — live</h2>
            <Link href="/auctions" className="type-small text-accent hover:underline">
              Auction tracker →
            </Link>
          </div>
          <div className="mt-1">
            {nextAuctions.map((row) => (
              <div key={row.factId} className="border-t border-line py-2">
                <span className="type-data text-ink-muted">{row.saleDate}</span>{" "}
                {row.debtorHref !== null ? (
                  <Link href={row.debtorHref} className="text-[13px] font-medium hover:text-accent">
                    {row.debtorName}
                  </Link>
                ) : (
                  <span className="text-[13px] font-medium">{row.debtorName}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {advisors.length > 0 ? (
        <section className="mt-8 border border-line p-4">
          <h2 className="type-label">Busiest administrators — live</h2>
          <table className="mt-2 w-full text-[13px]">
            <tbody>
              {advisors.map((row, index) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="type-data w-[30px] py-1.5">{index + 1}</td>
                  <td>{row.label}</td>
                  <td className="type-data text-right">{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Phase 33B: vendor tier — the honest pitch, advisors persona only. */}
      {persona.slug === "advisors" ? (
        <section className="mt-8 border border-line p-4">
          <h2 className="type-label">Vendor profiles</h2>
          {process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_VENDOR ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-secondary">
              Claim your firm&apos;s profile, then activate a vendor subscription to publish
              track-record stories on it — each one operator-reviewed, and a referenced client is
              named only with that client&apos;s explicit consent (otherwise it publishes
              anonymized). Pricing is shown at checkout from your claimed profile;{" "}
              <Link href="/pricing" className="text-accent hover:underline">
                membership pricing
              </Link>{" "}
              is separate.
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-secondary">Vendor profiles open soon.</p>
          )}
        </section>
      ) : null}

      {/* Phase 33D: claimable because it is true — see /docs/mcp. */}
      <p className="mt-8 border-t border-line pt-3 text-[13px] text-ink-secondary">
        Your AI can query Continuum — the record is available to agents over MCP and a documented
        REST API.{" "}
        <Link href="/docs/mcp" className="text-accent hover:underline">
          Connect your assistant →
        </Link>
      </p>

      <div className="mt-10">
        <SubscribeBlock defaultChannels={persona.channels} />
      </div>
      <p className="mt-4 text-[13px]">
        <Link href={persona.reportHref} className="text-accent hover:underline">
          {persona.reportLabel}
        </Link>
      </p>
    </div>
  );
}
