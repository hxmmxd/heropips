'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';

// Initialize mermaid with the HeroPips Volt Green theme!
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1f2937',
    primaryTextColor: '#F3F4F6',
    primaryBorderColor: '#C6FF2E', // Volt green
    lineColor: '#C6FF2E', // Volt green lines
    secondaryColor: '#374151',
    tertiaryColor: '#111827',
    fontFamily: 'inherit',
    
    // Pie Chart Specific
    pie1: '#C6FF2E', // Volt Green
    pie2: '#10B981', // Emerald
    pie3: '#3B82F6', // Blue
    pie4: '#8B5CF6', // Purple
    pie5: '#1f2937', // Dark Gray
    pieTitleTextSize: '16px', // Smaller to prevent clipping
    pieTitleTextColor: '#F3F4F6',
    pieSectionTextSize: '12px',
    pieSectionTextColor: '#111827',
    pieLegendTextSize: '12px', // Smaller to prevent clipping
    pieLegendTextColor: '#9CA3AF',
    pieStrokeColor: '#111827',
    pieStrokeWidth: '2px',

    // Flowchart Specific
    mainBkg: '#1f2937',
    nodeBorder: '#C6FF2E',
    clusterBkg: '#111827',
    clusterBorder: '#374151',
    titleColor: '#F3F4F6',
    edgeLabelBackground: '#1f2937',
    nodeTextColor: '#F3F4F6',
  }
});

const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: svgOutput } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(svgOutput);
        }
      } catch (e) {
        console.error('Mermaid parsing error:', e);
      }
    };
    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mermaid-chart svg {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
          overflow: visible !important;
        }
      `}} />
      <div 
        className="mermaid-chart flex justify-center w-full my-8 p-6 bg-[#111827] border border-gray-800 rounded-lg shadow-[0_0_15px_rgba(198,255,46,0.1)] overflow-visible" 
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </>
  );
};

import InstitutionalFlowchart from './InstitutionalFlowchart';
import InstitutionalPieChart from './InstitutionalPieChart';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-([\w-]+)/.exec(className || '');
          const lang = match ? match[1] : '';
          
          if (!inline && lang === 'mermaid') {
            return <Mermaid chart={String(children).replace(/\n$/, '')} />;
          }
          if (!inline && lang === 'institutional-flowchart') {
            try {
              const data = JSON.parse(String(children));
              return <InstitutionalFlowchart nodesData={JSON.stringify(data.nodes)} edgesData={JSON.stringify(data.edges)} height={data.height || '450px'} />;
            } catch (e) {
              return <div className="text-red-500">Error parsing flowchart JSON</div>;
            }
          }
          if (!inline && lang === 'institutional-pie-chart') {
            try {
              const data = JSON.parse(String(children));
              return <InstitutionalPieChart dataStr={JSON.stringify(data.data)} title={data.title} />;
            } catch (e) {
              return <div className="text-red-500">Error parsing pie chart JSON</div>;
            }
          }
          
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        table({ node, ...props }: any) {
          return (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table {...props} />
            </div>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
