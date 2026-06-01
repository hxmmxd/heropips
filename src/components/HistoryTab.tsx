'use client';

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface HistoryTabProps {
  logs: any[];
}

export default function HistoryTab({ logs }: HistoryTabProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Execution History
      </h2>
      <div className="space-y-3 pb-10">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-[var(--subtext)] text-sm border border-dashed border-[var(--border)] rounded-2xl bg-[var(--sidebar-bg)]">
            No trades executed yet. Run a chat signal to execute your first trade.
          </div>
        ) : (
          logs.map((log) => {
            const isBuy = String(log.action).toUpperCase() === 'BUY';
            const status = log.status || 'open';
            const pnl = Number(log.pnl) || 0;
            const hasPnl = log.pnl !== null && log.pnl !== undefined;
            const win = pnl >= 0;

            return (
              <div
                key={log.id || log.order_id}
                className="border border-[var(--border)] p-4 rounded-xl flex justify-between items-center bg-[var(--sidebar-bg)] shadow-sm hover:border-[var(--border)]/80 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {/* Status / Direction Badge */}
                  <div
                    className={`w-8 h-8 rounded-full ${
                      isBuy ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    } flex items-center justify-center shrink-0`}
                  >
                    {isBuy ? (
                      <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--text)] flex items-center gap-1.5">
                      <span>{log.symbol}</span>
                      <span className={isBuy ? 'text-green-500' : 'text-red-500'}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-[var(--subtext)] font-normal normal-case">
                        · {Number(log.volume || 0.01).toFixed(2)} Lot{Number(log.volume) !== 1 ? 's' : ''}
                      </span>
                    </p>
                    <p className="text-[10px] text-[var(--subtext)] tracking-tighter mt-0.5">
                      Order #{log.order_id || 'Pending'} · Entry: ${Number(log.entry_price || 0).toFixed(2)}
                      {log.stop_loss ? ` · SL: $${Number(log.stop_loss).toFixed(2)}` : ''}
                      {log.take_profit ? ` · TP: $${Number(log.take_profit).toFixed(2)}` : ''}
                    </p>
                  </div>
                </div>

                {/* Status & PnL */}
                <div className="text-right">
                  {hasPnl ? (
                    <p
                      className={`text-sm font-bold font-mono ${
                        win ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {win ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-sm font-bold font-mono text-[var(--subtext)]">
                      Running
                    </p>
                  )}
                  <p className={`text-[9px] uppercase font-bold tracking-wider ${
                    status === 'open' ? 'text-blue-500' : 'text-[var(--subtext)]'
                  }`}>
                    {status}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
