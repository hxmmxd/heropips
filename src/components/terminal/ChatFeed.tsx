'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Zap } from 'lucide-react';
import { ChatMessage } from '../../types';
import { parseMarkdown } from '@/utils/markdownParser';
import { useSignal } from '@/contexts/SignalContext';
import { useLivePrices } from '@/hooks/useLivePrices';
import AstroActivationBody from './AstroActivationBody';
import { CoinIcon } from './AssetIcons';
import TradeTicket from '../TradeTicket';

const MiniChart = dynamic(() => import('../MiniChart'), { ssr: false });

interface ChatFeedProps {
  messages: ChatMessage[];
  astroMode: boolean;
  onGenerateSignal?: (symbol: string) => void;
  activeBrokerId: string;
  onTradeExecuted?: (result: { orderId: string; fillPrice?: number; ticket: any }) => void;
  onOpenManager?: () => void;
  isFree?: boolean;
  onSwitchTab?: (tab: string) => void;
}

export default function ChatFeed({
  messages,
  astroMode,
  onGenerateSignal,
  activeBrokerId,
  onTradeExecuted,
  onOpenManager,
  isFree,
  onSwitchTab,
}: ChatFeedProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getPrice } = useLivePrices();
  const { setPendingSignal } = useSignal();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-8">
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

          // Check if this is a quota limit reached notice
          const isLimitReached = msg.text && (
            msg.text.includes("Daily Signal Limit Reached") || 
            msg.text.includes("Daily Chat Limit Reached")
          );

          if (isLimitReached && msg.text) {
            const isSignalLimit = msg.text.includes("Signal Limit");
            const cardTitle = isSignalLimit ? "Daily Signal Limit Reached" : "Daily Chat Limit Reached";
            const cardDescription = isSignalLimit 
              ? "You have reached your daily limit of 3 trade signals on the Free plan. Please upgrade to the Premium (Pro) plan to generate unlimited trade signals!"
              : "You have reached your daily limit of 2,500 AI response tokens on the Free plan. Please upgrade to the Premium (Pro) plan to unlock unlimited chat analysis!";
            const quotaLabel = isSignalLimit ? "Daily Signals Limit" : "Daily Token Limit";
            const quotaValue = isSignalLimit ? "3 / 3 (100% Used)" : "2,500 / 2,500 (100% Used)";

            return (
              <div key={msg.id} className="flex px-4 mb-6 w-full animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-full max-w-md bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-[16px] shadow-lg overflow-hidden p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--subtext)]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text)]">
                        {cardTitle}
                      </h3>
                      <p className="text-[11px] text-[var(--subtext)]">
                        Free tier daily usage quota
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text)]/85 leading-relaxed">
                    {cardDescription}
                  </p>

                  {/* Quota Progress */}
                  <div className="bg-[var(--input-bg)]/40 rounded-xl p-3 border border-[var(--border)]/40">
                    <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-[var(--subtext)]">
                      <span>{quotaLabel}</span>
                      <span className="font-semibold text-[var(--text)]">{quotaValue.replace(" (100% Used)", "")}</span>
                    </div>
                    <div className="w-full h-1 bg-[var(--border)]/50 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--text)]/30 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => {
                        if (onSwitchTab) {
                          onSwitchTab('subscription');
                        } else {
                          document.querySelector('[data-tab="subscription"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-[var(--bg)] font-bold text-xs transition-all duration-200 active:scale-98 cursor-pointer shadow-sm"
                    >
                      Upgrade to Premium
                    </button>
                    <span className="text-[10px] text-[var(--subtext)]">
                      Unlock unlimited usage
                    </span>
                  </div>
                </div>
              </div>
            );
          }

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
                  <div className="astro-typing-orbit-wrap shrink-0">
                    <svg className="astro-typing-orbit-svg" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="3 2" />
                      <circle cx="24" cy="24" r="3" fill="rgba(245,158,11,0.6)">
                        <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle r="2.5" fill="#fbbf24">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M24,6 A18,18 0 1,1 23.99,6" />
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      <circle r="1.2" fill="#38bdf8" opacity="0.8">
                        <animateMotion dur="4s" repeatCount="indefinite" path="M24,6 A18,18 0 1,1 23.99,6" begin="-1.5s" />
                      </circle>
                    </svg>
                  </div>
                ) : (
                  <div className="bot-typing-heartbeat-wrap shrink-0">
                    <svg className="bot-typing-heartbeat-svg" viewBox="0 0 64 48">
                      <polyline className="bot-hb-back" points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" />
                      <polyline className="bot-hb-front" points="0.157 23.954, 14 23.954, 21.843 48, 43 0, 50 24, 64 24" />
                    </svg>
                  </div>
                )
              )}
              {/* Response Content */}
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
                    {/* Header */}
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

                    {/* Chart */}
                    <div className="border-b border-[var(--border)]">
                      <MiniChart symbol={msg.marketData.symbol} height={140} />
                    </div>

                    {/* Gating Status */}
                    {msg.gating && (
                      <div className={`relative px-5 py-3 flex items-center gap-3 border-b border-[var(--border)] overflow-hidden ${
                        msg.gating.outcome === 'SIGNAL' ? 'bg-gradient-to-r from-emerald-500/12 via-emerald-500/4 to-transparent'
                        : msg.gating.outcome === 'WATCH' ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/4 to-transparent'
                        : msg.gating.outcome === 'SHADOW' ? 'bg-gradient-to-r from-blue-500/12 via-blue-500/4 to-transparent'
                        : 'bg-gradient-to-r from-red-500/12 via-red-500/4 to-transparent'
                      }`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                          msg.gating.outcome === 'SIGNAL' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                          : msg.gating.outcome === 'WATCH' ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                          : msg.gating.outcome === 'SHADOW' ? 'bg-gradient-to-b from-blue-400 to-blue-600'
                          : 'bg-gradient-to-b from-red-400 to-red-600'
                        }`} />
                        <div className="flex items-center gap-2">
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

                    {/* Indicator Matrix */}
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
                            1H {msg.marketData.confluenceDirection === 'BUY' ? 'Bullish' : msg.marketData.confluenceDirection === 'SELL' ? 'Bearish' : 'Neutral'}
                          </div>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${
                          msg.marketData.newsSentiment === 'BULLISH' ? 'bg-green-500/8 text-green-500 border-green-500/15'
                          : msg.marketData.newsSentiment === 'BEARISH' ? 'bg-red-500/8 text-red-500 border-red-500/15'
                          : 'bg-[var(--input-bg)] text-[var(--subtext)] border-[var(--border)]'
                        }`}>
                          📰 {msg.marketData.newsSentiment || 'NEUTRAL'}
                        </span>

                        {/* Astro Gate */}
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

                        {/* Risk Governor */}
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

                    {/* Checklist & Patterns */}
                    {(msg.gating?.smcPatterns?.length || msg.gating?.gates?.length) ? (
                      <div className="px-5 py-3 border-t border-[var(--border)] space-y-3">
                        {/* SMC */}
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

                        {/* Gates */}
                        {msg.gating?.gates && msg.gating.gates.length > 0 && (
                          <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer select-none list-none">
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
                                    <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                                      gate.passed ? (isRiskGate ? 'bg-violet-500' : isAstroGate ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
                                    }`} />
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

                    {/* Footer / Generate Signal */}
                    <div className="px-5 py-3.5 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-20 h-2.5 rounded-full bg-[var(--input-bg)] overflow-hidden shrink-0 border border-[var(--border)]/40 shadow-inner">
                            <div className={`h-full rounded-full transition-all ${
                              msg.marketData.confluenceScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                              : msg.marketData.confluenceScore >= 65 ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                              : msg.marketData.confluenceScore >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`} style={{ width: `${msg.marketData.confluenceScore}%` }} />
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                              msg.marketData.confidenceGrade === 'AAA' ? 'bg-emerald-500/12 text-emerald-500 border border-emerald-500/20'
                              : msg.marketData.confidenceGrade === 'AA' ? 'bg-blue-500/12 text-blue-500 border border-blue-500/20'
                              : msg.marketData.confidenceGrade === 'A' ? 'bg-blue-500/12 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/12 text-amber-500 border border-amber-500/20'
                            }`}>
                              {msg.marketData.confidenceGrade}
                            </span>
                            <span className="text-[11px] font-bold text-[var(--subtext)] font-mono whitespace-nowrap truncate">
                              {msg.marketData.confluenceScore}% {msg.marketData.confluenceScore < 65 ? 'Moderate Confidence' : 'Confidence'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {msg.signalSymbol && !msg.ticket && (
                            (msg.gating?.outcome === 'SIGNAL' || msg.gating?.outcome === 'WATCH' || msg.marketData.confluenceScore >= 50) ? (
                              <button
                                onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all whitespace-nowrap cursor-pointer ${
                                  msg.marketData.confluenceScore < 65
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-950/20 border border-amber-400/30'
                                    : ''
                                }`}
                                style={msg.marketData.confluenceScore >= 65 ? { background: 'var(--accent)', boxShadow: '0 4px 14px rgba(180,145,108,0.3)' } : {}}
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                Generate Signal
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 bg-slate-800/80 text-[11px] font-black uppercase tracking-wider cursor-not-allowed whitespace-nowrap border border-slate-700/50"
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

                {/* Plain Text & Screener Cards */}
                {msg.text && msg.text !== '__TYPING__' && !msg.marketData && (
                  <div className="max-w-full px-2 py-1 text-[14px] leading-relaxed text-[var(--text)]">
                    {parseMarkdown(msg.text)}

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

                {/* Standalone Signal Button */}
                {msg.signalSymbol && !msg.ticket && !msg.marketData && (
                  <button
                    onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                    className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl text-white text-[12px] font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all whitespace-nowrap shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(180,145,108,0.25)' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Generate Trade Signal
                  </button>
                )}

                {/* Trade Ticket */}
                {msg.ticket && (
                  <TradeTicket
                    ticket={msg.ticket}
                    isFree={isFree}
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
    </div>
  );
}
