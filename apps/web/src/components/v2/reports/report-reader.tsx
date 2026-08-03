"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MockReport, MockReportChart } from "@continuum/shared";
import { v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * P7 — interactive web reader: reading-progress rail, recharts with
 * hover/tooltip, and an AtomicShareCard on every chart — the Share control
 * builds a branded OG image (next/og route) with a deep-link anchor.
 */

function ProgressRail() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max <= 0 ? 0 : Math.min(1, el.scrollTop / max));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed left-0 top-10 z-40 h-[2px] w-full bg-transparent">
      <div className="h-[2px] bg-ink transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

export function AtomicShareCard({
  slug,
  anchor,
  title,
  stat,
  classSlug,
  children,
}: {
  slug: string;
  anchor: string;
  title: string;
  stat: string;
  classSlug: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const ogUrl = `/v2/reports/og?title=${encodeURIComponent(title)}&stat=${encodeURIComponent(stat)}&cls=${encodeURIComponent(classSlug)}`;
  const deepLink = `/v2/reports/${slug}#${anchor}`;

  const share = async () => {
    const absolute = `${window.location.origin}${deepLink}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy deep link:", absolute);
    }
  };

  return (
    <figure id={anchor} className="group scroll-mt-16 border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2">
        <figcaption className="type-label">{title}</figcaption>
        <div className="flex items-center gap-3 opacity-40 transition-opacity group-hover:opacity-100">
          <a
            href={ogUrl}
            target="_blank"
            rel="noreferrer"
            className="type-mono text-ink-muted transition-colors hover:text-ink"
            title="Open the branded share image"
          >
            CARD
          </a>
          <button
            type="button"
            onClick={share}
            className="type-mono flex cursor-pointer items-center gap-1 text-ink-muted transition-colors hover:text-ink"
            title="Copy deep link"
          >
            <Share2 size={12} strokeWidth={1.5} />
            {copied ? "COPIED" : "SHARE"}
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </figure>
  );
}

function ReportChart({ chart, color }: { chart: MockReportChart; color: string }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
            axisLine={{ stroke: "var(--color-line-strong)" }}
            tickLine={false}
          />
          <YAxis
            width={44}
            tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-line-strong)",
              borderRadius: 0,
              fontSize: 12,
            }}
            formatter={(value) => [`${String(value)} ${chart.unit}`, ""]}
            separator=""
          />
          <Bar dataKey="value" fill={color} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportReader({ report }: { report: MockReport }) {
  const cls = report.assetClass === "cross-asset" ? null : v2ClassFor(report.assetClass);
  const color = cls?.accent.cssVar ?? "var(--color-accent)";
  const topStat = useMemo(() => {
    const first = report.charts[0];
    if (first === undefined || first.series.length === 0) {
      return "";
    }
    const last = first.series[first.series.length - 1]!;
    return `${last.label}: ${last.value} ${first.unit}`;
  }, [report]);

  return (
    <div>
      <ProgressRail />
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-10 px-4 py-8 lg:grid-cols-[minmax(0,66fr)_34fr]">
        <div>
          {report.sections.map((section, i) => (
            <section key={i} className="mb-8">
              <h2 className="type-h2">{section.heading}</h2>
              <p className="type-body mt-3 max-w-[620px] leading-[1.65]">{section.body}</p>
            </section>
          ))}
          <div className="space-y-6">
            {report.charts.map((chart, i) => (
              <AtomicShareCard
                key={i}
                slug={report.slug}
                anchor={`chart-${i + 1}`}
                title={chart.title}
                stat={topStat}
                classSlug={report.assetClass}
              >
                <ReportChart chart={chart} color={color} />
              </AtomicShareCard>
            ))}
          </div>
        </div>

        <aside>
          <div className="sticky top-16 space-y-4">
            <div className="border border-line bg-surface p-4">
              <div className="type-label">In this report</div>
              <ol className="mt-2 space-y-1.5">
                {report.sections.map((s, i) => (
                  <li key={i} className="type-small text-ink-secondary">
                    {String(i + 1).padStart(2, "0")} · {s.heading}
                  </li>
                ))}
                {report.charts.map((c, i) => (
                  <li key={`c${i}`}>
                    <a href={`#chart-${i + 1}`} className="type-small text-ink-secondary underline decoration-dotted hover:text-ink">
                      Fig {i + 1} · {c.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
            <div className="type-mono border border-line px-4 py-2.5 text-ink-muted">
              EVERY FIGURE SHARES AS A BRANDED CARD WITH A DEEP-LINK ANCHOR
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
