'use client';

import React from 'react';

interface NewsItem {
  title: string;
  link: string;
  source: string;
}

interface NewsTickerProps {
  news: NewsItem[];
}

export default function NewsTicker({ news }: NewsTickerProps) {
  if (!news || news.length === 0) return null;

  return (
    <div className="shrink-0 bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-4 py-2 flex items-center text-[11px] font-mono text-[var(--subtext)] overflow-hidden relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 85s linear infinite;
          gap: 2rem;
          padding-left: 1rem;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase shrink-0 bg-[var(--sidebar-bg)] pr-3 z-10 border-r border-[var(--border)]/60" style={{ color: 'var(--accent)' }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        LIVE NEWS
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <div className="marquee-track">
          {/* First batch */}
          {news.map((item, idx) => (
            <div key={`a-${idx}`} className="flex items-center gap-2 shrink-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text)] opacity-85 hover:opacity-100 hover:text-[var(--accent)] transition-colors"
              >
                {item.title}
              </a>
              <span className="text-[10px] text-[var(--subtext)] opacity-60">({item.source})</span>
              <span className="mx-2" style={{ color: 'color-mix(in srgb, var(--accent) 50%, transparent)' }}>•</span>
            </div>
          ))}
          {/* Duplicate batch for seamless infinite loop */}
          {news.map((item, idx) => (
            <div key={`b-${idx}`} className="flex items-center gap-2 shrink-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text)] opacity-85 hover:opacity-100 hover:text-blue-400 transition-colors"
              >
                {item.title}
              </a>
              <span className="text-[10px] text-[var(--subtext)] opacity-60">({item.source})</span>
              <span className="text-blue-500/50 mx-2">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
