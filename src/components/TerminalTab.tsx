'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bolt, Plus, Mic, ArrowUp, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import TradeTicket from './TradeTicket';

interface TerminalTabProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onGenerateSignal?: (symbol: string) => void;
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
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                      <Bolt className="w-4 h-4 text-white" />
                    </div>

                    {/* Bot Response Content */}
                    <div className="flex-1 space-y-2">
                      {msg.text && msg.text !== '__TYPING__' && (
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] px-5 py-3 rounded-[20px] max-w-[85%] text-[15px] shadow-sm text-[var(--text)]">
                          {msg.text}
                        </div>
                      )}
                      {msg.text === '__TYPING__' && (
                        <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] px-5 py-3 rounded-[20px] max-w-[85%] shadow-sm">
                          <div className="typing-loader" />
                        </div>
                      )}
                      {msg.signalSymbol && !msg.ticket && (
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
