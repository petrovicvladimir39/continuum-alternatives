import type { Metadata } from "next";
import { auctionStats, homeStats } from "@continuum/db";
import { StatBlock } from "@/components/ui/stat-block";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Continuum Alternatives is: the verified, source-cited record of private capital in emerging Europe — built from registries, gazettes, and regional press.",
};

export default async function AboutPage() {
  const [stats, auctions] = await Promise.all([homeStats(), auctionStats()]);

  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">About Continuum</h1>

      <p className="mt-5 text-[15px] leading-[1.6] text-ink">
        Continuum Alternatives is the record of private capital in emerging Europe — private
        equity, venture capital, private credit, and distressed situations across Central,
        Eastern, and South-Eastern Europe.
      </p>

      <h2 className="type-h2 mt-9">Method</h2>
      <p className="mt-2.5 text-[14px] leading-[1.6] text-ink-secondary">
        The platform is built from primary sources: court and insolvency registries, official
        gazettes, and regional business press. Facts are extracted, mechanically guarded against
        fabrication, and reviewed before anything publishes. Every published fact carries its
        source citation; monetary figures are transcribed as printed, never computed or estimated.
        Curated organizations are verified against their own websites or official registers
        before they appear.
      </p>

      <h2 className="type-h2 mt-9">Coverage</h2>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
        <StatBlock value={String(stats.activeEntities)} label="Active entities" />
        <StatBlock value={String(stats.countries)} label="Countries" />
        <StatBlock value={String(stats.factsTracked)} label="Facts tracked" />
        <StatBlock value={String(auctions.totalTracked)} label="Auctions tracked" />
        <StatBlock value={String(stats.sourcesMonitored)} label="Sources monitored" />
      </div>

      <h2 className="type-h2 mt-9">Contact</h2>
      <p className="mt-2.5 text-[14px] text-ink-secondary">
        <a href="mailto:hello@continuumalternatives.com" className="text-accent hover:underline">
          hello@continuumalternatives.com
        </a>
      </p>
    </div>
  );
}
