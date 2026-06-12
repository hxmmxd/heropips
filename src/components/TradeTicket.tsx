'use client';

import React, { useState } from 'react';
import { TradeTicketProps } from '../types';

interface TradeTicketComponentProps {
  ticket: TradeTicketProps;
  onConfirm?: () => Promise<{ orderId: string; fillPrice: number } | null>;
  onManagerExecute?: () => void;
}

type ExecState = 'idle' | 'loading' | 'success' | 'error';

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  AAA: { bg: 'bg-green-500/15', text: 'text-green-500', label: 'AAA — Max Conviction' },
  AA:  { bg: 'bg-blue-500/15',  text: 'text-blue-500',  label: 'AA — High Probability' },
  A:   { bg: 'bg-yellow-500/15', text: 'text-yellow-500', label: 'A — Standard Setup' },
  BBB: { bg: 'bg-[var(--subtext)]/10', text: 'text-[var(--subtext)]', label: 'BBB — Low Confidence' },
};

function InstrumentIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase();
  const size = 28;

  if (s.includes('XAU') || s.includes('GOLD')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="10" width="18" height="10" rx="2" fill="#FFD700" opacity="0.2" stroke="#FFD700" strokeWidth="1.5"/>
      <rect x="6" y="5" width="12" height="7" rx="1.5" fill="#FFD700" opacity="0.3" stroke="#FFD700" strokeWidth="1.5"/>
      <rect x="9" y="2" width="6" height="5" rx="1" fill="#FFD700" opacity="0.4" stroke="#FFD700" strokeWidth="1.5"/>
    </svg>
  );
  if (s.includes('BTC') || s.includes('BITCOIN')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F7931A" opacity="0.15" stroke="#F7931A" strokeWidth="1.5"/>
      <path d="M14.5 7.5C14.5 6.5 13.5 6 12 6H9.5V9.5H12C13.5 9.5 14.5 9 14.5 7.75V7.5Z" fill="#F7931A" opacity="0.4"/>
      <path d="M15 12.5C15 11.5 14 11 12.5 11H9.5V14.5H12.5C14 14.5 15 14 15 12.75V12.5Z" fill="#F7931A" opacity="0.4"/>
    </svg>
  );
  if (s.includes('ETH')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#627EEA" opacity="0.15" stroke="#627EEA" strokeWidth="1.5"/>
      <path d="M12 3L6 12L12 15L18 12L12 3Z" fill="#627EEA" opacity="0.3" stroke="#627EEA" strokeWidth="1"/>
      <path d="M12 15L6 12L12 21L18 12L12 15Z" fill="#627EEA" opacity="0.5" stroke="#627EEA" strokeWidth="1"/>
    </svg>
  );
  if (s.includes('EUR')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#003399" opacity="0.15" stroke="#003399" strokeWidth="1.5"/>
      <text x="12" y="17" textAnchor="middle" fill="#4A90D9" fontSize="14" fontWeight="bold" fontFamily="serif">€</text>
    </svg>
  );
  if (s.includes('GBP')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1D4E89" opacity="0.15" stroke="#1D4E89" strokeWidth="1.5"/>
      <text x="12" y="17" textAnchor="middle" fill="#5B9BD5" fontSize="14" fontWeight="bold" fontFamily="serif">£</text>
    </svg>
  );
  if (s.includes('JPY')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#BC002D" opacity="0.15" stroke="#BC002D" strokeWidth="1.5"/>
      <text x="12" y="17" textAnchor="middle" fill="#E05A6D" fontSize="14" fontWeight="bold" fontFamily="serif">¥</text>
    </svg>
  );
  if (s.includes('NAS') || s.includes('NASDAQ')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#00B4D8" opacity="0.15" stroke="#00B4D8" strokeWidth="1.5"/>
      <path d="M6 18L9 12L12 14L15 8L18 10" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="18" cy="10" r="1.5" fill="#00B4D8"/>
    </svg>
  );
  if (s.includes('US30') || s.includes('DOW')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#0077B6" opacity="0.15" stroke="#0077B6" strokeWidth="1.5"/>
      <rect x="6" y="14" width="3" height="4" rx="0.5" fill="#0077B6" opacity="0.5"/>
      <rect x="10.5" y="10" width="3" height="8" rx="0.5" fill="#0077B6" opacity="0.7"/>
      <rect x="15" y="7" width="3" height="11" rx="0.5" fill="#0077B6"/>
    </svg>
  );
  if (s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#2D2D2D" opacity="0.3" stroke="#666" strokeWidth="1.5"/>
      <path d="M12 4C12 4 8 10 8 14C8 16.2 9.8 18 12 18C14.2 18 16 16.2 16 14C16 10 12 4 12 4Z" fill="#333" stroke="#888" strokeWidth="1"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
      <path d="M6 16L10 12L13 14L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  );
}

export default function TradeTicket({ ticket, onConfirm, onManagerExecute }: TradeTicketComponentProps) {
  const [execState, setExecState] = useState<ExecState>('idle');
  const [execResult, setExecResult] = useState<{ orderId: string; fillPrice: number } | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const isBuy = ticket.action === 'BUY';
  const grade = ticket.confidence && GRADE_STYLES[ticket.confidence] ? GRADE_STYLES[ticket.confidence] : null;

  const handleConfirm = async () => {
    if (execState === 'loading' || execState === 'success') return;
    if (!onConfirm) return;
    setExecState('loading');
    setExecError(null);
    try {
      const result = await onConfirm();
      if (result) {
        setExecResult(result);
        setExecState('success');
      } else {
        setExecState('error');
        setExecError('Execution returned no result.');
      }
    } catch (e: any) {
      setExecState('error');
      setExecError(e.message || 'Trade execution failed.');
    }
  };

  const buttonContent = () => {
    if (execState === 'loading') return (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Sending to Broker...
      </span>
    );
    if (execState === 'success') return (
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        Executed · #{execResult?.orderId?.slice(0, 8)}
      </span>
    );
    if (execState === 'error') return 'Retry Execution';
    return 'Direct Execute';
  };

  const buttonClass = () => {
    const base = 'w-full py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg transition-all ';
    if (execState === 'loading') return base + 'bg-blue-600 text-white cursor-not-allowed opacity-80';
    if (execState === 'success') return base + 'bg-green-600 text-white cursor-default';
    if (execState === 'error')   return base + 'bg-red-600 text-white hover:opacity-90 active:scale-95';
    return base + 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95';
  };

  return (
    <div className="flex-1 border border-[var(--border)] bg-[var(--sidebar-bg)] rounded-[28px] max-w-sm shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-black/5 dark:bg-white/5 flex justify-between items-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--subtext)]">
          Ticket #{ticket.ticketId}
        </span>
        <div className="flex items-center space-x-2">
          {grade && (
            <span className={`text-[8px] font-bold ${grade.bg} ${grade.text} px-2 py-0.5 rounded uppercase tracking-wider`}>
              {ticket.confidence}
            </span>
          )}
          {ticket.astroMode && (
            <span className="text-[8px] font-black bg-indigo-950 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
              Astro
            </span>
          )}
          <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">
            Verified
          </span>
        </div>
      </div>

      {/* Symbol & Entry */}
      <div className="p-6 pb-0 flex justify-between items-end">
        <div className="flex items-center gap-3">
          <InstrumentIcon symbol={ticket.symbol} />
          <div>
            <h4 className="text-2xl font-bold tracking-tighter uppercase leading-none">
              {ticket.symbol} <span className={isBuy ? 'text-green-500' : 'text-red-500'}>{ticket.action}</span>
            </h4>
            <p className="text-[10px] text-[var(--subtext)] font-medium mt-1 uppercase">Quick Execute</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-[var(--subtext)] uppercase leading-none mb-1">Entry Price</p>
          <p className="text-lg font-bold font-mono leading-none tracking-tighter">{ticket.entryPrice}</p>
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4 border-y border-[var(--border)]">
          <div>
            <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">Lot Volume</p>
            <p className="text-sm font-bold font-mono">{ticket.lotVolume}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">R/R Ratio</p>
            <p className="text-sm font-bold font-mono text-blue-500">{ticket.rrRatio}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-red-500 uppercase mb-1">Stop Loss</p>
            <p className="text-sm font-bold text-red-500 font-mono">{ticket.stopLoss}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Take Profit</p>
            <p className="text-sm font-bold text-green-600 font-mono">{ticket.takeProfit}</p>
          </div>
        </div>

        {/* Calculations */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--subtext)] uppercase font-bold tracking-widest">Required Margin:</span>
            <span className="font-bold font-mono">${ticket.margin}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-red-500 uppercase font-bold tracking-widest">Projected Risk:</span>
            <span className="font-bold text-red-500 font-mono">-${ticket.risk}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-green-600 uppercase font-bold tracking-widest">Projected Profit:</span>
            <span className="font-bold text-green-600 font-mono">+{ticket.profit}</span>
          </div>
        </div>

        {/* Astro Confluence Telemetry Banner */}
        {ticket.astroMode && ticket.astroDetails && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[10px] space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-1.5">
              <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                🪐 Celestial Confluence
              </span>
              <span className="text-[9px] text-indigo-300 font-medium">Active</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-indigo-200">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]">{ticket.astroDetails.moonEmoji}</span>
                <span>{ticket.astroDetails.moonPhase} in {ticket.astroDetails.moonSign}</span>
              </div>
              <div className="text-right">
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                  ticket.astroDetails.mercuryState === 'retrograde' ? 'bg-red-500/25 text-red-300 border border-red-500/30' : 'bg-green-500/25 text-green-300 border border-green-500/30'
                }`}>
                  ☿ {ticket.astroDetails.mercuryState.toUpperCase()}
                </span>
              </div>
            </div>

            {(ticket.astroDetails.voidOfCourse || ticket.astroDetails.eclipse) && (
              <div className="pt-1 border-t border-indigo-500/10 flex flex-wrap gap-1">
                {ticket.astroDetails.voidOfCourse && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded text-[8px] font-bold">
                    Luna Void of Course
                  </span>
                )}
                {ticket.astroDetails.eclipse && (
                  <span className="bg-red-500/25 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded text-[8px] font-bold">
                    Eclipse Blackout
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confidence Bar */}
        {grade && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-[var(--subtext)] uppercase font-bold tracking-widest">Confluence</span>
              <span className={`font-bold ${grade.text}`}>{grade.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--input-bg)] overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                ticket.confidence === 'AAA' ? 'bg-green-500 w-[95%]'
                : ticket.confidence === 'AA' ? 'bg-blue-500 w-[82%]'
                : ticket.confidence === 'A' ? 'bg-yellow-500 w-[72%]'
                : 'bg-gray-400 w-[50%]'
              }`}/>
            </div>
          </div>
        )}

        {/* Fill price on success */}
        {execState === 'success' && execResult && (
          <div className="flex justify-between text-[10px] py-2 px-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <span className="text-green-500 uppercase font-bold tracking-widest">Fill Price:</span>
            <span className="font-bold text-green-500 font-mono">{execResult.fillPrice}</span>
          </div>
        )}

        {/* Error display */}
        {execState === 'error' && execError && (
          <p className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 leading-relaxed">
            ⚠ {execError}
          </p>
        )}

        {/* Action Buttons — Both options together */}
        <div className="space-y-2">
          {/* Execute Via Manager */}
          {onManagerExecute && execState !== 'success' && (
            <button
              onClick={onManagerExecute}
              className="w-full py-3 rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] transition-all bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Execute Via Manager
            </button>
          )}

          {/* Direct Execute */}
          <button
            id={`execute-btn-${ticket.ticketId}`}
            onClick={handleConfirm}
            disabled={execState === 'loading' || execState === 'success'}
            className={buttonClass()}
          >
            {buttonContent()}
          </button>

          {/* Helper labels */}
          {execState === 'idle' && (
            <div className="flex items-center gap-1 justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--subtext)] opacity-50">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p className="text-[9px] text-[var(--subtext)] opacity-60 text-center">
                Manager lets you review & adjust — Direct sends to broker instantly
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
