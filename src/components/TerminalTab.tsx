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

import AstroActivationBody from './terminal/AstroActivationBody';
import { CoinIcon, WatchIcon } from './terminal/AssetIcons';
import AstroWelcomeStatus from './terminal/AstroWelcomeStatus';

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
  activeBrokerId: string;
  allowedSymbols?: string[];
  onTradeExecuted?: (result: { orderId: string; fillPrice?: number; ticket: any }) => void;
  onOpenManager?: () => void;
  astroMode?: boolean;
}

// Star particle positions (fixed, no random on render)





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



const COMMANDS = [
  { name: '/analyze', desc: 'Perform multi-agent technical analysis', usage: '/analyze [symbol]', example: '/analyze EURUSD' },
  { name: '/signal', desc: 'Generate trade signal and ticket', usage: '/signal [symbol]', example: '/signal Gold' },
  { name: '/astro', desc: 'Check celestial parameters and LOT multiplier', usage: '/astro [symbol]', example: '/astro BTCUSD' },
  { name: '/watchlist', desc: 'List active permitted instruments', usage: '/watchlist' },
  { name: '/clear', desc: 'Clear conversation history', usage: '/clear' },
];

const QUICK_ACTIONS = [
  { label: 'Analyze Gold', prompt: '/analyze Gold', icon: '📈' },
  { label: 'Signal EURUSD', prompt: '/signal EURUSD', icon: '⚡' },
  { label: 'Astro BTCUSD', prompt: '/astro BTCUSD', icon: '🔮' },
  { label: 'SMC QQQ', prompt: '/analyze QQQ', icon: '🔍' },
  { label: 'Watchlist', prompt: '/watchlist', icon: '📋' },
];

export default function TerminalTab({ messages, onSendMessage, onGenerateSignal, activeBrokerId, allowedSymbols, onTradeExecuted, onOpenManager, astroMode: astroModeProp }: TerminalTabProps) {
  // Allow ?astro=1 URL param to test animation without wiring the header toggle
  const searchParams = useSearchParams();
  const astroMode = astroModeProp ?? searchParams.get('astro') === '1';
  const [inputValue, setInputValue] = useState('');
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setPendingSignal } = useSignal();

  // Permitted instruments browser modal
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');

  // Reset search when modal closes
  useEffect(() => {
    if (!showAssetsModal) {
      setBrowseSearch('');
    }
  }, [showAssetsModal]);

  const symbolsToBrowse = allowedSymbols && allowedSymbols.length > 0
    ? allowedSymbols
    : WATCHLIST_ASSETS.map(a => a.symbol);

  const filteredBrowseSymbols = symbolsToBrowse
    .filter(sym => sym.toLowerCase().includes(browseSearch.toLowerCase()))
    .slice(0, 100);

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

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().startsWith(inputValue.toLowerCase())
  );

  const showCommandMenu = inputValue.startsWith('/') && filteredCommands.length > 0;

  // Reset selected index when filtered list changes
  useEffect(() => {
    setActiveCommandIndex(0);
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCommandIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[activeCommandIndex];
        setInputValue(cmd.name + ' ');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
        return;
      }
    }

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

          {/* Allowed Instruments Modal Trigger */}
          <button
            onClick={() => setShowAssetsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-95 transition-all text-[11px] font-bold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer shrink-0"
          >
            <span>🌐 {allowedSymbols && allowedSymbols.length > 0 ? `${allowedSymbols.length} Assets` : 'Default Assets'}</span>
          </button>

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
                  {
                    label: 'Gold signal',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12L6.5 8h11L20 12v7H4v-7z" fill="#f59e0b"/>
                        <path d="M4 12L6.5 8h11L20 12H4z" fill="#fcd34d"/>
                        <path d="M5.5 13h4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round"/>
                        <path d="M7 15.5h10M7 17.5h10" stroke="#92400e" strokeWidth="0.7" strokeLinecap="round" opacity="0.55"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("Gold"),
                  },
                  {
                    label: 'Bitcoin signal',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#f97316"/>
                        <path d="M9.5 8h3.5a2 2 0 0 1 0 4H9.5m0-4v4m0 0h4a2 2 0 0 1 0 4H9.5m0-4v4M9 8h.5M9 16h.5M11 6.5V8M13.5 6.5V8M11 16v1.5M13.5 16v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("Bitcoin"),
                  },
                  {
                    label: 'EUR/USD signal',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8.5" cy="12" r="5.5" fill="#dbeafe"/>
                        <circle cx="8.5" cy="12" r="5.5" stroke="#3b82f6" strokeWidth="1.3"/>
                        <path d="M6.5 10.5H10M6.5 13.5H10" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M15 8.5l4 3.5-4 3.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12H19" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("EURUSD"),
                  },
                  {
                    label: 'Lunar influence',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" fill="#0f172a"/>
                        <path d="M12 3a9 9 0 1 0 9 9A6.5 6.5 0 0 1 12 3z" fill="#94a3b8"/>
                        <circle cx="17.5" cy="5" r="0.9" fill="#fde68a"/>
                        <circle cx="5.5" cy="9" r="0.6" fill="#fde68a"/>
                        <circle cx="19.5" cy="15" r="0.55" fill="#fde68a"/>
                      </svg>
                    ),
                    action: () => onSendMessage("What is the current lunar phase influence on trading?"),
                  },
                  {
                    label: 'Mercury status',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="12" cy="15" rx="11" ry="3" fill="none" stroke="#a78bfa" strokeWidth="1.2" opacity="0.55"/>
                        <circle cx="12" cy="11" r="6" fill="#7c3aed"/>
                        <path d="M9 9.5a3 3 0 0 1 6 0" stroke="#ddd6fe" strokeWidth="1.1" strokeLinecap="round" opacity="0.8"/>
                        <circle cx="14.5" cy="8.5" r="1" fill="#e9d5ff" opacity="0.6"/>
                      </svg>
                    ),
                    action: () => onSendMessage("Is Mercury retrograde right now?"),
                  },
                  {
                    label: 'Full astro report',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#1e1b4b"/>
                        <path d="M12 3l2.2 6.2L21 12l-6.8 2.8L12 21l-2.2-6.2L3 12l6.8-2.8z" fill="#fbbf24"/>
                        <circle cx="12" cy="12" r="2.5" fill="white"/>
                      </svg>
                    ),
                    action: () => onSendMessage("Give me a full celestial report for today"),
                  },
                ] : [
                  {
                    label: 'Analyze XAUUSD',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12L6.5 8h11L20 12v7H4v-7z" fill="#f59e0b"/>
                        <path d="M4 12L6.5 8h11L20 12H4z" fill="#fcd34d"/>
                        <path d="M5.5 13h4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round"/>
                        <path d="M7 15.5h10M7 17.5h10" stroke="#92400e" strokeWidth="0.7" strokeLinecap="round" opacity="0.55"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("Gold"),
                  },
                  {
                    label: 'Analyze BTCUSD',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#f97316"/>
                        <path d="M9.5 8h3.5a2 2 0 0 1 0 4H9.5m0-4v4m0 0h4a2 2 0 0 1 0 4H9.5m0-4v4M9 8h.5M9 16h.5M11 6.5V8M13.5 6.5V8M11 16v1.5M13.5 16v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("Bitcoin"),
                  },
                  {
                    label: 'Analyze EUR/USD',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="8.5" cy="12" r="5.5" fill="#dbeafe"/>
                        <circle cx="8.5" cy="12" r="5.5" stroke="#3b82f6" strokeWidth="1.3"/>
                        <path d="M6.5 10.5H10M6.5 13.5H10" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M15 8.5l4 3.5-4 3.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 12H19" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("EURUSD"),
                  },
                  {
                    label: 'Market overview',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="14" width="4" height="7" rx="1" fill="#3b82f6"/>
                        <rect x="8" y="10" width="4" height="11" rx="1" fill="#10b981"/>
                        <rect x="14" y="6" width="4" height="15" rx="1" fill="#f59e0b"/>
                        <rect x="20" y="9" width="2" height="12" rx="1" fill="#6366f1"/>
                        <path d="M3 11l5-4 5 3 6-6" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ),
                    action: () => onSendMessage("Give me a market overview"),
                  },
                  {
                    label: 'My positions',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="9" width="20" height="12" rx="2" fill="#818cf8"/>
                        <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M2 14h20" stroke="#4f46e5" strokeWidth="1"/>
                        <circle cx="12" cy="14" r="1.8" fill="white"/>
                      </svg>
                    ),
                    action: () => onSendMessage("Show my open positions"),
                  },
                  {
                    label: 'Analyze NAS100',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17l5-6 4 3 5-7 4 2" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 7h4v4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="3"  cy="17" r="1.3" fill="#34d399"/>
                        <circle cx="8"  cy="11" r="1.3" fill="#34d399"/>
                        <circle cx="12" cy="14" r="1.3" fill="#34d399"/>
                        <circle cx="17" cy="7"  r="1.3" fill="#34d399"/>
                        <circle cx="21" cy="9"  r="1.3" fill="#34d399"/>
                        <rect x="1" y="20.5" width="22" height="1.5" rx="0.75" fill="#10b981" opacity="0.2"/>
                      </svg>
                    ),
                    action: () => onGenerateSignal?.("NAS100"),
                  },
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
                display: flex; align-items: center; justify-content: center;
                width: 22px; height: 22px; flex-shrink: 0;
                color: var(--accent);
                opacity: 0.85;
              }
              .wlc-card-icon svg {
                width: 18px; height: 18px;
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
                  <div key={msg.id} className="flex flex-col items-end px-4 mb-6 animate-in fade-in duration-300 slide-in-from-right-2">
                    <div className="bg-gradient-to-br from-[var(--accent)]/10 via-[var(--input-bg)] to-[var(--input-bg)] px-5.5 py-3.5 rounded-[22px] max-w-[85%] text-[14px] border border-[var(--border)] hover:border-[var(--accent)]/25 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-[var(--text)] font-semibold">
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
                              : msg.gating.outcome === 'SHADOW' ? 'bg-gradient-to-r from-blue-500/12 via-blue-500/4 to-transparent'
                              : 'bg-gradient-to-r from-red-500/12 via-red-500/4 to-transparent'
                            }`}>
                              {/* Glow line */}
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                                msg.gating.outcome === 'SIGNAL' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                                : msg.gating.outcome === 'WATCH' ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                                : msg.gating.outcome === 'SHADOW' ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                                : 'bg-gradient-to-b from-red-400 to-red-600'
                              }`} />
                              <div className="flex items-center gap-2">
                                {/* Animated pulse dot */}
                                <div className={`relative w-2 h-2 rounded-full ${
                                  msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-400'
                                  : msg.gating.outcome === 'WATCH' ? 'bg-amber-400'
                                  : msg.gating.outcome === 'SHADOW' ? 'bg-blue-400'
                                  : 'bg-red-400'
                                }`}>
                                  {msg.gating.outcome === 'SIGNAL' && (
                                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                                  )}
                                  {msg.gating.outcome === 'SHADOW' && (
                                    <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-50" />
                                  )}
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                                  msg.gating.outcome === 'SIGNAL' ? 'text-emerald-500'
                                  : msg.gating.outcome === 'WATCH' ? 'text-amber-500'
                                  : msg.gating.outcome === 'SHADOW' ? 'text-blue-400'
                                  : 'text-red-500'
                                }`}>
                                  {msg.gating.outcome === 'SIGNAL' ? 'SIGNAL' : msg.gating.outcome === 'WATCH' ? 'WATCH' : msg.gating.outcome === 'SHADOW' ? 'SHADOW' : 'NO SIGNAL'}
                                </span>
                              </div>
                              <div className={`w-[1px] h-4 ${
                                msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-500/30' : msg.gating.outcome === 'WATCH' ? 'bg-amber-500/30' : msg.gating.outcome === 'SHADOW' ? 'bg-blue-500/30' : 'bg-red-500/30'
                              }`} />
                              <span className="text-[10px] text-[var(--subtext)] font-medium leading-tight flex-1">
                                {msg.gating.reason}
                              </span>
                              {/* Gate pass count badge */}
                              {msg.gating.gates && (
                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${
                                  msg.gating.outcome === 'SIGNAL' ? 'bg-emerald-500/12 text-emerald-500'
                                  : msg.gating.outcome === 'WATCH' ? 'bg-amber-500/12 text-amber-500'
                                  : msg.gating.outcome === 'SHADOW' ? 'bg-blue-500/12 text-blue-400'
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

                              {/* ── Risk Governor Chip ── */}
                              {msg.gating?.riskSummary && (
                                <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                  msg.gating.riskSummary.includes('LIQUIDATE') || msg.gating.riskSummary.includes('halted')
                                    ? 'bg-red-500/8 text-red-400 border-red-500/20'
                                    : msg.gating.riskSummary.includes('Shadow') || msg.gating.riskSummary.includes('Sizing')
                                    ? 'bg-violet-500/8 text-violet-400 border-violet-500/20'
                                    : 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  🛡️ {msg.gating.riskSummary}
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
                                      const isRiskGate = gate.name?.startsWith('Gate 13') || gate.name?.startsWith('Gate 14') || gate.name?.startsWith('Gate 15');
                                      return (
                                      <div key={gi} className={`relative flex items-start gap-2.5 pl-3 pr-3 py-2 rounded-xl overflow-hidden ${
                                        gate.passed
                                          ? isRiskGate ? 'bg-violet-500/5 border border-violet-500/10'
                                          : isAstroGate ? 'bg-amber-500/5 border border-amber-500/10'
                                          : 'bg-emerald-500/5 border border-emerald-500/10'
                                          : 'bg-red-500/5 border border-red-500/10'
                                      }`}>
                                        {/* Left accent stripe */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                                          gate.passed ? (isRiskGate ? 'bg-violet-500' : isAstroGate ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
                                        }`} />
                                        {/* Icon — shield for risk gates, planet symbol for astro gates, tick/cross for tech gates */}
                                        {(() => {
                                          const ASTRO_GATE_ICONS: Record<string, string> = {
                                            'Lunar Alignment': '☽',
                                            'Planetary Aspect': '♃',
                                            'Mercury Risk': '☿',
                                            'Eclipse / VOC Block': '◑',
                                            'Seasonal Cycle': '✦',
                                          };
                                          const RISK_GATE_ICONS: Record<string, string> = {
                                            'Gate 13': '📈',
                                            'Gate 14': '⚡',
                                            'Gate 15': '🛡️',
                                          };
                                          const astroIcon = ASTRO_GATE_ICONS[gate.name];
                                          const riskKey = Object.keys(RISK_GATE_ICONS).find(k => gate.name?.startsWith(k));
                                          const riskIcon = riskKey ? RISK_GATE_ICONS[riskKey] : null;
                                          if (riskIcon) {
                                            return (
                                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[11px] ${
                                                gate.passed
                                                  ? 'bg-violet-500/15 text-violet-400'
                                                  : 'bg-red-500/15 text-red-400'
                                              }`}>
                                                {riskIcon}
                                              </div>
                                            );
                                          }
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
                                            {isRiskGate && (
                                              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/12 text-violet-400 border border-violet-500/15">RISK</span>
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
                                  msg.gating?.outcome === 'SIGNAL' ? (
                                    <button
                                      onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(180,145,108,0.3)' }}
                                    >
                                      <Zap className="w-3 h-3" />
                                      Generate Signal
                                    </button>
                                  ) : (
                                    <button
                                      disabled
                                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-400 bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed whitespace-nowrap shrink-0 border border-slate-700/50"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                      </svg>
                                      NO SIGNAL
                                    </button>
                                  )
                                )}

                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Plain text response (for general chat without market data) */}
                      {msg.text && msg.text !== '__TYPING__' && !msg.marketData && (
                        <div className="max-w-full px-2 py-1 text-[14px] leading-relaxed text-[var(--text)]">
                          {parseMarkdown(msg.text)}

                          {/* Screener Cards inside the message block */}
                          {msg.screenerData && msg.screenerData.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full animate-in fade-in duration-300 slide-in-from-bottom-2">
                              {msg.screenerData.map((item, idx) => {
                                const isBuy = item.confluenceDirection === 'BUY';
                                const isSell = item.confluenceDirection === 'SELL';
                                const outcomeColor = item.signalOutcome === 'SIGNAL' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                                  : item.signalOutcome === 'WATCH' ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                                  : 'border-[var(--border)] bg-[var(--input-bg)] text-[var(--subtext)]';

                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onGenerateSignal?.(item.symbol);
                                    }}
                                    className="group relative border border-[var(--border)] bg-[var(--sidebar-bg)]/60 hover:border-[var(--accent)]/45 hover:bg-[var(--accent)]/5 hover:translate-y-[-2px] transition-all duration-300 p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer select-none"
                                  >
                                    <div className="flex items-center gap-3">
                                      <CoinIcon symbol={item.displaySymbol} />
                                      <div className="text-left">
                                        <h4 className="text-sm font-black text-[var(--text)] uppercase tracking-wide group-hover:text-[var(--accent)] transition-colors">{item.displaySymbol}</h4>
                                        <span className="text-[10px] text-[var(--subtext)] font-semibold font-mono">
                                          {item.price > 0 ? `$${item.price > 999 ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : item.price.toFixed(4)}` : '—'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                        isSell ? 'bg-red-500/10 text-red-500'
                                        : isBuy ? 'bg-green-500/10 text-green-500'
                                        : 'bg-[var(--border)] text-[var(--subtext)]'
                                      }`}>
                                        {item.confluenceDirection}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] text-[var(--subtext)] font-mono">{item.confluenceScore}% ({item.confidenceGrade})</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest leading-none ${outcomeColor}`}>
                                          {item.signalOutcome}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
        <div className="max-w-4xl mx-auto px-4 py-3 relative">

          {/* Floating Command Autocomplete Menu */}
          {showCommandMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-3 max-w-lg bg-[var(--sidebar-bg)]/92 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden z-50 animate-in slide-in-from-bottom-3 duration-250">
              <div className="px-4 py-2.5 border-b border-[var(--border)]/50 bg-[var(--input-bg)]/60 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--subtext)]">Terminal Commands</span>
                <span className="text-[9px] text-[var(--subtext)]/70 font-mono">Use ↑ ↓ and Enter to select</span>
              </div>
              <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
                {filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.name}
                    onClick={() => {
                      setInputValue(cmd.name + ' ');
                      textareaRef.current?.focus();
                    }}
                    className={`flex flex-col px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                      idx === activeCommandIndex
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)]/30 shadow-[0_2px_8px_rgba(180,145,108,0.1)]'
                        : 'hover:bg-[var(--input-bg)]/60 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-[var(--accent)]">{cmd.name}</span>
                      <span className="text-[9px] font-mono text-[var(--subtext)] opacity-70">{cmd.usage}</span>
                    </div>
                    <span className="text-[10px] text-[var(--subtext)] mt-0.5 leading-normal">{cmd.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Suggestion Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 pt-1">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSendMessage(action.prompt);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-[var(--sidebar-bg)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/8 text-[var(--text)] transition-all duration-200 active:scale-95 shrink-0 shadow-sm cursor-pointer select-none"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className={`chat-input-container shadow-sm transition-all duration-300 ${
            astroMode ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.18)] bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950' : ''
          }`}>
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

      {/* Premium Glassmorphic Assets Modal */}
      {showAssetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4" onClick={() => setShowAssetsModal(false)}>
          <div className="max-w-md w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-3xl p-6 text-[var(--text)] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                🌐 Allowed Instruments
              </h3>
              <button
                onClick={() => setShowAssetsModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--input-bg)] text-[var(--subtext)] hover:text-[var(--text)] transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-[11px] text-[var(--subtext)] mb-4">
              These are the permitted instruments allowed to trade on your active account. Click any instrument to analyze it.
            </p>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                placeholder="Search stocks, forex, metals..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
                autoFocus
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto pr-1 space-y-1 no-scrollbar">
              {filteredBrowseSymbols.length > 0 ? (
                filteredBrowseSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSendMessage(sym);
                      setShowAssetsModal(false);
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--accent)]/10 text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors border border-[var(--border)] hover:border-[var(--accent)]/30 cursor-pointer"
                  >
                    {sym}
                  </button>
                ))
              ) : (
                <div className="p-4 text-xs text-[var(--subtext)] text-center">No matching assets found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Markdown Parser Utilities ──────────────────────────────
function parseMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Table detection ──
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      let hasHeader = false;
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const row = lines[i].trim();
        // Skip separator rows like |---|---|
        if (/^\|[\s\-:]+\|/.test(row) && !row.replace(/[\s|\-:]/g, '')) {
          hasHeader = tableRows.length === 1;
          i++;
          continue;
        }
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        const headerRow = hasHeader ? tableRows[0] : null;
        const bodyRows = hasHeader ? tableRows.slice(1) : tableRows;
        elements.push(
          <div key={`tbl-${i}`} style={{ overflowX: 'auto', margin: '12px 0', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              {headerRow && (
                <thead>
                  <tr>
                    {headerRow.map((cell, ci) => (
                      <th key={ci} style={{
                        padding: '8px 12px', textAlign: 'left', fontWeight: 800,
                        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: 'var(--subtext)', borderBottom: '2px solid var(--border)',
                        background: 'var(--input-bg)',
                      }}>{parseInlineMarkdown(cell)}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--input-bg)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '7px 12px', borderBottom: '1px solid var(--border)',
                        color: 'var(--text)', fontFamily: /^[\d$+\-.,% ]+$/.test(cell.trim()) ? 'ui-monospace, monospace' : 'inherit',
                      }}>{parseInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <div key={`hr-${i}`} style={{
          height: '1px', margin: '14px 0',
          background: 'linear-gradient(to right, transparent, var(--border), transparent)',
        }} />
      );
      i++;
      continue;
    }

    // ── ## Header ──
    if (trimmed.startsWith('## ') && !trimmed.startsWith('###')) {
      const headerText = trimmed.replace(/^##\s*/, '');
      elements.push(
        <h2 key={`h2-${i}`} style={{
          fontSize: '14px', fontWeight: 800, color: 'var(--text)',
          marginTop: '16px', marginBottom: '8px', paddingBottom: '6px',
          borderBottom: '1px solid var(--border)', letterSpacing: '-0.01em',
        }}>{parseInlineMarkdown(headerText)}</h2>
      );
      i++;
      continue;
    }

    // ── ### Header ──
    if (trimmed.startsWith('###')) {
      const headerText = trimmed.replace('###', '').trim();
      const hasRobot = headerText.includes('🤖') || headerText.toLowerCase().includes('agent');
      const cleanText = headerText.replace(/🤖/g, '').trim();
      elements.push(
        <h3 key={`h3-${i}`} className="text-[10px] font-bold text-[var(--subtext)] mt-4 mb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
          {hasRobot && (
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2zM9 9h.01M15 9h.01M8 14h8" />
            </svg>
          )}
          <span>{cleanText}</span>
        </h3>
      );
      i++;
      continue;
    }

    // ── Blockquote ──
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      elements.push(
        <div key={`bq-${i}`} style={{
          borderLeft: '3px solid var(--accent)', paddingLeft: '14px',
          margin: '10px 0', padding: '10px 14px',
          background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
          borderRadius: '0 10px 10px 0', fontSize: '12.5px',
          color: 'var(--text)', lineHeight: '1.6', fontStyle: 'italic',
        }}>
          {quoteLines.map((ql, qi) => <span key={qi}>{parseInlineMarkdown(ql)}{qi < quoteLines.length - 1 ? <br /> : null}</span>)}
        </div>
      );
      continue;
    }

    // ── Numbered list ──
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '8px 0', paddingLeft: '0', listStyle: 'none', counterReset: 'md-counter' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '12.5px', lineHeight: '1.6', color: 'var(--text)',
              marginBottom: '6px', opacity: 0.92,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)', fontSize: '10px', fontWeight: 800, marginTop: '1px',
              }}>{li + 1}</span>
              <span>{formatBulletContent(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Bullet list (- or *) ──
    if (/^[-*]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s*/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '8px 0', paddingLeft: '0', listStyle: 'none' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '12.5px', lineHeight: '1.6', color: 'var(--text)',
              marginBottom: '5px', opacity: 0.92,
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', marginTop: '7px', opacity: 0.6,
              }} />
              <span>{formatBulletContent(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Empty line ──
    if (trimmed === '') {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // ── Paragraph ──
    elements.push(
      <p key={`p-${i}`} style={{
        fontSize: '13px', lineHeight: '1.7', color: 'var(--text)',
        opacity: 0.92, margin: '6px 0',
      }}>{parseInlineMarkdown(trimmed)}</p>
    );
    i++;
  }

  return elements;
}

function formatBulletContent(content: string) {
  const colonIndex = content.indexOf(':');
  if (colonIndex !== -1 && colonIndex < 60) {
    const header = content.substring(0, colonIndex).trim();
    const body = content.substring(colonIndex + 1);
    const cleanHeader = header.replace(/\*\*|^\*|\*$/g, '').trim();
    return (
      <>
        <strong style={{ fontWeight: 700, color: 'var(--text)', marginRight: '4px' }}>{cleanHeader}:</strong>
        {parseInlineMarkdown(body)}
      </>
    );
  }
  return parseInlineMarkdown(content);
}

function parseInlineMarkdown(text: string) {
  // Clean up orphaned ** markers (e.g. "** Hammer" or "value **")
  let cleaned = text.replace(/\*\*\s+/g, '').replace(/\s+\*\*/g, '');
  // Also strip any remaining standalone ** that have no pair
  const starCount = (cleaned.match(/\*\*/g) || []).length;
  if (starCount % 2 !== 0) cleaned = cleaned.replace(/\*\*/, '');
  // Handle bold (**text**), italic (*text*), and inline code (`text`)
  const parts = cleaned.split(/(\*\*.*?\*\*|\*[^*]+?\*|`[^`]+?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ fontWeight: 700, color: 'var(--text)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={idx} style={{ fontStyle: 'italic', opacity: 0.85 }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} style={{
          fontFamily: 'ui-monospace, monospace', fontSize: '11.5px',
          background: 'var(--input-bg)', padding: '1px 5px', borderRadius: '4px',
          border: '1px solid var(--border)',
        }}>{part.slice(1, -1)}</code>
      );
    }
    return part;
  });
}

