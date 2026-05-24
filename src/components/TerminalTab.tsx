'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, ArrowUp, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import TradeTicket from './TradeTicket';

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
}

// Coin/Asset icons for analysis cards
function CoinIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase();
  if (s.includes('XAU') || s.includes('GOLD')) {
    return (
      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="10" rx="2" fill="#FFD700" opacity="0.3" stroke="#FFD700" strokeWidth="1.5"/><rect x="6" y="5" width="12" height="7" rx="1.5" fill="#FFD700" opacity="0.4" stroke="#FFD700" strokeWidth="1.5"/><rect x="9" y="2" width="6" height="5" rx="1" fill="#FFD700" opacity="0.5" stroke="#FFD700" strokeWidth="1.5"/></svg>
      </div>
    );
  }
  if (s.includes('BTC') || s.includes('BITCOIN')) {
    return (
      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
        <span className="text-lg font-bold text-orange-500">₿</span>
      </div>
    );
  }
  if (s.includes('ETH')) {
    return (
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L5 12L12 16L19 12L12 2Z" fill="#627EEA" opacity="0.4" stroke="#627EEA" strokeWidth="1.2"/><path d="M12 16L5 12L12 22L19 12L12 16Z" fill="#627EEA" opacity="0.6" stroke="#627EEA" strokeWidth="1.2"/></svg>
      </div>
    );
  }
  if (s.includes('EUR')) {
    return <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center"><span className="text-lg font-bold text-blue-400">€</span></div>;
  }
  if (s.includes('GBP')) {
    return <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center"><span className="text-lg font-bold text-blue-500">£</span></div>;
  }
  if (s.includes('JPY')) {
    return <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><span className="text-lg font-bold text-red-400">¥</span></div>;
  }
  if (s.includes('NAS') || s.includes('NASDAQ')) {
    return (
      <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 18L9 12L12 14L16 8L19 10" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="10" r="1.5" fill="#00B4D8"/></svg>
      </div>
    );
  }
  if (s.includes('US30') || s.includes('DOW')) {
    return (
      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="14" width="4" height="5" rx="1" fill="#0077B6" opacity="0.5"/><rect x="10" y="10" width="4" height="9" rx="1" fill="#0077B6" opacity="0.7"/><rect x="15" y="6" width="4" height="13" rx="1" fill="#0077B6"/></svg>
      </div>
    );
  }
  if (s.includes('OIL') || s.includes('USO')) {
    return <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center"><span className="text-lg">🛢</span></div>;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 16L10 12L13 14L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/></svg>
    </div>
  );
}

export default function TerminalTab({ messages, onSendMessage, onGenerateSignal }: TerminalTabProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

                          {/* AI Analysis Text */}
                          <div className="px-5 py-3 border-b border-[var(--border)]">
                            <p className="text-[13px] leading-relaxed text-[var(--text)] opacity-90">{msg.text}</p>
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
                            <div className="flex justify-between items-center py-2">
                              <span className="text-[11px] text-[var(--subtext)] font-medium">ATR (14)</span>
                              <span className="text-[12px] font-bold font-mono text-[var(--text)]">
                                {msg.marketData.atr !== null ? msg.marketData.atr.toFixed(2) : '—'}
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
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[10px] font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 transition-all"
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
                          {msg.text}
                        </div>
                      )}

                      {/* Standalone signal button (no market data card) */}
                      {msg.signalSymbol && !msg.ticket && !msg.marketData && (
                        <button
                          onClick={() => onGenerateSignal?.(msg.signalSymbol!)}
                          className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 transition-all"
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
