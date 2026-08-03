"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useReducedMotion } from "framer-motion";
import { monogramFor } from "@continuum/shared";
import "@xyflow/react/dist/style.css";

/**
 * The network graph (flagship redesign centerpiece). Replaces the inline
 * SVG connections graph. Server groups approved connections into
 * counterparties; this island lays them out radially around the entity,
 * colors edges by capital group with the PLATFORM tokens (never React
 * Flow's default blue), and navigates on node click. Pan + pinch-zoom on;
 * scroll-zoom off (page scroll is not hijacked); nodes are not draggable —
 * the record is not a toy.
 */

export type FlowCounterparty = {
  name: string;
  href: string | null;
  count: number;
  phrases: string[];
  group: "equity" | "credit" | "distressed" | "neutral";
};

const GROUP_VAR: Record<FlowCounterparty["group"], string> = {
  equity: "var(--color-equity)",
  credit: "var(--color-credit)",
  distressed: "var(--color-distressed)",
  neutral: "var(--color-ink-muted)",
};

// (Edge-group legend lives in entity-profile.tsx — value exports from client
// modules turn into client references inside server components.)

type CenterData = { name: string; logoUrl: string | null };
type CounterpartData = FlowCounterparty & { labelSide: "left" | "right" };

function CenterNode({ data }: NodeProps) {
  const d = data as unknown as CenterData;
  return (
    <div className="flex w-[150px] flex-col items-center">
      <Handle type="source" position={Position.Top} className="!invisible" />
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-line-strong bg-surface">
        {d.logoUrl !== null ? (
          // Plain <img>: external logo URL, no next/image optimization wanted.
          <img src={d.logoUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="font-serif text-[22px] font-medium text-ink">
            {monogramFor(d.name)}
          </span>
        )}
      </span>
      <span className="mt-1.5 max-w-[150px] truncate text-center font-serif text-[13px] font-medium text-ink">
        {d.name}
      </span>
    </div>
  );
}

function CounterpartNode({ data }: NodeProps) {
  const d = data as unknown as CounterpartData;
  const color = GROUP_VAR[d.group];
  const clickable = d.href !== null;
  return (
    <div
      className={`flex items-center gap-2 ${d.labelSide === "left" ? "flex-row-reverse" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
      title={d.phrases.join("; ")}
    >
      <Handle type="target" position={Position.Top} className="!invisible" />
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-surface transition-colors"
        style={{ borderColor: color }}
      >
        <span className="font-serif text-[14px] font-medium text-ink">{monogramFor(d.name)}</span>
      </span>
      <span className="flex max-w-[150px] flex-col">
        <span
          className={`truncate text-[12px] leading-tight font-medium ${clickable ? "text-accent" : "text-ink-secondary"}`}
        >
          {d.name}
        </span>
        <span className="text-[10px] leading-tight text-ink-muted">
          {d.phrases[0]}
          {d.count > 1 ? ` · ${d.count}` : ""}
        </span>
      </span>
    </div>
  );
}

const NODE_TYPES = { center: CenterNode, counterpart: CounterpartNode };

function FlowInner({
  entityName,
  logoUrl,
  counterparties,
}: {
  entityName: string;
  logoUrl: string | null;
  counterparties: FlowCounterparty[];
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const top = counterparties.slice(0, 16);
    const rx = 320;
    const ry = 170;
    // Explicit width/height: React Flow then has measured dimensions at
    // first paint — edges and fitView never wait on ResizeObserver.
    const nodes: Node[] = [
      {
        id: "center",
        type: "center",
        position: { x: -75, y: -46 },
        width: 150,
        height: 92,
        data: { name: entityName, logoUrl },
        draggable: false,
        selectable: false,
      },
      ...top.map((cp, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / top.length;
        const x = rx * Math.cos(angle);
        const y = ry * Math.sin(angle);
        const labelSide = Math.cos(angle) >= 0 ? "right" : "left";
        return {
          id: `cp-${index}`,
          type: "counterpart",
          position: { x: labelSide === "right" ? x - 18 : x - 174, y: y - 18 },
          width: 192,
          height: 38,
          data: { ...cp, labelSide },
          draggable: false,
        } satisfies Node;
      }),
    ];
    const edges: Edge[] = top.map((cp, index) => ({
      id: `e-${index}`,
      type: "straight",
      source: "center",
      target: `cp-${index}`,
      animated: !reduce,
      style: {
        stroke: GROUP_VAR[cp.group],
        strokeWidth: Math.min(1 + cp.count * 0.75, 3),
        strokeOpacity: 0.7,
      },
    }));
    return { nodes, edges };
  }, [counterparties, entityName, logoUrl, reduce]);

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      const href = (node.data as { href?: string | null }).href;
      if (typeof href === "string" && href !== "") {
        router.push(href);
      }
    },
    [router],
  );

  return (
    <div className="h-[420px] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.4}
        maxZoom={1.8}
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--color-line)" />
        <Panel position="bottom-right" className="flex gap-1">
          {(
            [
              ["+", () => zoomIn({ duration: reduce ? 0 : 150 })],
              ["−", () => zoomOut({ duration: reduce ? 0 : 150 })],
              ["⌖", () => fitView({ padding: 0.18, duration: reduce ? 0 : 200 })],
            ] as const
          ).map(([glyph, fn]) => (
            <button
              key={glyph}
              type="button"
              onClick={fn}
              aria-label={glyph === "+" ? "Zoom in" : glyph === "−" ? "Zoom out" : "Fit view"}
              className="h-7 w-7 rounded-sm border border-line bg-surface text-[13px] leading-none text-ink-secondary hover:border-line-strong hover:text-ink"
            >
              {glyph}
            </button>
          ))}
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function ConnectionsFlow(props: {
  entityName: string;
  logoUrl: string | null;
  counterparties: FlowCounterparty[];
}) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
