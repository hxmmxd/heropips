'use client';

import React from 'react';

interface BrokerLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  isFree: boolean;
  brokersCount: number;
}

export default function BrokerLimitModal({
  isOpen,
  onClose,
  onUpgrade,
  isFree,
  brokersCount,
}: BrokerLimitModalProps) {
  if (!isOpen) return null;

  const maxAllowed = isFree ? 1 : 5;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4" onClick={onClose}>
      <div 
        className="max-w-md w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text)] shadow-2xl animate-in zoom-in-95 duration-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--text)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Broker Limit Reached
            </h3>
            <p className="text-[11px] text-[var(--subtext)]">
              Plan limit restriction
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--text)]/85 leading-relaxed">
          {isFree ? (
            <>You have reached your limit of <strong>1 connected broker</strong> on the Free plan. Upgrade to the Premium (Pro) plan to connect up to <strong>5 broker accounts</strong> simultaneously.</>
          ) : (
            <>You have reached your limit of <strong>5 connected brokers</strong> on the Premium plan. Please disconnect an existing broker node or contact support to request a quota increase.</>
          )}
        </p>

        {/* Quota Progress */}
        <div className="bg-[var(--input-bg)]/40 rounded-xl p-3 border border-[var(--border)]/40">
          <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-[var(--subtext)]">
            <span>Broker Connections Limit</span>
            <span className="font-semibold text-[var(--text)]">{brokersCount} / {maxAllowed} ({Math.round((brokersCount / maxAllowed) * 100)}%)</span>
          </div>
          <div className="w-full h-1 bg-[var(--border)]/50 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--text)]/30 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {isFree ? (
            <button
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-[var(--bg)] font-bold text-xs transition-all duration-200 active:scale-98 cursor-pointer shadow-sm"
            >
              Upgrade to Premium
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--input-bg)] hover:bg-[var(--input-bg)]/80 text-[var(--text)] font-semibold text-xs border border-[var(--border)] transition-all duration-200 active:scale-98 cursor-pointer"
            >
              Dismiss
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[11px] text-[var(--subtext)] hover:text-[var(--text)] transition-colors"
          >
            {isFree ? "Dismiss" : "Manage Nodes"}
          </button>
        </div>
      </div>
    </div>
  );
}
