'use client';

import React, { useMemo } from 'react';
import { ReactFlow, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function InstitutionalFlowchart({ nodesData, edgesData, height = "450px" }: { nodesData: string, edgesData: string, height?: string }) {
  const nodes = useMemo(() => {
    try {
      return JSON.parse(nodesData.replace(/&quot;/g, '"'));
    } catch { return []; }
  }, [nodesData]);

  const edges = useMemo(() => {
    try {
      return JSON.parse(edgesData.replace(/&quot;/g, '"'));
    } catch { return []; }
  }, [edgesData]);

  const styledNodes = nodes.map((node: any) => ({
    ...node,
    style: {
      background: '#18181B',
      color: '#F9FAFB',
      border: '1px solid #C6FF2E',
      borderRadius: '8px',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 4px 20px rgba(198, 255, 46, 0.05)',
      textAlign: 'center',
      minWidth: '200px',
      ...node.style
    }
  }));

  const styledEdges = edges.map((edge: any) => ({
    ...edge,
    type: 'smoothstep',
    animated: edge.animated || false,
    style: { stroke: edge.animated ? '#C6FF2E' : '#52525B', strokeWidth: 2, ...edge.style },
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.animated ? '#C6FF2E' : '#52525B' },
    labelStyle: { fill: '#F9FAFB', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#27272A', color: '#fff', fillOpacity: 0.9, rx: 6, ry: 6 },
    labelBgPadding: [8, 4],
  }));

  return (
    <div style={{ width: '100%', height, margin: '2rem 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid #27272A', background: '#0A0A0A' }}>
      <ReactFlow nodes={styledNodes} edges={styledEdges} fitView fitViewOptions={{ padding: 0.2 }} attributionPosition="bottom-right">
        <Background color="#27272A" gap={16} />
      </ReactFlow>
    </div>
  );
}
