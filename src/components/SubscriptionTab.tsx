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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState(defaultPlans);
  const supabase = createClient();

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

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId);
    // Simulate processing — in production, integrate Stripe/Razorpay here
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          plan: planId === 'starter' ? 'free' : planId,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
        setCurrentPlan(planId === 'starter' ? 'free' : planId);
      }
      setSelectedPlan(null);
    }, 1500);
  };

  return (
    <div className="sub-page">
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
            const isLoading = selectedPlan === plan.id;

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
                  disabled={isActive || isLoading}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isLoading ? (
                    <span className="auth-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  ) : isActive ? (
                    'Current Plan'
                  ) : (
                    'Get Started'
                  )}
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
          All plans include a 7-day free trial. Cancel anytime. Prices in USD.
        </p>
      </div>
    </div>
  );
}
