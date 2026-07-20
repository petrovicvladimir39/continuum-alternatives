import type { Metadata } from "next";
import Link from "next/link";
import {
  ALT_TAXONOMY,
  CLASS_LEVEL,
  frontHrefFor,
  meetsCoverageThreshold,
} from "@continuum/shared";
import { strategyCoverage } from "@continuum/db";
import { Tag } from "@/components/ui/tag";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coverage",
  description:
    "The full alternatives universe Continuum classifies — every asset class and strategy, with live entity and signal counts. Fronts open as coverage crosses thresholds.",
};

/**
 * The Coverage Map (Phase 26C) — ambition + honesty as a single artifact.
 * Every strategy of the taxonomy is a row; live counts decide whether it is
 * Active (front linked) or Building (muted). Nothing is faked upward.
 */
export default async function CoveragePage() {
  const coverage = await strategyCoverage();
  const byKey = new Map(coverage.map((row) => [`${row.assetClass}:${row.strategy}`, row]));
  const lookup = (assetClass: string, strategy: string) =>
    byKey.get(`${assetClass}:${strategy}`) ?? { entities: 0, signals: 0 };

  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">Coverage</h1>
      <p className="mt-2 text-[14px] leading-[1.6] text-ink-secondary">
        The full universe we classify. Fronts open as coverage crosses thresholds.
      </p>

      {ALT_TAXONOMY.map((assetClass) => {
        const classLevel = lookup(assetClass.slug, CLASS_LEVEL);
        return (
          <section key={assetClass.slug} className="mt-9">
            <h2 className="type-h2">{assetClass.label}</h2>
            <table className="mt-3 w-full text-[13px]">
              <thead>
                <tr className="type-label text-left">
                  <th className="pb-1.5 font-medium">Strategy</th>
                  <th className="pb-1.5 text-right font-medium">Entities</th>
                  <th className="pb-1.5 text-right font-medium">90d signals</th>
                  <th className="pb-1.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {classLevel.entities > 0 || classLevel.signals > 0 ? (
                  <tr className="border-t border-line">
                    <td className="py-1.5 text-ink-secondary">{assetClass.label} (class-level)</td>
                    <td className="type-data text-right">{classLevel.entities}</td>
                    <td className="type-data text-right">{classLevel.signals}</td>
                    <td className="text-right">
                      {meetsCoverageThreshold(classLevel) ? (
                        <Link href={frontHrefFor(assetClass.slug, CLASS_LEVEL)}>
                          <Tag variant="equity">Active</Tag>
                        </Link>
                      ) : (
                        <span className="type-small text-ink-muted">Building</span>
                      )}
                    </td>
                  </tr>
                ) : null}
                {assetClass.strategies.map((strategy) => {
                  const row = lookup(assetClass.slug, strategy.slug);
                  const active = meetsCoverageThreshold(row);
                  return (
                    <tr key={strategy.slug} className="border-t border-line">
                      <td className="py-1.5">{strategy.label}</td>
                      <td className="type-data text-right">{row.entities}</td>
                      <td className="type-data text-right">{row.signals}</td>
                      <td className="text-right">
                        {active ? (
                          <Link href={frontHrefFor(assetClass.slug, strategy.slug)}>
                            <Tag variant="equity">Active</Tag>
                          </Link>
                        ) : (
                          <span className="type-small text-ink-muted">Building</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
