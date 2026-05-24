'use client';

import React from 'react';
import { TradeTicketProps } from '../types';

interface TradeTicketComponentProps {
  ticket: TradeTicketProps;
  onConfirm?: () => void;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  AAA: { bg: 'bg-green-500/15', text: 'text-green-500', label: 'AAA — Max Conviction' },
  AA:  { bg: 'bg-blue-500/15',  text: 'text-blue-500',  label: 'AA — High Probability' },
  A:   { bg: 'bg-yellow-500/15', text: 'text-yellow-500', label: 'A — Standard Setup' },
  BBB: { bg: 'bg-[var(--subtext)]/10', text: 'text-[var(--subtext)]', label: 'BBB — Low Confidence' },
};

// Instrument SVG icons
function InstrumentIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase();
  const size = 28;

  // Gold
  if (s.includes('XAU') || s.includes('GOLD')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="10" width="18" height="10" rx="2" fill="#FFD700" opacity="0.2" stroke="#FFD700" strokeWidth="1.5"/>
        <rect x="6" y="5" width="12" height="7" rx="1.5" fill="#FFD700" opacity="0.3" stroke="#FFD700" strokeWidth="1.5"/>
        <rect x="9" y="2" width="6" height="5" rx="1" fill="#FFD700" opacity="0.4" stroke="#FFD700" strokeWidth="1.5"/>
      </svg>
    );
  }

  // Bitcoin
  if (s.includes('BTC') || s.includes('BITCOIN')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#F7931A" opacity="0.15" stroke="#F7931A" strokeWidth="1.5"/>
        <path d="M14.5 7.5C14.5 6.5 13.5 6 12 6H9.5V9.5H12C13.5 9.5 14.5 9 14.5 7.75V7.5Z" fill="#F7931A" opacity="0.4"/>
        <path d="M15 12.5C15 11.5 14 11 12.5 11H9.5V14.5H12.5C14 14.5 15 14 15 12.75V12.5Z" fill="#F7931A" opacity="0.4"/>
        <text x="12" y="16" textAnchor="middle" fill="#F7931A" fontSize="12" fontWeight="bold" fontFamily="monospace">₿</text>
      </svg>
    );
  }

  // Ethereum
  if (s.includes('ETH')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#627EEA" opacity="0.15" stroke="#627EEA" strokeWidth="1.5"/>
        <path d="M12 3L6 12L12 15L18 12L12 3Z" fill="#627EEA" opacity="0.3" stroke="#627EEA" strokeWidth="1"/>
        <path d="M12 15L6 12L12 21L18 12L12 15Z" fill="#627EEA" opacity="0.5" stroke="#627EEA" strokeWidth="1"/>
      </svg>
    );
  }

  // EUR
  if (s.includes('EUR')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#003399" opacity="0.15" stroke="#003399" strokeWidth="1.5"/>
        <text x="12" y="17" textAnchor="middle" fill="#4A90D9" fontSize="14" fontWeight="bold" fontFamily="serif">€</text>
      </svg>
    );
  }

  // GBP
  if (s.includes('GBP')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1D4E89" opacity="0.15" stroke="#1D4E89" strokeWidth="1.5"/>
        <text x="12" y="17" textAnchor="middle" fill="#5B9BD5" fontSize="14" fontWeight="bold" fontFamily="serif">£</text>
      </svg>
    );
  }

  // JPY
  if (s.includes('JPY')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#BC002D" opacity="0.15" stroke="#BC002D" strokeWidth="1.5"/>
        <text x="12" y="17" textAnchor="middle" fill="#E05A6D" fontSize="14" fontWeight="bold" fontFamily="serif">¥</text>
      </svg>
    );
  }

  // NASDAQ / NAS100
  if (s.includes('NAS') || s.includes('NASDAQ')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#00B4D8" opacity="0.15" stroke="#00B4D8" strokeWidth="1.5"/>
        <path d="M6 18L9 12L12 14L15 8L18 10" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="18" cy="10" r="1.5" fill="#00B4D8"/>
      </svg>
    );
  }

  // DOW / US30
  if (s.includes('US30') || s.includes('DOW')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0077B6" opacity="0.15" stroke="#0077B6" strokeWidth="1.5"/>
        <rect x="6" y="14" width="3" height="4" rx="0.5" fill="#0077B6" opacity="0.5"/>
        <rect x="10.5" y="10" width="3" height="8" rx="0.5" fill="#0077B6" opacity="0.7"/>
        <rect x="15" y="7" width="3" height="11" rx="0.5" fill="#0077B6"/>
      </svg>
    );
  }

  // Oil
  if (s.includes('OIL') || s.includes('USO') || s.includes('WTI') || s.includes('BRENT')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#2D2D2D" opacity="0.3" stroke="#666" strokeWidth="1.5"/>
        <path d="M12 4C12 4 8 10 8 14C8 16.2 9.8 18 12 18C14.2 18 16 16.2 16 14C16 10 12 4 12 4Z" fill="#333" stroke="#888" strokeWidth="1"/>
      </svg>
    );
  }

  // Default: generic chart icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
      <path d="M6 16L10 12L13 14L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  );
}

export default function TradeTicket({ ticket, onConfirm }: TradeTicketComponentProps) {
  const isBuy = ticket.action === 'BUY';
  const grade = ticket.confidence && GRADE_STYLES[ticket.confidence]
    ? GRADE_STYLES[ticket.confidence]
    : null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      alert(`Trade ticket #${ticket.ticketId} confirmed on broker node.`);
    }
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
            <p className="text-[10px] text-[var(--subtext)] font-medium mt-1 uppercase">Node Execution</p>
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

        {/* Confidence Bar */}
        {grade && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-[var(--subtext)] uppercase font-bold tracking-widest">Confluence</span>
              <span className={`font-bold ${grade.text}`}>{grade.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--input-bg)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  ticket.confidence === 'AAA' ? 'bg-green-500 w-[95%]'
                  : ticket.confidence === 'AA' ? 'bg-blue-500 w-[82%]'
                  : ticket.confidence === 'A' ? 'bg-yellow-500 w-[72%]'
                  : 'bg-gray-400 w-[50%]'
                }`}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-[var(--text)] text-[var(--bg)] py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg active:scale-95 hover:opacity-90 transition-all"
        >
          Confirm Execution
        </button>
      </div>
    </div>
  );
}
