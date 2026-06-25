'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, Unplug, Loader2, RefreshCw } from 'lucide-react';
import { Broker } from '../types';
import { cleanBrokerName } from '@/utils/broker';

interface BrokersTabProps {
  brokers: Broker[];
  onOpenModal: () => void;
  onDisconnect: (acc: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
}

export default function BrokersTab({ brokers, onOpenModal, onDisconnect, onRefresh, isRefreshing = false }: BrokersTabProps) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getBrokerTimeString = (offsetHours: number) => {
    const localOffsetMs = currentTime.getTimezoneOffset() * 60 * 1000;
    const utcMs = currentTime.getTime() + localOffsetMs;
    const brokerMs = utcMs + (offsetHours * 60 * 60 * 1000);
    const brokerDate = new Date(brokerMs);
    return brokerDate.toLocaleTimeString('en-US', { hour12: false });
  };

  const handleDisconnect = async (acc: string) => {
    if (confirmId !== acc) {
      setConfirmId(acc);
      return;
    }
    setDisconnecting(acc);
    try {
      await onDisconnect(acc);
    } finally {
      setDisconnecting(null);
      setConfirmId(null);
    }
  };

  const handleRefresh = async (acc: string) => {
    if (isRefreshing || refreshingId) return;
    setRefreshingId(acc);
    try {
      await onRefresh();
    } finally {
      setRefreshingId(null);
    }
  };

  const getStatusPill = (status?: string, balance?: string) => {
    const s = (status || (balance === 'Connecting...' ? 'connecting' : 'connected')).toLowerCase();
    if (s === 'connected') {
      return (
        <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
          Connected
        </span>
      );
    }
    if (s === 'connecting' || s === 'starting' || s === 'waking') {
      return (
        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <span className="w-2 h-2 border-2 rounded-full animate-spin border-amber-500/30 border-t-amber-500 shrink-0" />
          Connecting
        </span>
      );
    }
    if (s === 'timeout') {
      return (
        <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
          Timeout
        </span>
      );
    }
    // 'disconnected' / 'hibernated'
    return (
      <span className="text-[9px] font-bold text-slate-500 bg-slate-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
        Disconnected
      </span>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Broker Infrastructure
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {brokers.map((b) => (
          <div
            key={b.acc}
            className="border border-[var(--border)] p-5 rounded-3xl bg-gradient-to-br from-[var(--sidebar-bg)] via-[var(--sidebar-bg)] to-[var(--input-bg)]/40 flex flex-col space-y-3.5 hover:border-[var(--accent)]/35 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-all duration-300 group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] border border-[var(--accent)]/10 shadow-inner shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-sm text-[var(--text)] tracking-tight leading-tight">
                    {cleanBrokerName(b.name).replace(/\s*\.$/, '')}
                  </p>
                  <p className="text-[10px] text-[var(--subtext)] font-mono uppercase tracking-wider flex items-center gap-1.5 flex-wrap mt-1">
                    <span>ID: #{b.acc}</span>
                    {b.broker_timezone_name && <span>({b.broker_timezone_name})</span>}
                    {b.balance !== 'Connecting...' && b.timezone_offset !== undefined && b.status !== 'timeout' && (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--accent)' }}>
                          <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
                          {getBrokerTimeString(b.timezone_offset)}
                        </span>
                      </>
                    )}
                  </p>
                  {b.status === 'timeout' && (
                    <p className="text-[10px] text-red-400 font-semibold mt-1 animate-pulse">
                      Sidecar unresponsive. Disconnect & reconnect node.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusPill(b.status, b.balance)}
                <button
                  onClick={() => handleRefresh(b.acc)}
                  disabled={isRefreshing || refreshingId !== null}
                  className="p-1.5 rounded-lg text-[var(--subtext)] hover:text-[var(--accent)] hover:bg-[var(--border)]/40 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-[var(--border)]"
                  title="Refresh Status & Balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || refreshingId === b.acc ? 'animate-spin text-[var(--accent)]' : 'hover:rotate-45 transition-transform duration-200'}`} />
                </button>
              </div>
            </div>

            {b.balance !== 'Connecting...' && (
              <div className="pt-3 border-t border-[var(--border)]/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-[var(--input-bg)]/25 border border-[var(--border)]/30 px-4 py-3 rounded-2xl">
                <div>
                  <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-wider block mb-0.5">Balance</span>
                  <span className="text-xs font-black font-mono text-[var(--text)] select-all">${b.balance}</span>
                </div>
                <div className="h-6 w-[1px] bg-[var(--border)]/40 hidden sm:block" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-wider block mb-0.5">Equity</span>
                  <span className="text-xs font-black font-mono text-[var(--text)] select-all">${b.equity}</span>
                </div>
                <div className="h-6 w-[1px] bg-[var(--border)]/40 hidden sm:block" />
                <div>
                  <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-wider block mb-0.5">Floating PnL</span>
                  <span className={`text-xs font-black font-mono ${b.pnl.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>{b.pnl}</span>
                </div>
              </div>
            )}

            {/* Disconnect Button */}
            {b.balance !== 'Connecting...' && (
              <div
                className="bm-disconnect-btn"
                role="button"
                tabIndex={0}
                onClick={() => handleDisconnect(b.acc)}
              >
                {disconnecting === b.acc ? (
                  <><Loader2 className="bm-spin" /> Disconnecting...</>
                ) : confirmId === b.acc ? (
                  <><Unplug /> Confirm Disconnect?</>
                ) : (
                  <><Unplug /> Disconnect</>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Connect Broker Button Card */}
        <button
          onClick={onOpenModal}
          className="border-2 border-dashed border-[var(--border)] p-6 rounded-[1.5rem] flex items-center justify-center text-[var(--subtext)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition duration-200 group text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform shrink-0" />
          Connect Broker Node
        </button>
      </div>
    </div>
  );
}
