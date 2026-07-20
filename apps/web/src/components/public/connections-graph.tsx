import type { CapitalType, PublicConnection } from "@continuum/db";
import { EDGE_TYPE_GROUPS } from "@continuum/db";

/**
 * Inline-SVG connections graph — no chart library. The entity sits at the
 * center; up to 12 top counterparties (by edge count) are placed radially
 * with a DETERMINISTIC layout (angle by index). Edges are colored by their
 * edge-type capital group; hover labels via <title> (acceptable here).
 */

const GROUP_COLORS: Record<CapitalType, string> = {
  equity: "#1D7A5F",
  credit: "#96690F",
  distressed: "#A4442A",
  neutral: "#8A867C",
};

const INK = "#141311";
const INK_SECONDARY = "#5C5952";
const ACCENT = "#17456B";

type Counterparty = {
  name: string;
  href: string | null;
  count: number;
  phrases: string[];
  group: CapitalType;
};

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function ConnectionsGraph({
  entityName,
  connections,
}: {
  entityName: string;
  connections: PublicConnection[];
}) {
  const byName = new Map<string, Counterparty>();
  for (const connection of connections) {
    const existing = byName.get(connection.counterpartName);
    if (existing === undefined) {
      byName.set(connection.counterpartName, {
        name: connection.counterpartName,
        href: connection.counterpartHref,
        count: 1,
        phrases: [connection.phrase],
        group: EDGE_TYPE_GROUPS[connection.edgeType],
      });
    } else {
      existing.count += 1;
      existing.phrases.push(connection.phrase);
    }
  }
  const nodes = [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 12);
  if (nodes.length === 0) {
    return null;
  }

  const cx = 320;
  const cy = 175;
  const rx = 235;
  const ry = 115;

  return (
    <svg
      viewBox="0 0 640 350"
      role="img"
      aria-label={`Connections of ${entityName}`}
      className="w-full max-w-[640px]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {nodes.map((node, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / nodes.length;
        const x = cx + rx * Math.cos(angle);
        const y = cy + ry * Math.sin(angle);
        const labelRight = Math.cos(angle) >= 0;
        const label = (
          <text
            x={labelRight ? x + 8 : x - 8}
            y={y + 3.5}
            textAnchor={labelRight ? "start" : "end"}
            fontSize={11}
            fill={node.href !== null ? ACCENT : INK_SECONDARY}
          >
            {truncate(node.name, 26)}
          </text>
        );
        const content = (
          <g key={node.name}>
            <title>{`${node.phrases.join("; ")} — ${node.name}`}</title>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={GROUP_COLORS[node.group]}
              strokeWidth={node.count > 1 ? 2 : 1}
              strokeOpacity={0.65}
            />
            <circle cx={x} cy={y} r={4.5} fill={GROUP_COLORS[node.group]} stroke="#FFFFFF" strokeWidth={1} />
            {label}
          </g>
        );
        return node.href !== null ? (
          <a key={node.name} href={node.href}>
            {content}
          </a>
        ) : (
          content
        );
      })}
      <circle cx={cx} cy={cy} r={7} fill={INK} stroke="#FFFFFF" strokeWidth={1.5} />
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={12} fontWeight={500} fill={INK}>
        {truncate(entityName, 32)}
      </text>
    </svg>
  );
}
