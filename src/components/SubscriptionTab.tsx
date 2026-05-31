'use client';

import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Rocket, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SubscriptionTabProps {
  onBack?: () => void;
}

const defaultPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 20,
    period: '/month',
    icon: Zap,
    color: '#10a37f',
    gradient: 'linear-gradient(135deg, #10a37f, #0d8c6d)',
    popular: false,
    features: [
      '5 AI trade signals per day',
      '1 broker connection',
      'Basic market analysis',
      'Email support',
      'Trade history (30 days)',
      'Standard execution speed',
    ],
    limits: [
      'No advanced indicators',
      'No priority execution',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    period: '/month',
    icon: Crown,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    popular: true,
    features: [
      'Unlimited AI trade signals',
      '5 broker connections',
      'Advanced technical analysis',
      'Priority support (24/7)',
      'Full trade history',
      'Priority execution speed',
      'Risk management tools',
      'Custom trading strategies',
    ],
    limits: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 100,
    period: '/month',
    icon: Rocket,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    popular: false,
    features: [
      'Everything in Pro',
      'Unlimited broker connections',
      'Institutional-grade AI models',
      'Dedicated account manager',
      'API access & webhooks',
      'White-label dashboard',
      'Custom integrations',
      'Multi-user team access',
      'SLA guarantee (99.9%)',
    ],
    limits: [],
  },
];

export default function SubscriptionTab({ onBack }: SubscriptionTabProps) {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState(defaultPlans);
  const supabase = createClient();

  // NOWPayments Checkout States
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [payCurrency, setPayCurrency] = useState('usdttrc20');
  const [invoice, setInvoice] = useState<any | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const pricingRes = await fetch('/api/pricing');
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          setPlans(prev => prev.map(p => {
            const remotePlan = pricingData[p.id];
            if (remotePlan) {
              return {
                ...p,
                price: typeof remotePlan === 'object' ? (remotePlan.price ?? p.price) : (Number(remotePlan) ?? p.price),
                features: remotePlan.features ?? p.features,
                limits: remotePlan.limits ?? p.limits,
              };
            }
            return p;
          }));
        }
      } catch (e) {
        console.error('Error fetching pricing:', e);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        setCurrentPlan(data?.plan || 'free');
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (invoice && invoice.payment_id && (paymentStatus === 'waiting' || paymentStatus === 'confirming')) {
      // Auto poll payment status every 8 seconds
      intervalId = setInterval(() => {
        checkInvoiceStatus(invoice.payment_id, true);
      }, 8000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [invoice, paymentStatus]);

  const handleSubscribe = (planId: string) => {
    setCheckoutPlan(planId);
    setInvoice(null);
    setPaymentStatus(null);
    setErrorMessage(null);
  };

  const generateInvoice = async () => {
    if (!checkoutPlan) return;
    setCreatingInvoice(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: checkoutPlan, payCurrency }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create payment checkout');
      setInvoice(data);
      setPaymentStatus(data.payment_status || 'waiting');
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
      if (data.status === 'finished') {
        setCurrentPlan(checkoutPlan || 'free');
        // Close modal after 3 seconds on success
        setTimeout(() => {
          setCheckoutPlan(null);
          setInvoice(null);
          setPaymentStatus(null);
        }, 3000);
      }
    } catch (e: any) {
      if (!silent) setErrorMessage(e.message);
    } finally {
      if (!silent) setCheckingStatus(false);
    }
  };

  return (
    <div className="sub-page">
      <style>{`
        .sub-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }
        .sub-modal-card {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          position: relative;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sub-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          font-size: 16px;
          color: var(--subtext);
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div className="sub-container">
        {/* Header */}
        <div className="sub-header">
          {onBack && (
            <button className="sub-back" onClick={onBack}>
              <ArrowLeft className="sub-back-icon" />
            </button>
          )}
          <div>
            <h2 className="sub-title">Choose your plan</h2>
            <p className="sub-subtitle">Unlock the full power of institutional AI trading</p>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="sub-grid">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isActive = (plan.id === 'starter' && currentPlan === 'free') ||
                             currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`sub-card ${plan.popular ? 'sub-card-popular' : ''} ${isActive ? 'sub-card-active' : ''}`}
              >
                {plan.popular && (
                  <div className="sub-badge">Most Popular</div>
                )}

                <div className="sub-card-head">
                  <div className="sub-icon" style={{ background: plan.gradient }}>
                    <Icon className="sub-icon-svg" />
                  </div>
                  <h3 className="sub-plan-name">{plan.name}</h3>
                </div>

                <div className="sub-price-row">
                  <span className="sub-dollar">$</span>
                  <span className="sub-amount">{plan.price}</span>
                  <span className="sub-period">{plan.period}</span>
                </div>

                <button
                  className={`sub-btn ${isActive ? 'sub-btn-current' : ''}`}
                  style={!isActive ? { background: plan.gradient } : {}}
                  disabled={isActive}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isActive ? 'Current Plan' : 'Get Started'}
                </button>

                <ul className="sub-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="sub-feature">
                      <Check className="sub-check" style={{ color: plan.color }} />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.limits.map((l, i) => (
                    <li key={`l-${i}`} className="sub-feature sub-feature-off">
                      <span className="sub-x">✕</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="sub-footer">
          All payments are processed securely via NOWPayments. Prices in USD.
        </p>
      </div>

      {/* NOWPayments Checkout Modal Overlay */}
      {checkoutPlan && (
        <div className="sub-modal-backdrop" onClick={() => {
          if (!creatingInvoice) {
            setCheckoutPlan(null);
            setInvoice(null);
            setPaymentStatus(null);
            setErrorMessage(null);
          }
        }}>
          <div className="sub-modal-card" onClick={e => e.stopPropagation()}>
            <button className="sub-modal-close" onClick={() => {
              setCheckoutPlan(null);
              setInvoice(null);
              setPaymentStatus(null);
              setErrorMessage(null);
            }}>✕</button>

            {!invoice ? (
              // Step 1: Select Coin & Confirm Amount
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  Pay via NOWPayments
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--subtext)' }}>
                  You are subscribing to the <strong style={{ color: 'var(--text)' }}>{plans.find(p => p.id === checkoutPlan)?.name}</strong> tier.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--subtext)' }}>Total price:</span>
                  <strong style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                    ${plans.find(p => p.id === checkoutPlan)?.price}/mo
                  </strong>
                </div>

                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 8 }}>
                  Select Payment Currency
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    { id: 'usdttrc20', name: 'USDT (TRC-20)', desc: 'Tether on TRON Network (Fast & Low Fee)', icon: 'usdt' },
                    { id: 'usdtbsc', name: 'USDT (BEP-20)', desc: 'Tether on BNB Chain', icon: 'usdt' },
                    { id: 'btc', name: 'Bitcoin (BTC)', desc: 'Original Cryptocurrency', icon: 'btc' },
                    { id: 'eth', name: 'Ethereum (ETH)', desc: 'Ether on Ethereum Mainnet', icon: 'eth' },
                    { id: 'ltc', name: 'Litecoin (LTC)', desc: 'Litecoin Digital Currency', icon: 'ltc' },
                  ].map(coin => (
                    <button
                      key={coin.id}
                      onClick={() => setPayCurrency(coin.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid',
                        borderColor: payCurrency === coin.id ? '#6366f1' : 'var(--border)',
                        background: payCurrency === coin.id ? 'rgba(99, 102, 241, 0.05)' : 'var(--input-bg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s'
                      }}
                    >
                      <img
                        src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.icon}.png`}
                        alt={coin.name}
                        width={26}
                        height={26}
                        style={{ borderRadius: 50, background: '#fff' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{coin.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--subtext)' }}>{coin.desc}</span>
                      </div>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: 50,
                        border: '2px solid',
                        borderColor: payCurrency === coin.id ? '#6366f1' : 'var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {payCurrency === coin.id && (
                          <div style={{ width: 8, height: 8, borderRadius: 50, background: '#6366f1' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {errorMessage && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  onClick={generateInvoice}
                  disabled={creatingInvoice}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                  }}
                >
                  {creatingInvoice ? (
                    <span className="auth-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  ) : (
                    'Generate Payment Invoice'
                  )}
                </button>
              </div>
            ) : (
              // Step 2: Show Invoice QR and payment instructions
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                  Complete Payment
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--subtext)' }}>
                  Send the exact crypto amount to the destination wallet address below:
                </p>

                {/* QR Code Container */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                  <div style={{ padding: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <img
                      src={`https://chart.googleapis.com/chart?chs=160x160&cht=qr&chl=${invoice.pay_address}`}
                      alt="QR Address"
                      width={160}
                      height={160}
                    />
                  </div>
                </div>

                {/* Amount Box */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 4 }}>Amount to Send</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1 }}>
                      {invoice.pay_amount} {invoice.pay_currency.toUpperCase()}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(String(invoice.pay_amount));
                        setCopiedAmt(true);
                        setTimeout(() => setCopiedAmt(false), 2000);
                      }}
                      style={{ fontSize: 11, fontWeight: 700, color: copiedAmt ? '#10b981' : '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                    >
                      {copiedAmt ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Address Box */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 4 }}>Destination Address</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {invoice.pay_address}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invoice.pay_address);
                        setCopiedAddr(true);
                        setTimeout(() => setCopiedAddr(false), 2000);
                      }}
                      style={{ fontSize: 11, fontWeight: 700, color: copiedAddr ? '#10b981' : '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                    >
                      {copiedAddr ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Payment Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 18 }}>
                  {paymentStatus === 'finished' ? (
                    <>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Payment Received! Activating Plan...</span>
                    </>
                  ) : paymentStatus === 'failed' || paymentStatus === 'expired' ? (
                    <>
                      <span style={{ fontSize: 16 }}>❌</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Payment Failed/Expired</span>
                    </>
                  ) : (
                    <>
                      <span className="auth-spinner" style={{ width: 14, height: 14, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
                        Status: <strong style={{ color: 'var(--text)' }}>{paymentStatus || 'waiting'}</strong> (Polling...)
                      </span>
                    </>
                  )}
                </div>

                {errorMessage && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#ef4444' }}>
                    {errorMessage}
                  </div>
                )}

                {/* Control buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => checkInvoiceStatus(invoice.payment_id)}
                    disabled={checkingStatus || paymentStatus === 'finished'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    {checkingStatus ? (
                      <span className="auth-spinner" style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--text)' }} />
                    ) : (
                      'Check Status'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCheckoutPlan(null);
                      setInvoice(null);
                      setPaymentStatus(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Close Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
