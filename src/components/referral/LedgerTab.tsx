'use client';

import React, { useState } from 'react';

interface Transaction {
  id: string;
  tx_type: string;
  amount: number;
  created_at: string;
  status: string;
  metadata?: {
    symbol?: string;
    volume?: number;
    level?: number;
  } | null;
}

interface LedgerTabProps {
  transactions: Transaction[];
  loading: boolean;
}

export default function LedgerTab({ transactions, loading }: LedgerTabProps) {
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'rebate' | 'referral' | 'withdrawal'>('all');

  // Filtered transactions (null-safe)
  const filteredTxs = (transactions || []).filter(tx => {
    if (!tx || !tx.tx_type) return false;
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'rebate') return tx.tx_type === 'rebate';
    if (ledgerFilter === 'referral') return tx.tx_type === 'referral';
    if (ledgerFilter === 'withdrawal') return String(tx.tx_type).startsWith('withdrawal');
    return true;
  });

  return (
    <div className="rh-section-card">
      <div className="rh-section-card-header">
        <span className="rh-section-card-title">Transaction Ledger</span>
        <span className="rh-section-card-hint">Total filtered: {filteredTxs.length}</span>
      </div>

      <div className="rh-ledger-filters">
        {(['all', 'rebate', 'referral', 'withdrawal'] as const).map(f => (
          <button
            key={f}
            className={`rh-filter-chip ${ledgerFilter === f ? 'active' : ''}`}
            onClick={() => setLedgerFilter(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="rh-empty">Loading ledger...</div>
        ) : filteredTxs.length === 0 ? (
          <div className="rh-empty">No transactions match the selected filter.</div>
        ) : (
          filteredTxs.map((tx) => (
            <div key={tx.id} className="rh-tx">
              <div 
                className="rh-tx-icon"
                style={{
                  background: tx.amount >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: tx.amount >= 0 ? '#10b981' : '#ef4444'
                }}
              >
                {tx.amount >= 0 ? '↓' : '↑'}
              </div>
              <div className="rh-tx-info">
                <div className="rh-tx-type">{String(tx.tx_type).replace('_', ' ')}</div>
                <div className="rh-tx-date">
                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
                {tx.metadata?.symbol && (
                  <div className="rh-tx-tags">
                    <span className="rh-tx-tag">{tx.metadata.symbol}</span>
                    <span className="rh-tx-tag">{tx.metadata.volume} lots</span>
                    {tx.metadata.level && (
                      <span className="rh-tx-tag">L{tx.metadata.level} Referral</span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <span 
                  className="rh-tx-amount"
                  style={{ color: tx.amount >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {tx.amount >= 0 ? '+' : ''}${Math.abs(Number(tx.amount)).toFixed(2)}
                </span>
                <span className={`rh-tx-status rh-tx-status-${tx.status}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
