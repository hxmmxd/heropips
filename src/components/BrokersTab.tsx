'use client';

import React, { useState, useEffect } from 'react';
import { Server, Plus, Unplug, Loader2 } from 'lucide-react';
import { Broker } from '../types';
import { cleanBrokerName } from '@/utils/broker';

interface BrokersTabProps {
  brokers: Broker[];
  onOpenModal: () => void;
  onDisconnect: (acc: string) => Promise<void>;
}

export default function BrokersTab({ brokers, onOpenModal, onDisconnect }: BrokersTabProps) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Broker Infrastructure
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {brokers.map((b) => (
          <div
            key={b.acc}
            className="border border-[var(--border)] p-6 rounded-[1.5rem] bg-[var(--sidebar-bg)] flex flex-col space-y-4 hover:border-[var(--accent)]/30 transition duration-200 group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
                  <Server className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[var(--text)]">{cleanBrokerName(b.name)}</p>
                  <p className="text-[10px] text-[var(--subtext)] font-mono uppercase tracking-wider">
                    MT5 ID: #{b.acc} {b.broker_timezone_name ? `(${b.broker_timezone_name})` : ''}
                  </p>
                  {b.balance !== 'Connecting...' && b.timezone_offset !== undefined && (
                    <p className="text-[11px] font-mono mt-1.5 font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-md w-fit" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ background: 'var(--accent)' }} />
                      Server Clock: {getBrokerTimeString(b.timezone_offset)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {b.balance === 'Connecting...' ? (
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', borderTopColor: 'var(--accent)' }} />
                ) : (
                  <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                    Active Node
                  </span>
                )}
              </div>
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
