'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, ArrowUp, TrendingUp, Zap, Sparkles, Search, ClipboardList } from 'lucide-react';
import { ChatMessage } from '../types';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useSearchParams } from 'next/navigation';
import WatchlistStrip from './terminal/WatchlistStrip';
import AssetsSearchModal from './terminal/AssetsSearchModal';
import NewsTicker from './terminal/NewsTicker';
import WelcomeScreen from './terminal/WelcomeScreen';
import ChatFeed from './terminal/ChatFeed';
import { createClient } from '@/lib/supabase/client';

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
  activeBrokerId: string;
  allowedSymbols?: string[];
  onTradeExecuted?: (result: { orderId: string; fillPrice?: number; ticket: any }) => void;
  onOpenManager?: () => void;
  onSwitchTab?: (tab: string) => void;
}

const COMMANDS = [
  { name: '/analyze', desc: 'Perform multi-agent technical analysis', usage: '/analyze [symbol]', example: '/analyze EURUSD' },
  { name: '/signal', desc: 'Generate trade signal and ticket', usage: '/signal [symbol]', example: '/signal Gold' },

  { name: '/watchlist', desc: 'List active permitted instruments', usage: '/watchlist' },
  { name: '/clear', desc: 'Clear conversation history', usage: '/clear' },
];

const QUICK_ACTIONS = [
  { label: 'Analyze Gold', prompt: '/analyze Gold', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> },
  { label: 'Signal EURUSD', prompt: '/signal EURUSD', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },

  { label: 'SMC QQQ', prompt: '/analyze QQQ', icon: <Search className="w-3.5 h-3.5 text-blue-500" /> },
  { label: 'Watchlist', prompt: '/watchlist', icon: <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> },
];

export default function TerminalTab({
  messages,
  onSendMessage,
  onGenerateSignal,
  activeBrokerId,
  allowedSymbols,
  onTradeExecuted,
  onOpenManager,
  onSwitchTab,
}: TerminalTabProps) {
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isFree, setIsFree] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .maybeSingle();
          if (data?.plan) {
            setIsFree(data.plan === 'free' || data.plan === 'starter');
          }
        }
      } catch (e) {
        console.error('Failed to load profile for plan check:', e);
      }
    };
    loadProfile();
  }, []);

  // Permitted instruments browser modal
  const [showAssetsModal, setShowAssetsModal] = useState(false);

  // Live news state
  const [news, setNews] = useState<any[]>([]);

  // Speech to text integration
  const { isListening, toggleSpeechToText } = useSpeechToText((transcript) => {
    setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
  });

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

  const filteredCommands = COMMANDS.filter((cmd) =>
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
      <WatchlistStrip
        allowedSymbols={allowedSymbols}
        onSelectSymbol={onSendMessage}
        onOpenAssetsModal={() => setShowAssetsModal(true)}
      />

      {/* Live News Ticker Strip */}
      <NewsTicker news={news} />

      {/* Chat Feed or Welcome Greeting */}
      {messages.length === 0 ? (
        <WelcomeScreen
          onGenerateSignal={onGenerateSignal}
          onSendMessage={onSendMessage}
        />
      ) : (
        <ChatFeed
          messages={messages}
          onGenerateSignal={onGenerateSignal}
          activeBrokerId={activeBrokerId}
          onTradeExecuted={onTradeExecuted}
          onOpenManager={onOpenManager}
          isFree={isFree}
          onSwitchTab={onSwitchTab}
        />
      )}

      <footer className="chat-input-wrapper shrink-0">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-0 relative">
          {/* Floating Command Autocomplete Menu */}
          {showCommandMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-3 max-w-lg bg-[var(--sidebar-bg)]/92 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden z-50 animate-in slide-in-from-bottom-3 duration-250">
              <div className="px-4 py-2.5 border-b border-[var(--border)]/50 bg-[var(--input-bg)]/60 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--subtext)]">
                  Terminal Commands
                </span>
                <span className="text-[9px] text-[var(--subtext)]/70 font-mono">
                  Use ↑ ↓ and Enter to select
                </span>
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
                      <span className="text-xs font-mono font-black text-[var(--accent)]">
                        {cmd.name}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--subtext)] opacity-70">
                        {cmd.usage}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--subtext)] mt-0.5 leading-normal">
                      {cmd.desc}
                    </span>
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--sidebar-bg)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/8 text-[var(--text)] transition-all duration-200 active:scale-95 shrink-0 shadow-sm cursor-pointer select-none"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSend}
            className="chat-input-container shadow-sm transition-all duration-300"
          >
            <button
              type="button"
              onClick={onOpenManager}
              className="mgr-chat-btn"
              aria-label="Open Manager"
            >
              <svg
                className="mgr-chat-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              placeholder="Chat with HeroPips AI"
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
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-slate-950 shadow-md active:scale-90 hover:opacity-90 transition shrink-0"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </footer>

      <AssetsSearchModal
        isOpen={showAssetsModal}
        onClose={() => setShowAssetsModal(false)}
        allowedSymbols={allowedSymbols}
        onSelectSymbol={onSendMessage}
      />
    </div>
  );
}
