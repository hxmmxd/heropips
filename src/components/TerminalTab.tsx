'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, ArrowUp, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import TradeTicket from './TradeTicket';
import dynamic from 'next/dynamic';

const MiniChart = dynamic(() => import('./MiniChart'), { ssr: false });

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
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

export default function TerminalTab({ messages, onSendMessage, onGenerateSignal }: TerminalTabProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [news, setNews] = useState<any[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

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
      {/* Watchlist Strip */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest shrink-0 mr-1">Watch</span>
          {WATCHLIST_ASSETS.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => onSendMessage(asset.symbol)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)] hover:border-blue-500/40 hover:bg-blue-500/5 active:scale-95 transition-all shrink-0 group"
            >
              <WatchIcon type={asset.iconType} />
              <span className="text-[11px] font-semibold text-[var(--text)] group-hover:text-blue-400 transition-colors">{asset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live News Ticker Strip */}
      {news.length > 0 && (
        <div className="shrink-0 bg-[var(--sidebar-bg)] border-b border-[var(--border)] px-4 py-2 flex items-center justify-between text-[11px] font-mono text-[var(--subtext)]">
          <div className="flex items-center gap-2 overflow-hidden mr-4 min-w-0">
            <span className="flex items-center gap-1.5 text-blue-500 font-bold tracking-wider uppercase shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              LIVE NEWS
            </span>
            <span className="text-[var(--border)] shrink-0">|</span>
            <a
              href={news[currentNewsIndex].link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text)] opacity-85 hover:opacity-100 hover:text-blue-400 truncate transition-all duration-355"
            >
              {news[currentNewsIndex].title}
            </a>
          </div>
          <span className="shrink-0 text-[10px] text-[var(--subtext)] opacity-60 ml-2">
            {news[currentNewsIndex].source}
          </span>
        </div>
      )}

      {/* Scrollable Chat Feed */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
        {messages.length === 0 ? (
          /* Initial Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10 my-auto">
            <div className="loader shrink-0" />
            <h2 className="text-2xl lg:text-3xl font-medium text-[var(--text)] px-8 leading-tight max-w-xl">
              How can I help you liquidate your account this evening?
            </h2>
          </div>
        ) : (
          /* Messages List */
          <div className="max-w-2xl mx-auto w-full space-y-6 pb-10">
            {messages.map((msg) => {
              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end px-4 mb-6">
                    <div className="bg-[var(--input-bg)] px-5 py-3 rounded-[20px] max-w-[85%] text-[15px] border border-[var(--border)] shadow-sm text-[var(--text)]">
                      {msg.text}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={msg.id} className="flex space-x-3 px-4 mb-6 animate-in slide-in-from-bottom-2">
                    {/* Bot Icon */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.95"/>
                      </svg>
                    </div>

                    {/* Bot Response Content */}
                    <div className="flex-1 space-y-2">
                      {/* Typing animation */}
                      {msg.text === '__TYPING__' && (
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] px-5 py-3 rounded-[20px] max-w-[85%] shadow-sm">
                          <div className="typing-loader" />
                        </div>
                      )}

                      {/* Rich Market Analysis Card */}
                      {msg.marketData && msg.text && msg.text !== '__TYPING__' && (
                        <div className="max-w-md border border-[var(--border)] bg-[var(--sidebar-bg)] rounded-[20px] overflow-hidden shadow-sm">
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
                              <p className="text-lg font-bold font-mono text-[var(--text)]">${msg.marketData.price.toFixed(2)}</p>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                msg.marketData.confluenceDirection === 'SELL' 
                                  ? 'bg-red-500/10 text-red-500' 
                                  : 'bg-green-500/10 text-green-500'
                              }`}>
                                {msg.marketData.confluenceDirection} Bias
                              </span>
                            </div>
                          </div>

                          {/* Mini Price Chart */}
                          <div className="border-b border-[var(--border)]">
                            <MiniChart symbol={msg.marketData.symbol} height={140} />
                          </div>

                          {/* AI Analysis Text */}
                          <div className="px-5 py-3 border-b border-[var(--border)]">
                            {parseMarkdown(msg.text)}
                          </div>

                          {/* Indicators Table */}
                          <div className="px-5 py-3 space-y-0">
                            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]/50">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">RSI (14)</span>
                              <span className={`text-[12px] font-bold font-mono ${
                                msg.marketData.rsi !== null
                                  ? msg.marketData.rsi < 30 ? 'text-green-500' : msg.marketData.rsi > 70 ? 'text-red-500' : 'text-[var(--text)]'
                                  : 'text-[var(--subtext)]'
                              }`}>
                                {msg.marketData.rsi !== null ? msg.marketData.rsi.toFixed(1) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]/50">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">MACD Histogram</span>
                              <span className={`text-[12px] font-bold font-mono ${
                                msg.marketData.macdHistogram !== null
                                  ? msg.marketData.macdHistogram > 0 ? 'text-green-500' : 'text-red-500'
                                  : 'text-[var(--subtext)]'
                              }`}>
                                {msg.marketData.macdHistogram !== null ? msg.marketData.macdHistogram.toFixed(4) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]/50">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">EMA (50)</span>
                              <span className="text-[12px] font-bold font-mono text-[var(--text)]">
                                {msg.marketData.ema50 !== null ? `$${msg.marketData.ema50.toFixed(2)}` : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]/50">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">ATR (14)</span>
                              <span className="text-[12px] font-bold font-mono text-[var(--text)]">
                                {msg.marketData.atr !== null ? msg.marketData.atr.toFixed(2) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">News Sentiment</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                msg.marketData.newsSentiment === 'BULLISH' ? 'bg-green-500/15 text-green-500'
                                : msg.marketData.newsSentiment === 'BEARISH' ? 'bg-red-500/15 text-red-500'
                                : 'bg-[var(--border)] text-[var(--subtext)]'
                              }`}>
                                {msg.marketData.newsSentiment || 'NEUTRAL'}
                              </span>
                            </div>
                          </div>

                          {/* Confluence Footer + Signal Button */}
                          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-[var(--input-bg)] overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  msg.marketData.confluenceScore >= 90 ? 'bg-green-500 w-[95%]'
                                  : msg.marketData.confluenceScore >= 80 ? 'bg-blue-500 w-[82%]'
                                  : msg.marketData.confluenceScore >= 70 ? 'bg-yellow-500 w-[72%]'
                                  : 'bg-gray-400 w-[50%]'
                                }`} style={{ width: `${msg.marketData.confluenceScore}%` }} />
                              </div>
                              <span className={`text-[10px] font-bold ${
                                msg.marketData.confidenceGrade === 'AAA' ? 'text-green-500'
                                : msg.marketData.confidenceGrade === 'AA' ? 'text-blue-500'
                                : msg.marketData.confidenceGrade === 'A' ? 'text-yellow-500'
                                : 'text-[var(--subtext)]'
                              }`}>
                                {msg.marketData.confidenceGrade} · {msg.marketData.confluenceScore}%
                              </span>
                            </div>
                            {msg.signalSymbol && !msg.ticket && (
                              <button
                                onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap shrink-0"
                              >
                                <Zap className="w-3 h-3" />
                                Generate Signal
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Plain text response (for general chat without market data) */}
                      {msg.text && msg.text !== '__TYPING__' && !msg.marketData && (
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] px-5 py-3 rounded-[20px] max-w-[85%] text-[15px] shadow-sm text-[var(--text)]">
                          {parseMarkdown(msg.text)}
                        </div>
                      )}

                      {/* Standalone signal button (no market data card) */}
                      {msg.signalSymbol && !msg.ticket && !msg.marketData && (
                        <button
                          onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                          className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 transition-all whitespace-nowrap shrink-0"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Generate Trade Signal
                        </button>
                      )}

                      {msg.ticket && <TradeTicket ticket={msg.ticket} />}
                    </div>
                  </div>
                );
              }
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Footer */}
      <footer className="chat-input-wrapper shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form onSubmit={handleSend} className="chat-input-container shadow-sm">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center text-[var(--subtext)] hover:opacity-80 transition"
              aria-label="Add file"
            >
              <Plus className="w-5 h-5" />
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
                className="w-8 h-8 flex items-center justify-center text-[var(--subtext)] hover:opacity-80 transition"
                aria-label="Voice input"
              >
                <Mic className="w-5 h-5" />
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
      return (
        <h3 key={idx} className="text-[11px] font-bold text-[var(--subtext)] mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-widest">
          {cleanLine.replace('###', '').trim()}
        </h3>
      );
    }
    if (cleanLine.startsWith('*')) {
      const content = cleanLine.replace(/^\*\s*/, '');
      return (
        <div key={idx} className="text-[12.5px] leading-relaxed pl-3.5 border-l border-blue-500/40 my-2.5 text-[var(--text)] opacity-90">
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
