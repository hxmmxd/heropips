'use client';

import React, { useState } from 'react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  minWithdrawal: number;
  onSuccess: () => void;
}

export default function WithdrawModal({ isOpen, onClose, availableBalance, minWithdrawal, onSuccess }: WithdrawModalProps) {
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawCoin, setWithdrawCoin] = useState('USDT (TRC-20)');
  const [withdrawAddr, setWithdrawAddr] = useState('');
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWithdrawalSubmit = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          amount: Number(withdrawAmt),
          currency: withdrawCoin.split(' ')[0], // extract symbol like USDT
          address: withdrawAddr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawStep('success');
        onSuccess(); // refresh stats
      } else {
        setWithdrawError(data.error || 'Withdrawal request failed.');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'An error occurred during withdrawal request.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="rh-modal-overlay" onClick={() => !withdrawing && onClose()}>
      <div className="rh-modal" onClick={e => e.stopPropagation()}>
        <div className="rh-modal-header">
          <div>
            <span className="rh-modal-title">Withdraw Referral Wallet</span>
            <span className="rh-modal-sub">
              Available: <strong style={{ color: '#10b981' }}>${availableBalance.toFixed(2)}</strong>
            </span>
          </div>
          <button 
            className="rh-modal-close" 
            disabled={withdrawing} 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {withdrawStep === 'form' && (
          <>
            <div>
              <span className="rh-wd-label">Payout Amount</span>
              <div className="rh-wd-chips">
                {[50, 100, 250, 500].filter(v => v <= availableBalance).map(v => (
                  <button 
                    key={v} 
                    className={`rh-wd-chip ${Number(withdrawAmt) === v ? 'active' : ''}`}
                    onClick={() => setWithdrawAmt(String(v))}
                  >
                    ${v}
                  </button>
                ))}
                <button 
                  className={`rh-wd-chip ${Number(withdrawAmt) === Math.floor(availableBalance) ? 'active' : ''}`}
                  onClick={() => setWithdrawAmt(String(Math.floor(availableBalance)))}
                >
                  Max
                </button>
              </div>
              <div className="rh-wd-input-wrap">
                <span className="rh-wd-prefix">$</span>
                <input 
                  type="number"
                  className="rh-wd-input"
                  placeholder="0.00"
                  min={minWithdrawal}
                  max={availableBalance}
                  value={withdrawAmt}
                  onChange={e => setWithdrawAmt(e.target.value)}
                />
              </div>
            </div>

            <div>
              <span className="rh-wd-label">Select Payout Cryptocurrency</span>
              <div className="rh-wd-coins">
                {[
                  { name: 'USDT (TRC-20)', slug: 'usdt' },
                  { name: 'USDT (ERC-20)', slug: 'usdt' },
                  { name: 'BTC', slug: 'btc' },
                  { name: 'ETH', slug: 'eth' }
                ].map(coin => (
                  <button
                    key={coin.name}
                    className={`rh-wd-coin ${withdrawCoin === coin.name ? 'active' : ''}`}
                    onClick={() => setWithdrawCoin(coin.name)}
                  >
                    <img 
                      src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.slug}.png`}
                      alt={coin.name}
                      width={14}
                      height={14}
                    />
                    {coin.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="rh-wd-label">{withdrawCoin} Wallet Address</span>
              <input 
                type="text" 
                className="rh-wd-addr"
                placeholder="Enter wallet address"
                value={withdrawAddr}
                onChange={e => setWithdrawAddr(e.target.value)}
              />
            </div>

            <div className="rh-wd-fee">
              <span>Estimated network gas fee:</span>
              <span>$2.00</span>
            </div>

            {withdrawError && (
              <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
                {withdrawError}
              </div>
            )}

            <button 
              className="rh-btn rh-btn-primary"
              disabled={!withdrawAmt || Number(withdrawAmt) < minWithdrawal || !withdrawAddr}
              onClick={() => setWithdrawStep('confirm')}
            >
              Review Request &rarr;
            </button>
          </>
        )}

        {withdrawStep === 'confirm' && (
          <>
            <div className="rh-wd-summary">
              <div className="rh-wd-row">
                <span>Requested Amount:</span>
                <span>${Number(withdrawAmt).toFixed(2)}</span>
              </div>
              <div className="rh-wd-row">
                <span>Currency:</span>
                <span>{withdrawCoin}</span>
              </div>
              <div className="rh-wd-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span>Destination Address:</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--subtext)' }}>
                  {withdrawAddr}
                </span>
              </div>
              <div className="rh-wd-row">
                <span>You Receive:</span>
                <strong style={{ color: '#10b981' }}>
                  ${(Number(withdrawAmt) - 2.00).toFixed(2)}
                </strong>
              </div>
            </div>

            {withdrawError && (
              <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
                {withdrawError}
              </div>
            )}

            <div className="rh-btn-row">
              <button 
                className="rh-btn rh-btn-secondary"
                disabled={withdrawing}
                onClick={() => {
                  setWithdrawStep('form');
                  setWithdrawError(null);
                }}
              >
                Back
              </button>
              <button 
                className="rh-btn rh-btn-primary"
                disabled={withdrawing}
                onClick={handleWithdrawalSubmit}
              >
                {withdrawing ? <span className="rh-spinner" /> : 'Confirm Payout'}
              </button>
            </div>
          </>
        )}

        {withdrawStep === 'success' && (
          <div className="rh-success">
            <span className="rh-success-icon">🎉</span>
            <span className="rh-success-title">Withdrawal Requested</span>
            <span className="rh-success-sub">
              Your payout request of <strong>${Number(withdrawAmt).toFixed(2)}</strong> has been successfully placed. Our compliance team will audit and process the payout within 24 hours.
            </span>
            <button 
              className="rh-btn rh-btn-primary" 
              style={{ width: '100%', marginTop: 12 }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
