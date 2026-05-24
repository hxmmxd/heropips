'use client';

import React from 'react';
import { TradeTicketProps } from '../types';

interface TradeTicketComponentProps {
  ticket: TradeTicketProps;
  onConfirm?: () => void;
}

export default function TradeTicket({ ticket, onConfirm }: TradeTicketComponentProps) {
  const isBuy = ticket.action === 'BUY';

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
        <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">
          Verified
        </span>
      </div>

      {/* Symbol & Entry */}
      <div className="p-6 pb-0 flex justify-between items-end">
        <div>
          <h4 className="text-2xl font-bold tracking-tighter uppercase leading-none">
            {ticket.symbol} <span className={isBuy ? 'text-green-500' : 'text-red-500'}>{ticket.action}</span>
          </h4>
          <p className="text-[10px] text-[var(--subtext)] font-medium mt-1 uppercase">Node Execution</p>
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
