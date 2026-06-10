'use client';

import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Rocket, ArrowLeft, Copy, Shield, AlertTriangle, RefreshCw, X, Coins, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generateInvoicePdf } from '@/lib/invoicePdf';

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

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'invoices'>('plans');

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/subscriptions/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

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
      fetchHistory();
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

  const handleViewInvoice = async (item: any) => {
    setCheckoutPlan(item.plan_id);
    setPaymentStatus(item.status);
    setErrorMessage(null);

    if (item.pay_address) {
      setInvoice({
        payment_id: item.payment_id,
        pay_address: item.pay_address,
        pay_amount: item.pay_amount,
        pay_currency: item.pay_currency
      });
    } else {
      setCreatingInvoice(true);
      try {
        const res = await fetch(`/api/subscriptions/status?paymentId=${item.payment_id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch invoice details');
        
        setInvoice({
          payment_id: item.payment_id,
          pay_address: data.pay_address || '',
          pay_amount: data.pay_amount || item.pay_amount,
          pay_currency: data.pay_currency || item.pay_currency
        });
        setPaymentStatus(data.status);
      } catch (e: any) {
        setErrorMessage(e.message);
      } finally {
        setCreatingInvoice(false);
      }
    }
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
      fetchHistory();
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
      fetchHistory();
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
          background: rgba(8, 10, 16, 0.85);
          backdrop-filter: blur(16px) saturate(180%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          padding: 16px;
        }
        .sub-modal-card {
          background: var(--sidebar-bg, #111622);
          border: 1px solid var(--border);
          border-radius: 28px;
          width: 100%;
          max-width: 460px;
          padding: 32px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          color: var(--text);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          overflow: hidden;
        }
        .sub-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--subtext);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .sub-modal-close:hover {
          color: var(--text);
          background: var(--border);
          transform: rotate(90deg);
        }
        .crypto-option-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1.5px solid var(--border);
          background: var(--input-bg);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
        }
        .crypto-option-btn:hover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.04);
          transform: translateY(-1px);
        }
        .crypto-option-btn.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .deposit-qr-frame {
          padding: 16px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          display: inline-block;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .deposit-field-container {
          background: var(--input-bg);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .deposit-field-container:hover {
          border-color: rgba(99, 102, 241, 0.4);
        }
        .deposit-field-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--subtext);
          margin-bottom: 6px;
          display: block;
        }
        .deposit-badge-step {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 50px;
          background: rgba(99, 102, 241, 0.1);
          color: #8b5cf6;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .deposit-status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .deposit-status-banner::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #6366f1;
        }
        .deposit-status-banner.finished::before {
          background: #10b981;
        }
        .deposit-status-banner.failed::before {
          background: #ef4444;
        }
        .btn-action-primary {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
          transition: all 0.2s ease;
        }
        .btn-action-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.35);
        }
        .btn-action-primary:active {
          transform: translateY(0);
        }
        .btn-action-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-action-secondary {
          padding: 12px 20px;
          border-radius: 12px;
          border: 1.5px solid var(--border);
          background: var(--input-bg);
          color: var(--text);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-action-secondary:hover {
          background: var(--border);
          border-color: var(--subtext);
        }
        .invoice-history-section {
          margin-top: 48px;
          background: var(--sidebar-bg, #111622);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .invoice-table-wrapper {
          overflow-x: auto;
          margin-top: 20px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .invoice-table th {
          background: rgba(255, 255, 255, 0.02);
          padding: 14px 16px;
          color: var(--subtext);
          font-weight: 600;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .invoice-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          vertical-align: middle;
        }
        .invoice-table tr:last-child td {
          border-bottom: none;
        }
        .invoice-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .invoice-status-pill.completed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .invoice-status-pill.pending {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .invoice-status-pill.failed, .invoice-status-pill.expired {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .pdf-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #818cf8;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pdf-btn:hover {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
        }
        .sub-tab-nav {
          display: flex;
          gap: 4px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 4px;
          width: fit-content;
          margin: 0 auto 28px;
        }
        .sub-tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--subtext);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .sub-tab-btn:hover {
          color: var(--text);
          background: rgba(255,255,255,0.04);
        }
        .sub-tab-btn.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
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
            <h2 className="sub-title">{activeSubTab === 'plans' ? 'Choose your plan' : 'Invoice History'}</h2>
            <p className="sub-subtitle">
              {activeSubTab === 'plans'
                ? 'Unlock the full power of institutional AI trading'
                : 'Your payment records — subscriptions, course purchases, and deposit status'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="sub-tab-nav">
          <button
            className={`sub-tab-btn ${activeSubTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('plans')}
          >
            <Zap style={{ width: 14, height: 14 }} />
            Subscription Plans
          </button>
          <button
            className={`sub-tab-btn ${activeSubTab === 'invoices' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('invoices'); fetchHistory(); }}
          >
            <Coins style={{ width: 14, height: 14 }} />
            Invoice History
            {history.length > 0 && (
              <span style={{
                background: 'rgba(99,102,241,0.2)',
                color: activeSubTab === 'invoices' ? '#fff' : '#818cf8',
                borderRadius: 20,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
                minWidth: 20,
                textAlign: 'center',
              }}>{history.length}</span>
            )}
          </button>
        </div>

        {/* Plans Grid */}
        {activeSubTab === 'plans' && (
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
        )} {/* end activeSubTab === 'plans' */}

        {/* Invoice History Tab */}
        {activeSubTab === 'invoices' && (
        <div className="invoice-history-section" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Coins style={{ width: 20, height: 20, color: '#6366f1' }} />
                Billing & Invoice History
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--subtext)' }}>
                Real-time status of your crypto subscription deposits. Click a status to view QR code. Download PDF receipts.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--subtext)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: 'var(--subtext)' }}>
              <RefreshCw className="bm-spin" style={{ width: 18, height: 18 }} />
              <span>Loading invoice history...</span>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--subtext)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 16 }}>
              <Coins style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No invoices yet</div>
              <div>Go to <button onClick={() => setActiveSubTab('plans')} style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Subscription Plans</button> to get started.</div>
            </div>
          ) : (
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item: any) => {
                    const isCourse = item.type === 'course_purchase';
                    const displayId = String(item.payment_id || item.id || '').slice(0, 12);
                    return (
                      <tr key={item.payment_id || item.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--subtext)', fontSize: 12 }}>
                          {displayId}…
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 50, fontSize: 10, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.3px',
                            background: isCourse ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                            color: isCourse ? '#f59e0b' : '#818cf8',
                          }}>
                            {isCourse ? '📚 Course' : '⚡ Plan'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--text)' }}>
                          {isCourse ? (item.category || item.plan_id || '—') : (item.plan_id || '—')}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{item.pay_amount ?? item.price_amount ?? '—'}</span>{' '}
                          <span style={{ fontSize: 11, color: 'var(--subtext)' }}>{(item.pay_currency || 'USD').toUpperCase()}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>
                          ${(Number(item.price_amount) || 0).toFixed(2)}
                        </td>
                        <td>
                          {isCourse && item.status === 'completed' ? (
                            <span className="invoice-status-pill completed">Completed</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => !isCourse && handleViewInvoice(item)}
                              className={`invoice-status-pill ${item.status}`}
                              style={{ border: 'none', cursor: isCourse ? 'default' : 'pointer', transition: 'all 0.15s', outline: 'none' }}
                              title={isCourse ? '' : 'Click to view payment QR code'}
                            >
                              {item.status === 'completed' || item.status === 'finished' ? 'Completed' : item.status}
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={async () => {
                              const configRes = await fetch('/api/invoice-config');
                              const invoiceCfg = configRes.ok ? await configRes.json() : undefined;
                              await generateInvoicePdf(item, invoiceCfg);
                            }}
                            className="pdf-btn"
                          >
                            <ExternalLink style={{ width: 12, height: 12 }} />
                            PDF Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )} {/* end activeSubTab === 'invoices' */}

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
            }} aria-label="Close dialog"><X style={{ width: 16, height: 16 }} /></button>

            {!invoice ? (
              // Step 1: Select Coin & Confirm Amount
              <div>
                <div className="deposit-badge-step">
                  <Shield style={{ width: 12, height: 12 }} /> SECURE DEPOSIT
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  Choose Crypto Network
                </h4>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--subtext)', lineHeight: 1.4 }}>
                  You are activating the <strong style={{ color: 'var(--text)' }}>{plans.find(p => p.id === checkoutPlan)?.name} Tier</strong> subscription.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 16, padding: '14px 18px', marginBottom: 24 }}>
                  <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 500 }}>Invoice total:</span>
                  <strong style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>
                    ${plans.find(p => p.id === checkoutPlan)?.price} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--subtext)' }}>/ mo</span>
                  </strong>
                </div>

                <label className="deposit-field-label">
                  Supported Assets
                </label>
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
                      <RefreshCw className="bm-spin" style={{ width: 16, height: 16 }} />
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
              // Step 2: Show Invoice QR and payment instructions
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

                {/* QR Code Container */}
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

                {/* Amount Box */}
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

                {/* Address Box */}
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

                {/* Payment Status Indicator */}
                <div className={`deposit-status-banner ${paymentStatus === 'finished' ? 'finished' : paymentStatus === 'failed' || paymentStatus === 'expired' ? 'failed' : ''}`}>
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
                  ) : paymentStatus === 'failed' || paymentStatus === 'expired' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <X style={{ width: 14, height: 14 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>Payment Failed / Expired</span>
                        <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>Please try creating a new invoice.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="bm-spin" style={{ width: 16, height: 16, color: '#6366f1' }} />
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

                {/* Control buttons */}
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
                        <RefreshCw className="bm-spin" style={{ width: 14, height: 14 }} />
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
                    onClick={() => {
                      setCheckoutPlan(null);
                      setInvoice(null);
                      setPaymentStatus(null);
                    }}
                    className="btn-action-secondary"
                    style={{ flex: 1, color: '#ffffff', background: '#ef4444', borderColor: '#ef4444' }}
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
