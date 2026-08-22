'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const VOLT = '#C6FF2E';
const SURFACE = '#0A0A0A';
const NODE_BG = '#131316';
const NODE_BG_RAISED = '#1B1B20';
const NODE_BORDER = '#2A2A30';
const INK_HI = '#F4F4F5';
const EDGE_INK = '#3F3F46';
const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";

const GAP_X = 40;
const GAP_Y = 76;
const ROW_TOLERANCE = 50;

function hexIn(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b/.exec(value);
  return m ? m[0] : null;
}

function relLuminance(hex: string): number {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type FlowNodeData = {
  label: string;
  accent: string;
  variant: 'outline' | 'fill' | 'raised';
  origX: number;
  origY: number;
};

const handleStyle: React.CSSProperties = {
  width: 5,
  height: 5,
  minWidth: 5,
  minHeight: 5,
  background: EDGE_INK,
  border: `1px solid ${SURFACE}`,
};

function InstitutionalNode({ data }: NodeProps) {
  const { label, accent, variant } = data as FlowNodeData;
  const background =
    variant === 'fill' ? `${accent}1F` : variant === 'raised' ? NODE_BG_RAISED : NODE_BG;
  const border =
    variant === 'fill' ? `1px solid ${accent}80` : `1px solid ${NODE_BORDER}`;

  return (
    <div
      style={{
        position: 'relative',
        background,
        border,
        borderRadius: 8,
        padding: '11px 16px 11px 19px',
        maxWidth: 230,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} isConnectable={false} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 7,
          bottom: 7,
          width: 3,
          borderRadius: '0 2px 2px 0',
          background: accent,
        }}
      />
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.45,
          letterSpacing: '0.01em',
          color: INK_HI,
          textAlign: 'center',
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} isConnectable={false} />
    </div>
  );
}

const nodeTypes = { institutional: InstitutionalNode };

type SizeMap = Map<string, { width: number; height: number }>;
type Bounds = { minX: number; minY: number; width: number; height: number };

// Re-lay out measured nodes into centered rows: row membership and in-row order
// come from the authored y/x coordinates, spacing from real rendered sizes.
function layoutRows(nodes: Node[], sizes: SizeMap): Node[] {
  const sizeOf = (n: Node) => sizes.get(n.id) ?? { width: 200, height: 48 };
  const rows: Node[][] = [];
  const sorted = [...nodes].sort(
    (a, b) => (a.data as FlowNodeData).origY - (b.data as FlowNodeData).origY
  );
  for (const node of sorted) {
    const y = (node.data as FlowNodeData).origY;
    const row = rows.find(
      (r) => Math.abs((r[0].data as FlowNodeData).origY - y) <= ROW_TOLERANCE
    );
    if (row) row.push(node);
    else rows.push([node]);
  }

  const laidOut: Node[] = [];
  let cursorY = 0;
  for (const row of rows) {
    row.sort((a, b) => (a.data as FlowNodeData).origX - (b.data as FlowNodeData).origX);
    const widths = row.map((n) => sizeOf(n).width);
    const rowHeight = Math.max(...row.map((n) => sizeOf(n).height));
    const rowWidth = widths.reduce((s, w) => s + w, 0) + GAP_X * (row.length - 1);
    let cursorX = -rowWidth / 2;
    row.forEach((node, i) => {
      laidOut.push({
        ...node,
        position: { x: cursorX, y: cursorY + (rowHeight - sizeOf(node).height) / 2 },
      });
      cursorX += widths[i] + GAP_X;
    });
    cursorY += rowHeight + GAP_Y;
  }
  return laidOut;
}

function boundsOf(nodes: Node[], sizes: SizeMap): Bounds {
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const x2s = nodes.map((n) => n.position.x + (sizes.get(n.id)?.width ?? 200));
  const y2s = nodes.map((n) => n.position.y + (sizes.get(n.id)?.height ?? 48));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...x2s) - minX, height: Math.max(...y2s) - minY };
}

const VIEW_PADDING = 26;

function FlowCanvas({ initialNodes, edges }: { initialNodes: Node[]; edges: Edge[] }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [ready, setReady] = useState(false);
  const { setViewport, getNodes } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<Bounds | null>(null);
  const layoutWidthRef = useRef(0);

  // Center + scale the diagram ourselves instead of fitView, so the transform
  // does not depend on React Flow's ResizeObserver-fed dimension store (which
  // stays empty in hidden/background tabs).
  const applyViewport = React.useCallback(() => {
    const host = wrapperRef.current;
    const bounds = boundsRef.current;
    if (!host || !bounds || host.offsetWidth === 0) return;
    const availW = host.offsetWidth - VIEW_PADDING * 2;
    const availH = host.offsetHeight - VIEW_PADDING * 2;
    const zoom = Math.min(availW / bounds.width, availH / bounds.height, 1.25);
    setViewport({
      x: (host.offsetWidth - bounds.width * zoom) / 2 - bounds.minX * zoom,
      y: (host.offsetHeight - bounds.height * zoom) / 2 - bounds.minY * zoom,
      zoom,
    });
  }, [setViewport]);

  // Wait until every node has a rendered size, then re-lay out with real sizes.
  // Polls with setTimeout (not rAF) so layout also completes in hidden tabs,
  // measuring via offsetWidth/offsetHeight, which ignore the viewport transform.
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    let tries = 0;
    const attempt = () => {
      if (cancelled) return;
      const sizes: SizeMap = new Map();
      const host = wrapperRef.current;
      if (host) {
        host.querySelectorAll<HTMLElement>('.react-flow__node').forEach((el) => {
          const id = el.getAttribute('data-id');
          if (id && el.offsetWidth > 0 && el.offsetHeight > 0) {
            sizes.set(id, { width: el.offsetWidth, height: el.offsetHeight });
          }
        });
      }
      if (sizes.size > 0 && sizes.size === getNodes().length) {
        const laidOut = layoutRows(getNodes(), sizes);
        boundsRef.current = boundsOf(laidOut, sizes);
        layoutWidthRef.current = host?.offsetWidth ?? 0;
        setNodes(laidOut);
        setReady(true);
        applyViewport();
      } else if (tries++ < 60) {
        setTimeout(attempt, 50);
      } else {
        setReady(true);
      }
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, [ready, getNodes, applyViewport]);

  useEffect(() => {
    if (!ready || !wrapperRef.current) return;
    const observer = new ResizeObserver(() => {
      const width = wrapperRef.current?.offsetWidth ?? 0;
      if (width > 0 && Math.abs(width - layoutWidthRef.current) > 60) {
        // Node text re-wraps at a meaningfully different width — redo the layout.
        setReady(false);
      } else {
        applyViewport();
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [ready, applyViewport]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        panOnScroll={false}
        preventScrolling={false}
        minZoom={0.2}
      >
        <Background variant={BackgroundVariant.Dots} color="#1E1E23" gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function InstitutionalFlowchart({
  nodesData,
  edgesData,
  height = '450px',
}: {
  nodesData: string;
  edgesData: string;
  height?: string;
}) {
  const nodes = useMemo<Node[]>(() => {
    try {
      const parsed = JSON.parse(nodesData.replace(/&quot;/g, '"'));
      return parsed.map((node: any) => {
        const accentFromBorder = hexIn(node.style?.border);
        const bgHex = hexIn(node.style?.background);
        let variant: FlowNodeData['variant'] = 'outline';
        let accent = accentFromBorder || VOLT;
        if (bgHex) {
          if (relLuminance(bgHex) > 0.15) {
            variant = 'fill';
            accent = bgHex;
          } else {
            variant = 'raised';
          }
        }
        return {
          id: node.id,
          type: 'institutional',
          position: node.position ?? { x: 0, y: 0 },
          data: {
            label: node.data?.label ?? '',
            accent,
            variant,
            origX: node.position?.x ?? 0,
            origY: node.position?.y ?? 0,
          },
        };
      });
    } catch {
      return [];
    }
  }, [nodesData]);

  const edges = useMemo<Edge[]>(() => {
    try {
      const parsed = JSON.parse(edgesData.replace(/&quot;/g, '"'));
      return parsed.map((edge: any) => ({
        ...edge,
        type: 'smoothstep',
        animated: edge.animated || false,
        style: {
          stroke: edge.animated ? VOLT : EDGE_INK,
          strokeWidth: 1.5,
          ...edge.style,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.animated ? VOLT : EDGE_INK,
          width: 18,
          height: 18,
        },
        labelStyle: { fill: INK_HI, fontWeight: 600, fontSize: 11, fontFamily: MONO },
        labelBgStyle: { fill: '#1B1B20', fillOpacity: 0.95, rx: 5, ry: 5 },
        labelBgPadding: [8, 4] as [number, number],
      }));
    } catch {
      return [];
    }
  }, [edgesData]);

  if (nodes.length === 0) return null;

  return (
    <div
      style={{
        width: '100%',
        height,
        margin: '2rem 0',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #1F1F23',
        background: SURFACE,
        // Mounted inside a <pre> by the markdown pipeline — reset inherited white-space.
        whiteSpace: 'normal',
      }}
    >
      <ReactFlowProvider>
        <FlowCanvas initialNodes={nodes} edges={edges} />
      </ReactFlowProvider>
    </div>
  );
}
