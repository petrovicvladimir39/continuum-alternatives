"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Facts-per-quarter mini bar chart (recharts) in platform tokens. Rendered
 * only when the entity has ≥4 facts (parent decides). Counts only — no
 * monetary math ever happens client-side.
 */

export type QuarterCount = { quarter: string; count: number };

export function ActivityChart({ data }: { data: QuarterCount[] }) {
  return (
    <div className="h-[180px] w-full max-w-xl">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="0" />
          <XAxis
            dataKey="quarter"
            tickLine={false}
            axisLine={{ stroke: "var(--color-line-strong)" }}
            tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-sans)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-ink-muted)", fontFamily: "var(--font-sans)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-ground)" }}
            contentStyle={{
              border: "1px solid var(--color-line-strong)",
              borderRadius: 4,
              boxShadow: "none",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              background: "var(--color-surface)",
            }}
            formatter={(value) => [String(value), "facts"]}
          />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[2, 2, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
