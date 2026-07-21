"use client";

import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ViewportPortal,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  buildMockEdges,
  MOCK_ENTITIES,
  MOCK_ENTITY_BY_ID,
  type MockEntity,
} from "@continuum/shared";
import { v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * YourUniverseWidget — egocentric graph around a focal entity. Nodes are
 * React Flow (pan/zoom, hover); the connecting lines render as a
 * deterministic SVG inside <ViewportPortal> at flow coordinates — the
 * radial layout is computed here, so edges never wait on DOM measurement
 * (React Flow's edge layer requires measured handle bounds, which
 * throttled tabs may never deliver). Colors use the class accent vars.
 */

const NODE_W = 150;
const NODE_H = 28;
const RX = 240;
const RY = 150;

type EgoNodeData = { name: string; classSlug: string; focal: boolean };

function EgoNode({ data }: NodeProps) {
  const d = data as unknown as EgoNodeData;
  const cls = v2ClassFor(d.classSlug);
  return (
    <div
      className={`border bg-surface px-2 py-1 ${d.focal ? "border-ink" : "border-line"}`}
      style={{ borderLeft: `4px solid ${cls?.accent.cssVar ?? "var(--color-line)"}`, width: NODE_W, height: NODE_H }}
    >
      <span className={`block truncate text-[11px] leading-4 ${d.focal ? "font-medium" : ""}`}>
        {d.name}
      </span>
    </div>
  );
}

const nodeTypes = { ego: EgoNode };

type EgoLine = {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
};

export function buildEgoGraph(
  focalId: string,
  limit = 10,
): { nodes: Node[]; lines: EgoLine[] } {
  const focal = MOCK_ENTITY_BY_ID.get(focalId);
  if (focal === undefined) {
    return { nodes: [], lines: [] };
  }
  const related = buildMockEdges()
    .filter((e) => e.sourceId === focalId || e.targetId === focalId)
    .slice(0, limit);
  const nodes: Node[] = [
    {
      id: focal.id,
      type: "ego",
      position: { x: -NODE_W / 2, y: -NODE_H / 2 },
      data: { name: focal.name, classSlug: focal.assetClass, focal: true },
      draggable: false,
      width: NODE_W,
      height: NODE_H,
    },
  ];
  const lines: EgoLine[] = [];
  const seen = new Set<string>([focal.id]);
  let placed = 0;
  for (const edge of related) {
    const otherId = edge.sourceId === focalId ? edge.targetId : edge.sourceId;
    const other = MOCK_ENTITY_BY_ID.get(otherId);
    if (other === undefined || seen.has(other.id)) {
      continue;
    }
    seen.add(other.id);
    const angle = -Math.PI / 2 + (placed / Math.max(1, Math.min(related.length, limit))) * Math.PI * 2;
    const cx = Math.cos(angle) * RX;
    const cy = Math.sin(angle) * RY;
    nodes.push({
      id: other.id,
      type: "ego",
      position: { x: cx - NODE_W / 2, y: cy - NODE_H / 2 },
      data: { name: other.name, classSlug: other.assetClass, focal: false },
      draggable: false,
      width: NODE_W,
      height: NODE_H,
    });
    const cls = v2ClassFor(other.assetClass);
    lines.push({
      id: edge.id,
      x: cx,
      y: cy,
      color: cls?.accent.cssVar ?? "var(--color-line-strong)",
      label: edge.edgeType.replace(/_/g, " "),
    });
    placed++;
  }
  return { nodes, lines };
}

function EgoLines({ lines }: { lines: EgoLine[] }) {
  // Big centered canvas at flow coordinates; lines run center → neighbor.
  const EXTENT = 1200;
  return (
    <ViewportPortal>
      <svg
        width={EXTENT}
        height={EXTENT}
        viewBox={`${-EXTENT / 2} ${-EXTENT / 2} ${EXTENT} ${EXTENT}`}
        style={{
          position: "absolute",
          left: -EXTENT / 2,
          top: -EXTENT / 2,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        {lines.map((l) => (
          <g key={l.id}>
            <line x1={0} y1={0} x2={l.x} y2={l.y} stroke={l.color} strokeWidth={1} strokeOpacity={0.75} />
            <text
              x={l.x / 2}
              y={l.y / 2 - 4}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
            >
              {l.label}
            </text>
          </g>
        ))}
      </svg>
    </ViewportPortal>
  );
}

export function UniverseWidget({
  focalId,
  heightClass = "h-[260px]",
  interactive = false,
}: {
  focalId: string;
  heightClass?: string;
  interactive?: boolean;
}) {
  const { nodes, lines } = useMemo(
    () => buildEgoGraph(focalId, interactive ? 14 : 8),
    [focalId, interactive],
  );
  return (
    <div className={`w-full ${heightClass}`}>
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={interactive}
        panOnDrag={interactive}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <EgoLines lines={lines} />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--color-line)" />
      </ReactFlow>
    </div>
  );
}

/** Full-screen egocentric map with focal entity selector. */
export function UniverseMapFull() {
  const gps = useMemo(() => MOCK_ENTITIES.filter((e: MockEntity) => e.role === "gp"), []);
  const [focalId, setFocalId] = useState(gps[0]!.id);
  return (
    <div className="flex h-[calc(100vh-40px)] flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2">
        <span className="type-label">Egocentric view</span>
        <select
          value={focalId}
          onChange={(e) => setFocalId(e.target.value)}
          className="type-small border border-line bg-surface px-2 py-1"
        >
          {gps.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span className="type-mono ml-auto text-ink-muted">EDGES COLORED BY COUNTERPARTY CLASS</span>
      </div>
      <div className="min-h-0 flex-1">
        <UniverseWidget focalId={focalId} heightClass="h-full" interactive />
      </div>
    </div>
  );
}
