'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Copy, Check, RefreshCw, AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  planPrice: number;
  initialInvoice: any | null;
  initialStatus: string | null;
  onSuccess: (planId: string) => void;
  onInvoiceCreated?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  planId,
  planName,
  planPrice,
  initialInvoice,
  initialStatus,
  onSuccess,
  onInvoiceCreated,
}: CheckoutModalProps) {
  const [payCurrency, setPayCurrency] = useState('usdttrc20');
  const [invoice, setInvoice] = useState<any | null>(initialInvoice);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(initialStatus);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);

  // Sync props when user clicks another invoice from history
  useEffect(() => {
    setInvoice(initialInvoice);
    setPaymentStatus(initialStatus);
    setErrorMessage(null);
  }, [initialInvoice, initialStatus]);

  // Reset local state if modal opens without an initial invoice
  useEffect(() => {
    if (isOpen && !initialInvoice) {
      setInvoice(null);
      setPaymentStatus(null);
      setErrorMessage(null);
    }
  }, [isOpen, initialInvoice]);

  // Polling loop
  useEffect(() => {
    let intervalId: any;
    if (invoice && invoice.payment_id && (paymentStatus === 'waiting' || paymentStatus === 'confirming')) {
      intervalId = setInterval(() => {
        checkInvoiceStatus(invoice.payment_id, true);
      }, 8000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [invoice, paymentStatus]);

  const generateInvoice = async () => {
    setCreatingInvoice(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, payCurrency }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create payment checkout');
      setInvoice(data);
      setPaymentStatus(data.payment_status || 'waiting');
      onInvoiceCreated?.();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const checkInvoiceStatus = async (paymentId: string, silent = false) => {
    if (!silent) setCheckingStatus(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/subscriptions/status?paymentId=${paymentId}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to check status');
      setPaymentStatus(data.status);
      onInvoiceCreated?.();
      if (data.status === 'finished') {
        onSuccess(planId);
      }
    } catch (e: any) {
      if (!silent) setErrorMessage(e.message);
    } finally {
      if (!silent) setCheckingStatus(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="bm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => !creatingInvoice && onClose()}
    >
      <motion.div
        className="bm-container"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="bm-close" onClick={onClose} aria-label="Close dialog">
          <X style={{ width: 16, height: 16 }} />
        </button>

        {!invoice ? (
          /* Step 1: Select Crypto Network */
          <div>
            <div className="deposit-badge-step">
              <Shield style={{ width: 12, height: 12 }} /> SECURE DEPOSIT
            </div>
            <h4 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Choose Crypto Network
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--subtext)', lineHeight: 1.4 }}>
              You are activating the <strong style={{ color: 'var(--text)' }}>{planName} Tier</strong> subscription.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 16, padding: '14px 18px', marginBottom: 24 }}>
              <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 500 }}>Invoice total:</span>
              <strong style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>
                ${planPrice} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--subtext)' }}>/ mo</span>
              </strong>
            </div>

            <label className="deposit-field-label">Supported Assets</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
              {[
                { id: 'usdttrc20', name: 'USDT (TRC-20)', desc: 'Tether on Tron - Fast & low fee', icon: 'usdt' },
                { id: 'usdtbsc', name: 'USDT (BEP-20)', desc: 'Tether on BNB Smart Chain', icon: 'usdt' },
                { id: 'btc', name: 'Bitcoin (BTC)', desc: 'Native BTC Network payment', icon: 'btc' },
                { id: 'eth', name: 'Ethereum (ETH)', desc: 'ERC-20 Ethereum main network', icon: 'eth' },
                { id: 'ltc', name: 'Litecoin (LTC)', desc: 'Litecoin Digital Asset', icon: 'ltc' },
              ].map(coin => (
                <button
                  key={coin.id}
                  type="button"
                  onClick={() => setPayCurrency(coin.id)}
                  className={`crypto-option-btn ${payCurrency === coin.id ? 'active' : ''}`}
                >
                  <img
                    src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.icon}.png`}
                    alt={coin.name}
                    width={28}
                    height={28}
                    style={{ borderRadius: 50, background: '#ffffff', padding: '1px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{coin.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--subtext)', marginTop: 2 }}>{coin.desc}</span>
                  </div>
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 50,
                    border: '2px solid',
                    borderColor: payCurrency === coin.id ? '#6366f1' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}>
                    {payCurrency === coin.id && (
                      <div style={{ width: 8, height: 8, borderRadius: 50, background: '#6366f1' }} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={generateInvoice}
              disabled={creatingInvoice}
              className="btn-action-primary"
            >
              {creatingInvoice ? (
                <>
                  <RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} />
                  Creating Payment Address...
                </>
              ) : (
                <>
                  <Zap style={{ width: 16, height: 16 }} />
                  Generate Payment Invoice
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Show Payment details or Expired Screen */
          <div>
            {paymentStatus === 'expired' || paymentStatus === 'failed' ? (
              /* Expired / Failed State Screen */
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <X style={{ width: 28, height: 28 }} />
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Payment Invoice Expired
                </h4>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--subtext)', lineHeight: 1.5 }}>
                  The 60-minute window for this secure deposit has closed. For your safety, please close this panel and create a new deposit invoice. Do not transfer funds to this expired address.
                </p>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-action-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                >
                  Close & Create New Invoice
                </button>
              </div>
            ) : (
              /* Active Awaiting Deposit Screen */
              <div>
                <div className="deposit-badge-step" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Shield style={{ width: 12, height: 12 }} /> AWAITING DEPOSIT
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Complete Transfer
                </h4>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--subtext)', lineHeight: 1.4 }}>
                  Send the exact crypto amount to the secure address below. Do not send any other asset.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <div className="deposit-qr-frame">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invoice.pay_address)}`}
                      alt="QR Address"
                      width={180}
                      height={180}
                      style={{ display: 'block', borderRadius: 8 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span className="deposit-field-label">Amount to Send</span>
                  <div className="deposit-field-container">
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', flex: 1, fontFamily: 'monospace' }}>
                      {invoice.pay_amount} {invoice.pay_currency.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(invoice.pay_amount));
                        setCopiedAmt(true);
                        setTimeout(() => setCopiedAmt(false), 2000);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: copiedAmt ? '#10b981' : '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s' }}
                    >
                      {copiedAmt ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      {copiedAmt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <span className="deposit-field-label">Destination Address</span>
                  <div className="deposit-field-container">
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.02em' }}>
                      {invoice.pay_address}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(invoice.pay_address);
                        setCopiedAddr(true);
                        setTimeout(() => setCopiedAddr(false), 2000);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: copiedAddr ? '#10b981' : '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s' }}
                    >
                      {copiedAddr ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                      {copiedAddr ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className={`deposit-status-banner ${paymentStatus === 'finished' ? 'finished' : ''}`}>
                  {paymentStatus === 'finished' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Check style={{ width: 14, height: 14 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>Payment Success</span>
                        <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>Activating tier subscription...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="animate-spin" style={{ width: 16, height: 16, color: '#6366f1' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                          Awaiting Payment Confirmation
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--subtext)', marginTop: 2 }}>
                          Transaction status: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{paymentStatus || 'waiting'}</strong> (auto-polling)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {errorMessage && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => checkInvoiceStatus(invoice.payment_id)}
                    disabled={checkingStatus || paymentStatus === 'finished'}
                    className="btn-action-secondary"
                    style={{ flex: 1 }}
                  >
                    {checkingStatus ? (
                      <>
                        <RefreshCw className="animate-spin" style={{ width: 14, height: 14 }} />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw style={{ width: 14, height: 14 }} />
                        Verify Payment
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-action-secondary"
                    style={{ flex: 1, color: '#ffffff', background: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Close Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
