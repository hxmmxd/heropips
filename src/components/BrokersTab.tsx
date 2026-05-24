'use client';

import React from 'react';
import { Server, Plus } from 'lucide-react';
import { Broker } from '../types';

interface BrokersTabProps {
  brokers: Broker[];
  onOpenModal: () => void;
}

export default function BrokersTab({ brokers, onOpenModal }: BrokersTabProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Broker Infrastructure
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {brokers.map((b) => (
          <div
            key={b.acc}
            className="border border-[var(--border)] p-6 rounded-[1.5rem] bg-[var(--sidebar-bg)] flex flex-col space-y-4 hover:border-blue-500/30 transition duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Server className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[var(--text)]">{b.name}</p>
                  <p className="text-[10px] text-[var(--subtext)] font-mono uppercase tracking-wider">
                    MT5 ID: #{b.acc}
                  </p>
                </div>
              </div>
              {b.balance === 'Connecting...' ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shrink-0" />
              ) : (
                <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                  Active Node
                </span>
              )}
            </div>

            {b.balance !== 'Connecting...' && (
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
                <div>
                  <span className="text-[9px] font-medium text-[var(--subtext)] uppercase tracking-wider block">Balance</span>
                  <span className="text-xs font-bold font-mono text-[var(--text)]">${b.balance}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-[var(--subtext)] uppercase tracking-wider block">Equity</span>
                  <span className="text-xs font-bold font-mono text-[var(--text)]">${b.equity}</span>
                </div>
                <div>
                  <span className="text-[9px] font-medium text-[var(--subtext)] uppercase tracking-wider block">Floating PnL</span>
                  <span className={`text-xs font-bold font-mono ${b.pnl.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                    {b.pnl}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Connect Broker Button Card */}
        <button
          onClick={onOpenModal}
          className="border-2 border-dashed border-[var(--border)] p-6 rounded-[1.5rem] flex items-center justify-center text-[var(--subtext)] hover:text-blue-500 hover:border-blue-500/50 transition duration-200 group text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform shrink-0" />
          Connect Broker Node
        </button>
      </div>
    </div>
  );
}
