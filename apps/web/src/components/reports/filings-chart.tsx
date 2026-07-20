import type { MonthlyCount } from "@continuum/db";

/**
 * Hand-rolled SVG bar chart — no chart library, styleguide colors only.
 * Monthly insolvency filings, trailing 12 months; tabular value labels.
 */
export function FilingsChart({ data }: { data: MonthlyCount[] }) {
  const width = 680;
  const height = 240;
  const padLeft = 12;
  const padBottom = 34;
  const padTop = 24;
  const max = Math.max(1, ...data.map((point) => point.n));
  const innerWidth = width - padLeft * 2;
  const step = innerWidth / Math.max(1, data.length);
  const barWidth = Math.min(40, step * 0.62);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Monthly insolvency filings, trailing 12 months"
      className="w-full max-w-[680px]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <line
        x1={padLeft}
        y1={height - padBottom + 0.5}
        x2={width - padLeft}
        y2={height - padBottom + 0.5}
        stroke="#D2CEC3"
        strokeWidth="1"
      />
      {data.map((point, index) => {
        const barHeight = Math.round(((height - padBottom - padTop) * point.n) / max);
        const x = padLeft + index * step + (step - barWidth) / 2;
        const y = height - padBottom - barHeight;
        return (
          <g key={point.month}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill="#17456B" />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="11"
              fill="#5C5952"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {point.n}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - padBottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#8A867C"
            >
              {point.month.slice(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
