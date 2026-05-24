'use client';

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { TradeLog } from '../types';

interface HistoryTabProps {
  logs: TradeLog[];
}

export default function HistoryTab({ logs }: HistoryTabProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Execution History
      </h2>
      <div className="space-y-3 pb-10">
        {logs.map((log) => {
          const win = log.isWin;
          const isBuy = log.action === 'BUY';
          return (
            <div
              key={log.orderId}
              className="border border-[var(--border)] p-4 rounded-xl flex justify-between items-center bg-[var(--sidebar-bg)] shadow-sm"
            >
              <div className="flex items-center space-x-4">
                {/* Win/Loss Badge */}
                <div
                  className={`w-8 h-8 rounded-full ${
                    win ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  } flex items-center justify-center shrink-0`}
                >
                  {isBuy ? (
                    <ArrowUp className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Details */}
                <div>
                  <p className="text-xs font-bold uppercase">
                    {log.symbol}{' '}
                    <span className={isBuy ? 'text-green-500' : 'text-red-500'}>
                      {log.action}
                    </span>
                  </p>
                  <p className="text-[10px] text-[var(--subtext)] tracking-tighter">
                    Order #{log.orderId}
                  </p>
                </div>
              </div>

              {/* Balance Delta */}
              <div className="text-right">
                <p
                  className={`text-sm font-bold font-mono ${
                    win ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {win ? '+' : '-'}${log.amount}
                </p>
                <p className="text-[9px] text-[var(--subtext)] uppercase font-bold">
                  Closed
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
