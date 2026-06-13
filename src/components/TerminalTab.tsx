'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, ArrowUp, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import TradeTicket from './TradeTicket';
import dynamic from 'next/dynamic';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useSignal, SignalData } from '@/contexts/SignalContext';
import { useSearchParams } from 'next/navigation';

const MiniChart = dynamic(() => import('./MiniChart'), { ssr: false });
const AstroCard = dynamic(() => import('./AstroCard'), { ssr: false });

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
  activeBrokerId: string;
  onTradeExecuted?: (result: { orderId: string; fillPrice?: number; ticket: any }) => void;
  onOpenManager?: () => void;
  astroMode?: boolean;
}

// Star particle positions (fixed, no random on render)



// ── Astro Activation Body (fetches live celestial data) ──
function AstroActivationBody() {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(() => {
    fetch('/api/astro?symbol=XAU/USD')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.snapshot); })
      .catch(() => {});
  }, []);
  if (!data) return (
    <div className="px-5 py-6 flex items-center justify-center">
      <span className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold animate-pulse">Syncing ephemeris...</span>
    </div>
  );
  return (
    <div className="px-5 py-4 space-y-2.5 text-[11px] text-slate-200">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-base">{data.lunarEmoji}</span>
          <span className="font-bold">{data.lunarPhase}</span>
          <span className="text-slate-400">— Day {data.moonAge?.toFixed(1)} in {data.moonSignName}</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">☿ Mercury</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
          data.mercuryState === 'retrograde' ? 'bg-red-500/20 text-red-300 border border-red-500/30'
          : data.mercuryState === 'direct' ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }`}>
          {data.mercuryState?.toUpperCase()} {data.mercuryState === 'direct' ? '✓' : '⚠'}
        </span>
      </div>
      {data.aspects && data.aspects.length > 0 && (
        <div className="pt-1 border-t border-white/5 space-y-1">
          {data.aspects.slice(0, 3).map((a: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-slate-300">{a.planet1} {a.type} {a.planet2}</span>
              <span className={`text-[9px] font-bold ${a.nature === 'harmonious' ? 'text-emerald-400' : a.nature === 'tense' ? 'text-red-400' : 'text-slate-400'}`}>
                {a.nature} ({a.orb}°)
              </span>
            </div>
          ))}
        </div>
      )}
      {data.moonVoidOfCourse && (
        <div className="mt-1 bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[9px] font-bold">
          ⚠ Moon Void of Course — new entries deferred
        </div>
      )}
    </div>
  );
}

// ── Solar System Orrery (empty-state animation) ──
function SolarSystemOrrery() {
  // Stars placed only along edges/corners — never near center content
  const edgeStars = [
    // top edge
    { top: '4%',  left: '8%',  size: 9,  delay: '0s',    glyph: '✦' },
    { top: '6%',  left: '25%', size: 7,  delay: '1.2s',  glyph: '·' },
    { top: '3%',  left: '72%', size: 8,  delay: '0.6s',  glyph: '✦' },
    { top: '7%',  left: '88%', size: 7,  delay: '2s',    glyph: '·' },
    // bottom edge
    { top: '91%', left: '6%',  size: 8,  delay: '1.5s',  glyph: '✦' },
    { top: '94%', left: '22%', size: 6,  delay: '0.3s',  glyph: '·' },
    { top: '89%', left: '74%', size: 9,  delay: '1.8s',  glyph: '✦' },
    { top: '93%', left: '91%', size: 7,  delay: '0.9s',  glyph: '·' },
    // left edge
    { top: '28%', left: '2%',  size: 7,  delay: '2.2s',  glyph: '·' },
    { top: '55%', left: '1%',  size: 8,  delay: '0.4s',  glyph: '✦' },
    { top: '75%', left: '3%',  size: 6,  delay: '1.6s',  glyph: '·' },
    // right edge
    { top: '22%', left: '97%', size: 8,  delay: '1.1s',  glyph: '✦' },
    { top: '48%', left: '96%', size: 6,  delay: '2.5s',  glyph: '·' },
    { top: '68%', left: '97%', size: 9,  delay: '0.7s',  glyph: '✦' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {edgeStars.map((s, i) => (
        <span
          key={i}
          className="absolute astro-twinkle select-none"
          style={{
            top: s.top,
            left: s.left,
            fontSize: s.size,
            color: 'rgba(245,158,11,0.28)',
            animationDelay: s.delay,
            lineHeight: 1,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

// Coin/Asset icons for analysis cards (larger versions of WatchIcon)
function CoinIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase();
  const sz = 32;
  const getType = (): string => {
    if (s.includes('XAU') || s.includes('GOLD')) return 'gold';
    if (s.includes('BTC') || s.includes('BITCOIN')) return 'btc';
    if (s.includes('ETH')) return 'eth';
    if (s.includes('EUR')) return 'eur';
    if (s.includes('GBP')) return 'gbp';
    if (s.includes('JPY')) return 'jpy';
    if (s.includes('NAS') || s.includes('NASDAQ')) return 'nasdaq';
    if (s.includes('US30') || s.includes('DOW')) return 'dow';
    if (s.includes('OIL') || s.includes('USO')) return 'oil';
    if (s.includes('SP') || s.includes('SPY')) return 'spy';
    return 'default';
  };
  const type = getType();

  switch (type) {
    case 'gold':
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><path d="M4 20h16l-3-8H7L4 20z" fill="#FFD700"/><path d="M7 12h10l-2-6H9L7 12z" fill="#FFC107"/><path d="M9 6h6l-1.5-4h-3L9 6z" fill="#FFB300"/></svg>;
    case 'btc':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-4l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.3-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 .1.1.1.1.1l-.1 0-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1-.04-3.3-1.5-4 1.1-.2 1.9-1.1 2.1-2.6zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.1.3 4.9.8 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.8-3.4c1 .2 4.1.7 3.6 2.7z" fill="#fff"/></svg>;
    case 'eth':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="#fff" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="#fff"/><path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="#fff" fillOpacity=".6"/><path d="M16.5 28V21.9L9 17.6l7.5 10.4z" fill="#fff"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="#fff" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="#fff" fillOpacity=".5"/></svg>;
    case 'eur':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#003399"/><path d="M20.5 23.5c-1.2.6-2.5 1-3.9 1-3.8 0-7-2.5-8-6h8.5v-2h-9c0-.3-.1-.7-.1-1s0-.7.1-1h8.9v-2h-8.5c1-3.4 4.2-6 8-6 1.4 0 2.7.3 3.9 1l1.1-2c-1.5-.8-3.2-1.3-5-1.3-5.1 0-9.4 3.5-10.6 8.3H5v2h2.1c0 .3-.1.7-.1 1s0 .7.1 1H5v2h2.4c1.2 4.7 5.5 8.3 10.6 8.3 1.8 0 3.5-.4 5-1.3l-1.1-2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'gbp':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1A237E"/><path d="M11 24v-2h2v-4h-2v-2h2c0-1.5-.3-2.8.5-4 .8-1.3 2.2-2 3.7-2 1.2 0 2.3.4 3.2 1.1l-1.2 1.8c-.6-.5-1.2-.7-1.9-.7-.7 0-1.3.3-1.6.8-.3.5-.3 1.3-.3 2h3.1v2h-3.1v4H21v2H11z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'jpy':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C62828"/><path d="M10 8l6 8 6-8h-2.8l-3.2 4.3L12.8 8H10zm1 12h3v4h4v-4h3v-2h-3v-1.5h3v-2h-2.3L16 18l-2.7-3.5H11v2h3V18h-3v2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'nasdaq':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0D47A1"/><path d="M7 22l4-6 3 3 5-8 4 4" stroke="#4FC3F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="23" cy="15" r="2" fill="#4FC3F7"/></svg>;
    case 'dow':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1565C0"/><rect x="7" y="17" width="4" height="7" rx="1" fill="#90CAF9" opacity=".6"/><rect x="14" y="12" width="4" height="12" rx="1" fill="#90CAF9" opacity=".8"/><rect x="21" y="8" width="4" height="16" rx="1" fill="#90CAF9"/></svg>;
    case 'oil':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#212121"/><path d="M16 6s-6 8-6 13a6 6 0 0012 0c0-5-6-13-6-13z" fill="#424242" stroke="#757575" strokeWidth="1"/><path d="M16 10s-3.5 5-3.5 9a3.5 3.5 0 007 0c0-4-3.5-9-3.5-9z" fill="#616161"/></svg>;
    case 'spy':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1B5E20"/><path d="M8 22l3.5-5 3 2.5 4-6 3 2 2.5-4" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="24" cy="11.5" r="2" fill="#66BB6A"/></svg>;
    default:
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#424242"/><path d="M8 20l5-5 4 3 7-8" stroke="#aaa" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>;
  }
}

// Watchlist icon SVGs (authentic brand logos)
function WatchIcon({ type }: { type: string }) {
  const s = 14;
  switch (type) {
    case 'gold':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 20h16l-3-8H7L4 20z" fill="#FFD700"/><path d="M7 12h10l-2-6H9L7 12z" fill="#FFC107"/><path d="M9 6h6l-1.5-4h-3L9 6z" fill="#FFB300"/></svg>;
    case 'btc':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-4l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.3-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 .1.1.1.1.1l-.1 0-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1-.04-3.3-1.5-4 1.1-.2 1.9-1.1 2.1-2.6zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.1.3 4.9.8 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.8-3.4c1 .2 4.1.7 3.6 2.7z" fill="#fff"/></svg>;
    case 'eth':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="#fff" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="#fff"/><path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="#fff" fillOpacity=".6"/><path d="M16.5 28V21.9L9 17.6l7.5 10.4z" fill="#fff"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="#fff" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="#fff" fillOpacity=".5"/></svg>;
    case 'eur':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#003399"/><path d="M20.5 23.5c-1.2.6-2.5 1-3.9 1-3.8 0-7-2.5-8-6h8.5v-2h-9c0-.3-.1-.7-.1-1s0-.7.1-1h8.9v-2h-8.5c1-3.4 4.2-6 8-6 1.4 0 2.7.3 3.9 1l1.1-2c-1.5-.8-3.2-1.3-5-1.3-5.1 0-9.4 3.5-10.6 8.3H5v2h2.1c0 .3-.1.7-.1 1s0 .7.1 1H5v2h2.4c1.2 4.7 5.5 8.3 10.6 8.3 1.8 0 3.5-.4 5-1.3l-1.1-2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'gbp':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1A237E"/><path d="M11 24v-2h2v-4h-2v-2h2c0-1.5-.3-2.8.5-4 .8-1.3 2.2-2 3.7-2 1.2 0 2.3.4 3.2 1.1l-1.2 1.8c-.6-.5-1.2-.7-1.9-.7-.7 0-1.3.3-1.6.8-.3.5-.3 1.3-.3 2h3.1v2h-3.1v4H21v2H11z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'jpy':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C62828"/><path d="M10 8l6 8 6-8h-2.8l-3.2 4.3L12.8 8H10zm1 12h3v4h4v-4h3v-2h-3v-1.5h3v-2h-2.3L16 18l-2.7-3.5H11v2h3V18h-3v2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'nasdaq':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0D47A1"/><path d="M7 22l4-6 3 3 5-8 4 4" stroke="#4FC3F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="23" cy="15" r="2" fill="#4FC3F7"/></svg>;
    case 'dow':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1565C0"/><rect x="7" y="17" width="4" height="7" rx="1" fill="#90CAF9" opacity=".6"/><rect x="14" y="12" width="4" height="12" rx="1" fill="#90CAF9" opacity=".8"/><rect x="21" y="8" width="4" height="16" rx="1" fill="#90CAF9"/></svg>;
    case 'oil':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#212121"/><path d="M16 6s-6 8-6 13a6 6 0 0012 0c0-5-6-13-6-13z" fill="#424242" stroke="#757575" strokeWidth="1"/><path d="M16 10s-3.5 5-3.5 9a3.5 3.5 0 007 0c0-4-3.5-9-3.5-9z" fill="#616161"/></svg>;
    case 'spy':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1B5E20"/><path d="M8 22l3.5-5 3 2.5 4-6 3 2 2.5-4" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="24" cy="11.5" r="2" fill="#66BB6A"/></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#424242"/><path d="M8 20l5-5 4 3 7-8" stroke="#aaa" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>;
  }
}

// Default watchlist assets
const WATCHLIST_ASSETS = [
  { symbol: 'Gold', label: 'XAUUSD', iconType: 'gold' },
  { symbol: 'Bitcoin', label: 'BTCUSD', iconType: 'btc' },
  { symbol: 'Ethereum', label: 'ETHUSD', iconType: 'eth' },
  { symbol: 'EURUSD', label: 'EURUSD', iconType: 'eur' },
  { symbol: 'GBPUSD', label: 'GBPUSD', iconType: 'gbp' },
  { symbol: 'NAS100', label: 'NAS100', iconType: 'nasdaq' },
  { symbol: 'US30', label: 'US30', iconType: 'dow' },
  { symbol: 'Oil', label: 'OIL', iconType: 'oil' },
  { symbol: 'SPY', label: 'SP500', iconType: 'spy' },
];

/* ─── Astro Welcome Status: Elegant inline indicators ─────────────────── */
function AstroWelcomeStatus() {
  const [snap, setSnap] = useState<any>(null);

  useEffect(() => {
    import('@/lib/astro').then(({ getAstroSnapshot }) => {
      setSnap(getAstroSnapshot());
    });
  }, []);

  if (!snap) return null;

  const riskColor = snap.riskLevel === 'LOW' ? '#22c55e' : snap.riskLevel === 'HIGH' ? '#ef4444' : '#f59e0b';
  const biasColor = snap.marketBias === 'bullish' ? '#22c55e' : snap.marketBias === 'bearish' ? '#ef4444' : 'var(--subtext)';

  const items = [
    { emoji: snap.lunarEmoji, label: snap.lunarPhase, sub: `in ${snap.moonSignName}` },
    { emoji: '☿', label: snap.mercuryRetrograde ? 'Retrograde' : 'Direct', color: snap.mercuryRetrograde ? '#ef4444' : '#22c55e' },
    { emoji: '◎', label: snap.marketBias.charAt(0).toUpperCase() + snap.marketBias.slice(1), color: biasColor, sub: 'bias' },
    { emoji: '◆', label: snap.riskLevel, color: riskColor, sub: 'risk' },
  ];

  return (
    <div className="wlc-status-row">
      {items.map((item, i) => (
        <div key={i} className="wlc-status-item" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
          <span className="wlc-status-emoji">{item.emoji}</span>
          <span className="wlc-status-text" style={item.color ? { color: item.color } : {}}>{item.label}</span>
          {item.sub && <span className="wlc-status-sub">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export default function TerminalTab({ messages, onSendMessage, onGenerateSignal, activeBrokerId, onTradeExecuted, onOpenManager, astroMode: astroModeProp }: TerminalTabProps) {
  // Allow ?astro=1 URL param to test animation without wiring the header toggle
  const searchParams = useSearchParams();
  const astroMode = astroModeProp ?? searchParams.get('astro') === '1';
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setPendingSignal } = useSignal();

  // Live prices via SSE
  const { getPrice, connected } = useLivePrices();
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});

  // Detect price direction for flash effect
  const checkFlash = (symbol: string, newPrice: number | null) => {
    if (newPrice === null) return;
    const prev = prevPricesRef.current[symbol];
    if (prev !== undefined && prev !== newPrice) {
      setFlashMap((f) => ({ ...f, [symbol]: newPrice > prev ? 'up' : 'down' }));
      setTimeout(() => setFlashMap((f) => ({ ...f, [symbol]: null })), 600);
    }
    prevPricesRef.current[symbol] = newPrice;
  };

  const [news, setNews] = useState<any[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleSpeechToText = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Fetch news headlines on mount
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.news?.length > 0) {
          setNews(data.news);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      }
    };
    fetchNews();
    const intervalId = setInterval(fetchNews, 300000); // refresh every 5 mins
    return () => clearInterval(intervalId);
  }, []);

  // Rotate news headline every 6 seconds
  useEffect(() => {
    if (news.length <= 1) return;
    const intervalId = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % news.length);
    }, 6000);
    return () => clearInterval(intervalId);
  }, [news]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset textarea height on message submit
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [messages.length]);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <style>{`
        @keyframes priceFlashUp {
          0%   { background: rgba(16,185,129,0.22); color: #10b981; }
          100% { background: transparent; }
        }
        @keyframes priceFlashDown {
          0%   { background: rgba(239,68,68,0.18); color: #ef4444; }
          100% { background: transparent; }
        }
        .price-flash-up   { animation: priceFlashUp   0.55s ease-out forwards; border-radius: 4px; }
        .price-flash-down { animation: priceFlashDown 0.55s ease-out forwards; border-radius: 4px; }
        .live-dot { width:5px; height:5px; border-radius:50%; background:#10b981; display:inline-block; margin-right:3px; }
        .live-dot-pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
      `}</style>

      {/* Watchlist Strip — live prices */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0 mr-1">
            <span className={`live-dot ${connected ? 'live-dot-pulse' : ''}`} style={{ background: connected ? '#10b981' : '#ef4444' }} />
            <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest">{connected ? 'Live' : 'Off'}</span>
          </div>
          {WATCHLIST_ASSETS.map((asset) => {
            const livePrice = getPrice(asset.symbol);
            checkFlash(asset.symbol, livePrice);
            const flash = flashMap[asset.symbol];
            return (
              <button
                key={asset.symbol}
                onClick={() => onSendMessage(asset.symbol)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-95 transition-all shrink-0 group"
              >
                <WatchIcon type={asset.iconType} />
                <span className="text-[11px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{asset.label}</span>
                {livePrice !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold ml-0.5 px-1 ${
                      flash === 'up' ? 'price-flash-up text-green-400'
                      : flash === 'down' ? 'price-flash-down text-red-400'
                      : 'text-[var(--subtext)]'
                    }`}
                  >
                    {livePrice > 999 ? livePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : livePrice.toFixed(4)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live News Ticker Strip */}
      {news.length > 0 && (
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
      )}

      {/* Scrollable Chat Feed */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
        {messages.length === 0 ? (
          /* ═══════════════════════════════════════════════════════════════
             WELCOME SCREEN — World-class, impactful, minimal
             ═══════════════════════════════════════════════════════════════ */
          <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">

            {/* ── Ambient Glow Backdrop ── */}
            <div className="wlc-glow" />
            {astroMode && <SolarSystemOrrery />}

            {/* ── Main Content ── */}
            <div className="z-10 w-full max-w-xl flex flex-col items-center text-center gap-7 px-6">

              {/* Greeting */}
              <div className="wlc-hero">
                {astroMode ? (
                  <>
                    <p className="wlc-eyebrow wlc-fade" style={{ animationDelay: '0.05s' }}>
                      <span className="wlc-dot wlc-dot--amber" />Celestial engine active
                    </p>
                    <h2 className="wlc-title wlc-fade wlc-title--amber" style={{ animationDelay: '0.12s' }}>
                      Ask about any asset
                    </h2>
                    <p className="wlc-sub wlc-fade" style={{ animationDelay: '0.18s' }}>
                      Planetary aspects, lunar phases, and Mercury retrograde gates are layered into every signal automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="wlc-eyebrow wlc-fade" style={{ animationDelay: '0.05s' }}>
                      <span className="wlc-dot wlc-dot--green" />Ready
                    </p>
                    <h2 className="wlc-title wlc-fade" style={{ animationDelay: '0.12s' }}>
                      What would you like to analyze?
                    </h2>
                    <p className="wlc-sub wlc-fade" style={{ animationDelay: '0.18s' }}>
                      AI-powered trade signals, technical analysis, and live broker management.
                    </p>
                  </>
                )}
              </div>

              {/* ── Astro Status Strip ── */}
              {astroMode && <AstroWelcomeStatus />}

              {/* ── Suggestion Grid ── */}
              <div className="wlc-grid wlc-fade" style={{ animationDelay: '0.28s' }}>
                {(astroMode ? [
                  { label: 'Gold signal', icon: '🏆', action: () => onGenerateSignal?.("Gold") },
                  { label: 'Bitcoin signal', icon: '₿', action: () => onGenerateSignal?.("Bitcoin") },
                  { label: 'EUR/USD signal', icon: '€', action: () => onGenerateSignal?.("EURUSD") },
                  { label: 'Lunar influence', icon: '🌙', action: () => onSendMessage("What is the current lunar phase influence on trading?") },
                  { label: 'Mercury status', icon: '☿', action: () => onSendMessage("Is Mercury retrograde right now?") },
                  { label: 'Full astro report', icon: '✦', action: () => onSendMessage("Give me a full celestial report for today") },
                ] : [
                  { label: 'Analyze XAUUSD', icon: '🏆', action: () => onGenerateSignal?.("Gold") },
                  { label: 'Analyze BTCUSD', icon: '₿', action: () => onGenerateSignal?.("Bitcoin") },
                  { label: 'Analyze EUR/USD', icon: '€', action: () => onGenerateSignal?.("EURUSD") },
                  { label: 'Market overview', icon: '📊', action: () => onSendMessage("Give me a market overview") },
                  { label: 'My positions', icon: '💼', action: () => onSendMessage("Show my open positions") },
                  { label: 'Analyze NAS100', icon: '📈', action: () => onGenerateSignal?.("NAS100") },
                ]).map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={`wlc-card ${astroMode ? 'wlc-card--astro' : ''}`}
                    style={{ animationDelay: `${0.3 + i * 0.04}s` }}
                  >
                    <span className="wlc-card-icon">{item.icon}</span>
                    <span className="wlc-card-label">{item.label}</span>
                    <svg className="wlc-card-arrow" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Welcome Screen Styles ── */}
            <style>{`
              /* Ambient glow */
              .wlc-glow {
                position: absolute;
                width: 500px; height: 500px;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                background: ${astroMode
                  ? 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 50%, transparent 70%)'
                  : 'radial-gradient(circle, color-mix(in srgb, var(--accent) 7%, transparent) 0%, color-mix(in srgb, var(--accent) 2%, transparent) 50%, transparent 70%)'
                };
                pointer-events: none;
                animation: wlc-glow-pulse 6s ease-in-out infinite alternate;
              }
              @keyframes wlc-glow-pulse {
                from { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
                to   { opacity: 1;   transform: translate(-50%, -50%) scale(1.1); }
              }

              /* Fade-up entrance */
              .wlc-fade {
                opacity: 0;
                animation: wlc-fade-up 0.5s ease-out forwards;
              }
              @keyframes wlc-fade-up {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
              }

              /* Hero section */
              .wlc-hero { display: flex; flex-direction: column; align-items: center; gap: 8px; }
              .wlc-eyebrow {
                display: inline-flex; align-items: center; gap: 6px;
                font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
                color: var(--subtext); text-transform: uppercase;
              }
              .wlc-dot {
                width: 6px; height: 6px; border-radius: 50%;
                display: inline-block; flex-shrink: 0;
              }
              .wlc-dot--green { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
              .wlc-dot--amber { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
              .wlc-title {
                font-size: 26px; font-weight: 600; letter-spacing: -0.025em;
                color: var(--text); line-height: 1.25; margin: 0;
              }
              .wlc-title--amber { color: #f59e0b; }
              .wlc-sub {
                font-size: 13px; color: var(--subtext); opacity: 0.65;
                line-height: 1.6; max-width: 400px;
              }

              /* Astro status row */
              .wlc-status-row {
                display: flex; flex-wrap: wrap; align-items: center;
                justify-content: center; gap: 4px 12px;
                opacity: 0; animation: wlc-fade-up 0.5s ease-out forwards;
                animation-delay: 0.22s;
              }
              .wlc-status-item {
                display: inline-flex; align-items: center; gap: 4px;
                font-size: 12px; color: var(--subtext); white-space: nowrap;
              }
              .wlc-status-emoji { font-size: 13px; line-height: 1; }
              .wlc-status-text { font-weight: 600; color: #f59e0b; }
              .wlc-status-sub { font-weight: 400; opacity: 0.5; font-size: 11px; }

              /* Suggestion grid */
              .wlc-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
                width: 100%;
              }
              @media (max-width: 640px) {
                .wlc-grid { grid-template-columns: repeat(2, 1fr); }
              }

              /* Suggestion card */
              .wlc-card {
                display: flex; align-items: center; gap: 8px;
                padding: 10px 12px;
                border-radius: 12px;
                border: 1px solid var(--border);
                background: var(--sidebar-bg);
                color: var(--text);
                font-size: 12.5px; font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                position: relative;
                opacity: 0;
                animation: wlc-fade-up 0.4s ease-out forwards;
              }
              .wlc-card:hover {
                border-color: color-mix(in srgb, var(--accent) 45%, transparent);
                background: color-mix(in srgb, var(--accent) 5%, var(--sidebar-bg));
                transform: translateY(-2px);
                box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 8%, transparent);
              }
              .wlc-card:active { transform: scale(0.98) translateY(0); }

              .wlc-card--astro:hover {
                border-color: rgba(245, 158, 11, 0.35);
                background: rgba(245, 158, 11, 0.05);
                box-shadow: 0 4px 16px rgba(245,158,11,0.08);
              }

              .wlc-card-icon {
                font-size: 14px; line-height: 1;
                width: 22px; text-align: center; flex-shrink: 0;
              }
              .wlc-card-label { flex: 1; letter-spacing: -0.01em; }
              .wlc-card-arrow {
                width: 14px; height: 14px; flex-shrink: 0;
                color: var(--subtext); opacity: 0;
                transition: all 0.2s ease;
                transform: translateX(-3px);
              }
              .wlc-card:hover .wlc-card-arrow {
                opacity: 0.5; transform: translateX(0);
              }
            `}</style>

          </div>
        ) : (
          /* Messages List */
          <div className="max-w-4xl mx-auto w-full space-y-6 pb-10 px-2">
            {messages.map((msg) => {
              // ── User message ──
              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end px-4 mb-6">
                    <div className="bg-[var(--input-bg)] px-5 py-3 rounded-[20px] max-w-[90%] text-[15px] border border-[var(--border)] shadow-sm text-[var(--text)]">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // ── Astro Activation Card ──
              if (msg.astroCard && msg.text === 'ASTRO_ACTIVATION') {
                return (
                  <div key={msg.id} className="flex px-4 mb-6 animate-in slide-in-from-bottom-3 duration-500">
                    <div className="w-full max-w-md bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 border border-amber-500/25 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.12)] overflow-hidden">
                      {/* Header */}
                      <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2.5">
                        <span className="text-lg">✦</span>
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-[0.18em]">
                          Astro Mode Activated
                        </h3>
                      </div>
                      {/* Live Ephemeris Data (fetched inline) */}
                      <AstroActivationBody />
                      {/* Footer */}
                      <div className="px-5 py-2.5 border-t border-amber-500/10 bg-amber-950/10">
                        <p className="text-[9px] text-slate-400 leading-relaxed">
                          Celestial cycles are now layered into every signal. Ask me to analyze any asset.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── Bot message ──
              const isTyping = msg.text === '__TYPING__';
              return (
                <div
                  key={msg.id}
                  className={`flex px-4 mb-6 animate-in slide-in-from-bottom-2 ${
                    isTyping ? 'space-x-3 items-center' : 'flex-col items-start'
                  }`}
                >
                    {isTyping && (
                      astroMode ? (
                        /* ── Astro Planet Orbit Typing Indicator ── */
                        <div className="astro-typing-orbit-wrap">
                          <svg className="astro-typing-orbit-svg" viewBox="0 0 48 48">
                            {/* Orbit ring */}
                            <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="3 2" />
                            {/* Center star */}
                            <circle cx="24" cy="24" r="3" fill="rgba(245,158,11,0.6)">
                              <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                            </circle>
                            {/* Orbiting planet */}
                            <circle r="2.5" fill="#fbbf24">
                              <animateMotion dur="2.4s" repeatCount="indefinite" path="M24,6 A18,18 0 1,1 23.99,6" />
                              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
                            </circle>
                            {/* Tiny moon */}
                            <circle r="1.2" fill="#38bdf8" opacity="0.8">
                              <animateMotion dur="4s" repeatCount="indefinite" path="M24,6 A18,18 0 1,1 23.99,6" begin="-1.5s" />
                            </circle>
                          </svg>
                        </div>
                      ) : (
                        <div className="bot-typing-heartbeat-wrap">
                          <svg className="bot-typing-heartbeat-svg" viewBox="0 0 64 48">
                            <polyline className="bot-hb-back" points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" />
                            <polyline className="bot-hb-front" points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" />
                          </svg>
                        </div>
                      )
                    )}
                    {/* Bot Response Content */}
                    <div className="flex-1 space-y-2 w-full">
                      {/* Typing animation */}
                      {isTyping && (
                        <div className={`border px-5 py-3 rounded-[20px] max-w-full shadow-sm ${
                          astroMode
                            ? 'bg-gradient-to-r from-amber-950/20 to-slate-950/40 border-amber-500/15'
                            : 'bg-[var(--sidebar-bg)] border-[var(--border)]'
                        }`}>
                          <div className={astroMode ? 'astro-typing-loader' : 'typing-loader'} />
                        </div>
                      )}

                      {/* Rich Market Analysis Card */}
                      {msg.marketData && msg.text && msg.text !== '__TYPING__' && (
                        <div className="max-w-full border border-[var(--border)] bg-[var(--sidebar-bg)] rounded-[20px] overflow-hidden shadow-sm">
                          {/* Card Header — Coin Icon + Symbol + Price */}
                          <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border)]">
                            <div className="flex items-center gap-3">
                              <CoinIcon symbol={msg.marketData.displaySymbol} />
                              <div>
                                <p className="text-sm font-bold text-[var(--text)] uppercase tracking-wide">{msg.marketData.displaySymbol}</p>
                                <p className="text-[10px] text-[var(--subtext)] uppercase tracking-wider">Live Analysis</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const live = getPrice(msg.marketData.displaySymbol) ?? getPrice(msg.marketData.symbol);
                                const snapshotP = msg.marketData.price > 0 ? msg.marketData.price : null;
                                const displayP = live ?? snapshotP;
                                return (
                                  <>
                                    <p className="text-lg font-bold font-mono text-[var(--text)]">
                                      {displayP != null
                                        ? `$${displayP > 999
                                            ? displayP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                            : displayP.toFixed(4)}`
                                        : '—'}
                                    </p>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      msg.marketData.confluenceDirection === 'SELL'
                                        ? 'bg-red-500/10 text-red-500'
                                        : msg.marketData.confluenceDirection === 'BUY'
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-[var(--border)] text-[var(--subtext)]'
                                    }`}>
                                      {msg.marketData.confluenceDirection} Bias
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Mini Price Chart */}
                          <div className="border-b border-[var(--border)]">
                            <MiniChart symbol={msg.marketData.symbol} height={140} />
                          </div>

                          {/* ── Gating Status Strip ── */}
                          {msg.gating && (
                            <div className={`relative px-5 py-3 flex items-center gap-3 border-b border-[var(--border)] overflow-hidden ${
                              msg.gating.outcome === 'SIGNAL' ? 'bg-gradient-to-r from-emerald-500/12 via-emerald-500/4 to-transparent'
                              : msg.gating.outcome === 'WATCH' ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/4 to-transparent'
                              : 'bg-gradient-to-r from-red-500/12 via-red-500/4 to-transparent'
                            }`}>
                              {/* Glow line */}
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                                msg.gating.outcome === 'SIGNAL' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                                : msg.gating.outcome === 'WATCH' ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                                : 'bg-gradient-to-b from-red-400 to-red-600'
                              }`} />
                              <div className="flex items-center gap-2">
                                {/* Animated pulse dot */}
                                <div className={`relative w-2 h-2 rounded-full ${
                                  msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-400'
                                  : msg.gating.outcome === 'WATCH' ? 'bg-amber-400'
                                  : 'bg-red-400'
                                }`}>
                                  {msg.gating.outcome === 'SIGNAL' && (
                                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                                  )}
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                                  msg.gating.outcome === 'SIGNAL' ? 'text-emerald-500'
                                  : msg.gating.outcome === 'WATCH' ? 'text-amber-500'
                                  : 'text-red-500'
                                }`}>
                                  {msg.gating.outcome === 'SIGNAL' ? 'SIGNAL' : msg.gating.outcome === 'WATCH' ? 'WATCH' : 'NO_TRADE'}
                                </span>
                              </div>
                              <div className={`w-[1px] h-4 ${
                                msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-500/30' : msg.gating.outcome === 'WATCH' ? 'bg-amber-500/30' : 'bg-red-500/30'
                              }`} />
                              <span className="text-[10px] text-[var(--subtext)] font-medium leading-tight flex-1">
                                {msg.gating.reason}
                              </span>
                              {/* Gate pass count badge */}
                              {msg.gating.gates && (
                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${
                                  msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-500/12 text-emerald-500'
                                  : msg.gating.outcome === 'WATCH' ? 'bg-amber-500/12 text-amber-500'
                                  : 'bg-red-500/12 text-red-500'
                                }`}>
                                  {msg.gating.gates.filter((g: any) => g.passed).length}/{msg.gating.gates.length}
                                </span>
                              )}
                            </div>
                          )}

                          {/* ── Premium Indicator Grid ── */}
                          <div className="px-5 py-3">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {/* RSI */}
                              <div className="rounded-xl bg-[var(--input-bg)] px-3.5 py-2.5 border border-[var(--border)]/60">
                                <div className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest mb-1">RSI (14)</div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className={`text-[18px] font-black font-mono leading-none ${
                                    msg.marketData.rsi !== null
                                      ? msg.marketData.rsi < 30 ? 'text-green-500' : msg.marketData.rsi > 70 ? 'text-red-500' : 'text-[var(--text)]'
                                      : 'text-[var(--subtext)]'
                                  }`}>
                                    {msg.marketData.rsi !== null ? msg.marketData.rsi.toFixed(1) : '—'}
                                  </span>
                                  {msg.marketData.rsi !== null && (
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      msg.marketData.rsi < 30 ? 'bg-green-500/10 text-green-500'
                                      : msg.marketData.rsi > 70 ? 'bg-red-500/10 text-red-500'
                                      : msg.marketData.rsi < 45 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-[var(--border)] text-[var(--subtext)]'
                                    }`}>
                                      {msg.marketData.rsi < 30 ? 'Oversold' : msg.marketData.rsi > 70 ? 'Overbought' : msg.marketData.rsi < 45 ? 'Weak' : 'Neutral'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* MACD */}
                              <div className="rounded-xl bg-[var(--input-bg)] px-3.5 py-2.5 border border-[var(--border)]/60">
                                <div className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest mb-1">MACD</div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className={`text-[18px] font-black font-mono leading-none ${
                                    msg.marketData.macdHistogram !== null
                                      ? msg.marketData.macdHistogram > 0 ? 'text-green-500' : 'text-red-500'
                                      : 'text-[var(--subtext)]'
                                  }`}>
                                    {msg.marketData.macdHistogram !== null ? (msg.marketData.macdHistogram > 0 ? '+' : '') + msg.marketData.macdHistogram.toFixed(2) : '—'}
                                  </span>
                                  {msg.marketData.macdHistogram !== null && (
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      msg.marketData.macdHistogram > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                      {msg.marketData.macdHistogram > 0 ? 'Bullish' : 'Bearish'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* EMA 50 */}
                              <div className="rounded-xl bg-[var(--input-bg)] px-3.5 py-2.5 border border-[var(--border)]/60">
                                <div className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest mb-1">EMA (50)</div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[15px] font-black font-mono leading-none text-[var(--text)]">
                                    {msg.marketData.ema50 !== null ? `$${msg.marketData.ema50 > 999 ? msg.marketData.ema50.toLocaleString('en-US', {maximumFractionDigits: 0}) : msg.marketData.ema50.toFixed(4)}` : '—'}
                                  </span>
                                  {msg.marketData.ema50 !== null && msg.marketData.price > 0 && (
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      msg.marketData.price > msg.marketData.ema50 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                      {msg.marketData.price > msg.marketData.ema50 ? 'Above' : 'Below'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ATR */}
                              <div className="rounded-xl bg-[var(--input-bg)] px-3.5 py-2.5 border border-[var(--border)]/60">
                                <div className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest mb-1">ATR (14)</div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[18px] font-black font-mono leading-none text-[var(--text)]">
                                    {msg.marketData.atr !== null ? msg.marketData.atr.toFixed(2) : '—'}
                                  </span>
                                  <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--border)]">
                                    Volatility
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* HTF Bias + News Row */}
                            <div className="flex items-center gap-2">
                              {msg.gating && (
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                  msg.marketData.confluenceDirection === 'BUY'
                                    ? 'bg-green-500/8 text-green-500 border-green-500/15'
                                    : msg.marketData.confluenceDirection === 'SELL'
                                    ? 'bg-red-500/8 text-red-500 border-red-500/15'
                                    : 'bg-[var(--input-bg)] text-[var(--subtext)] border-[var(--border)]'
                                }`}>
                                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d={msg.marketData.confluenceDirection === 'SELL' ? "M12 5v14M19 12l-7 7-7-7" : "M12 19V5M5 12l7-7 7 7"} strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  4H {msg.marketData.confluenceDirection === 'BUY' ? 'Bullish' : msg.marketData.confluenceDirection === 'SELL' ? 'Bearish' : 'Neutral'}
                                </div>
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                msg.marketData.newsSentiment === 'BULLISH' ? 'bg-green-500/8 text-green-500 border-green-500/15'
                                : msg.marketData.newsSentiment === 'BEARISH' ? 'bg-red-500/8 text-red-500 border-red-500/15'
                                : 'bg-[var(--input-bg)] text-[var(--subtext)] border-[var(--border)]'
                              }`}>
                                📰 {msg.marketData.newsSentiment || 'NEUTRAL'}
                              </span>

                              {/* ── Astro Gate Chip ── */}
                              {msg.astroGate && (
                                <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                  !msg.astroGate.allowed
                                    ? 'bg-red-500/8 text-red-400 border-red-500/20'
                                    : msg.astroGate.lotMultiplier < 1
                                    ? 'bg-amber-500/8 text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {msg.astroGate.statusLine}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ── SMC Pattern Tags + Gate Checklist ── */}
                          {(msg.gating?.smcPatterns?.length || msg.gating?.gates?.length) ? (
                            <div className="px-5 py-3 border-t border-[var(--border)] space-y-3">
                              {/* SMC Tags */}
                              {msg.gating?.smcPatterns && msg.gating.smcPatterns.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[8px] font-black text-[var(--subtext)] uppercase tracking-[0.15em] mr-0.5">SMC</span>
                                  {msg.gating.smcPatterns.map((p: string, i: number) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wide">
                                      <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Gate Checklist */}
                              {msg.gating?.gates && msg.gating.gates.length > 0 && (
                                <details className="group">
                                  <summary className="flex items-center gap-2 cursor-pointer select-none list-none">
                                    {/* Mini gate bar */}
                                    <div className="flex gap-0.5 items-center">
                                      {msg.gating.gates.map((g: any, gi: number) => (
                                        <div key={gi} className={`h-2 w-2 rounded-sm ${
                                          g.passed ? 'bg-emerald-500' : 'bg-red-500/60'
                                        }`} />
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-semibold text-[var(--subtext)] group-open:text-[var(--text)] transition-colors">
                                      {msg.gating.gates.filter((g: any) => g.passed).length}/{msg.gating.gates.length} gates passed
                                    </span>
                                    <svg className="w-3 h-3 text-[var(--subtext)] transition-transform group-open:rotate-90 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {msg.gating.gates.map((gate: any, gi: number) => {
                                      const isAstroGate = ['Lunar Alignment','Planetary Aspect','Mercury Risk','Eclipse / VOC Block','Seasonal Cycle'].includes(gate.name);
                                      return (
                                      <div key={gi} className={`relative flex items-start gap-2.5 pl-3 pr-3 py-2 rounded-xl overflow-hidden ${
                                        gate.passed
                                          ? isAstroGate ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-emerald-500/5 border border-emerald-500/10'
                                          : 'bg-red-500/5 border border-red-500/10'
                                      }`}>
                                        {/* Left accent stripe */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                                          gate.passed ? (isAstroGate ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
                                        }`} />
                                        {/* Icon — planet symbol for astro gates, tick/cross for tech gates */}
                                        {(() => {
                                          const ASTRO_GATE_ICONS: Record<string, string> = {
                                            'Lunar Alignment': '☽',
                                            'Planetary Aspect': '♃',
                                            'Mercury Risk': '☿',
                                            'Eclipse / VOC Block': '◑',
                                            'Seasonal Cycle': '✦',
                                          };
                                          const astroIcon = ASTRO_GATE_ICONS[gate.name];
                                          if (astroIcon) {
                                            return (
                                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[11px] ${
                                                gate.passed
                                                  ? 'bg-amber-500/15 text-amber-400'
                                                  : 'bg-red-500/15 text-red-400'
                                              }`}>
                                                {astroIcon}
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                              gate.passed ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
                                            }`}>
                                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                {gate.passed
                                                  ? <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                                                  : <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>}
                                              </svg>
                                            </div>
                                          );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-[var(--text)]">{gate.name}</span>
                                            {['Confluence','News Event','MTF Stack'].includes(gate.name) && (
                                              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/12 text-orange-400 border border-orange-500/15">CRITICAL</span>
                                            )}
                                            {isAstroGate && (
                                              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-400 border border-amber-500/15">ASTRO</span>
                                            )}
                                          </div>
                                          <p className="text-[9px] text-[var(--subtext)] leading-relaxed mt-0.5 font-mono">{gate.detail}</p>
                                        </div>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              )}
                            </div>
                          ) : null}

                          {/* Confluence Footer + Signal Button */}
                          <div className="px-5 py-3.5 border-t border-[var(--border)] bg-gradient-to-r from-[var(--sidebar-bg)] to-[var(--input-bg)]/30">
                            <div className="flex items-center justify-between gap-3">
                              {/* Confluence bar with glow */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-24 h-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${
                                    msg.marketData.confluenceScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                    : msg.marketData.confluenceScore >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                                    : msg.marketData.confluenceScore >= 45 ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                    : 'bg-gradient-to-r from-red-500 to-red-400'
                                  }`} style={{ width: `${msg.marketData.confluenceScore}%` }} />
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-[11px] font-black leading-none ${
                                    msg.marketData.confidenceGrade === 'AAA' ? 'text-emerald-500'
                                    : msg.marketData.confidenceGrade === 'AA' ? 'text-blue-500'
                                    : msg.marketData.confidenceGrade === 'A' ? 'text-amber-500'
                                    : 'text-[var(--subtext)]'
                                  }`}>
                                    {msg.marketData.confidenceGrade}
                                  </span>
                                  <span className="text-[9px] text-[var(--subtext)] font-mono">{msg.marketData.confluenceScore}% confluence</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Generate Signal button */}
                                {msg.signalSymbol && !msg.ticket && (
                                  <button
                                    onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(180,145,108,0.3)' }}
                                  >
                                    <Zap className="w-3 h-3" />
                                    Generate Signal
                                  </button>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Plain text response (for general chat without market data) */}
                      {msg.text && msg.text !== '__TYPING__' && !msg.marketData && (
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] px-5 py-3 rounded-[20px] max-w-full shadow-sm text-[var(--text)]">
                          {parseMarkdown(msg.text)}
                        </div>
                      )}

                      {/* Standalone signal button (no market data card) */}
                      {msg.signalSymbol && !msg.ticket && !msg.marketData && (
                        <button
                          onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                          className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl text-white text-[12px] font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(180,145,108,0.25)' }}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Generate Trade Signal
                        </button>
                      )}

                      {msg.ticket && (
                        <TradeTicket
                          ticket={msg.ticket}
                          onConfirm={async () => {
                            const res = await fetch('/api/execute', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                brokerId: activeBrokerId,
                                symbol: msg.ticket!.apiSymbol || msg.ticket!.symbol,
                                action: msg.ticket!.action,
                                volume: msg.ticket!.lotVolume,
                                entryPrice: msg.ticket!.entryPrice,
                                stopLoss: msg.ticket!.stopLoss,
                                takeProfit: msg.ticket!.takeProfit,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              onTradeExecuted?.({ orderId: data.orderId, fillPrice: data.fillPrice, ticket: msg.ticket });
                              return { orderId: data.orderId, fillPrice: data.fillPrice };
                            }
                            throw new Error(data.error || 'Execution failed');
                          }}
                          onManagerExecute={() => {
                            const sym = msg.ticket!.apiSymbol || msg.ticket!.symbol;
                            const brokerSym = sym.replace('/', '').replace('.sc', '');
                            setPendingSignal({
                              symbol: brokerSym,
                              apiSymbol: sym,
                              direction: msg.ticket!.action as 'BUY' | 'SELL',
                              entryPrice: parseFloat(msg.ticket!.entryPrice) || 0,
                              stopLoss: parseFloat(msg.ticket!.stopLoss) || 0,
                              takeProfit: parseFloat(msg.ticket!.takeProfit) || 0,
                              lotSize: parseFloat(msg.ticket!.lotVolume) || 0.01,
                              confluenceScore: msg.marketData!.confluenceScore,
                              confidenceGrade: msg.marketData!.confidenceGrade,
                              smcPatterns: msg.gating?.smcPatterns || [],
                              analysis: msg.text || '',
                              rrRatio: msg.ticket!.rrRatio || '1:2',
                              risk: msg.ticket!.risk || '0',
                              profit: msg.ticket!.profit || '0',
                              timestamp: Date.now(),
                            });
                            onOpenManager?.();
                          }}
                        />
                      )}

                    </div>
                  </div>
                );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Footer */}
      <footer className="chat-input-wrapper shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form onSubmit={handleSend} className="chat-input-container shadow-sm">
            <button
              type="button"
              onClick={onOpenManager}
              className="mgr-chat-btn"
              aria-label="Open Manager"
            >
              <svg className="mgr-chat-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Chat with TradeGPT"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-[15px] resize-none max-h-32 no-scrollbar text-[var(--text)] placeholder-[var(--subtext)]/50"
            />
            <div className="flex items-center space-x-1 pb-1">
              <button
                type="button"
                onClick={toggleSpeechToText}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                  isListening 
                    ? 'text-red-500 bg-red-500/15 shadow-md shadow-red-500/20 scale-110 animate-pulse' 
                    : 'text-[var(--subtext)] hover:opacity-80'
                }`}
                aria-label="Voice input"
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
              <button
                type="submit"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--send-btn)] text-[var(--send-icon)] shadow-md active:scale-90 hover:opacity-90 transition shrink-0"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}

// ── Markdown Parser Utilities ──────────────────────────────
function parseMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const cleanLine = line.trim();
    if (cleanLine.startsWith('###')) {
      const headerText = cleanLine.replace('###', '').trim();
      const hasRobot = headerText.includes('🤖') || headerText.includes('🤖') || headerText.toLowerCase().includes('agent');
      const cleanText = headerText.replace(/🤖/g, '').trim();
      return (
        <h3 key={idx} className="text-[10px] font-bold text-[var(--subtext)] mt-4 mb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
          {hasRobot && (
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2zM9 9h.01M15 9h.01M8 14h8" />
            </svg>
          )}
          <span>{cleanText}</span>
        </h3>
      );
    }
    if (cleanLine.startsWith('*')) {
      const content = cleanLine.replace(/^\*\s*/, '');
      return (
        <div key={idx} className="text-[12.5px] leading-relaxed pl-3.5 border-l-2 my-2.5 text-[var(--text)] opacity-90" style={{ borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>
          {formatBulletContent(content)}
        </div>
      );
    }
    if (cleanLine === '') {
      return <div key={idx} className="h-1.5" />;
    }
    return (
      <p key={idx} className="text-[13px] leading-relaxed text-[var(--text)] opacity-90 my-1.5">
        {parseInlineMarkdown(cleanLine)}
      </p>
    );
  });
}

function formatBulletContent(content: string) {
  const colonIndex = content.indexOf(':');
  if (colonIndex !== -1) {
    const header = content.substring(0, colonIndex).trim();
    const body = content.substring(colonIndex + 1);
    const cleanHeader = header.replace(/\*\*|^\*|\*$/g, '').trim();
    return (
      <>
        <strong className="font-bold text-[var(--text)] mr-1">{cleanHeader}:</strong>
        {parseInlineMarkdown(body)}
      </>
    );
  }
  return parseInlineMarkdown(content);
}

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-[var(--text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
