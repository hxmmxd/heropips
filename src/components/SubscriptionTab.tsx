'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Sub-components
import PlansGrid from './subscription/PlansGrid';
import CheckoutModal from './subscription/CheckoutModal';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionTabProps {
  onBack?: () => void;
}

const defaultPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/forever',
    icon: Zap,
    color: '#8e8a82',
    gradient: 'linear-gradient(135deg, #a8a29e, #78716c)',
    popular: false,
    description: 'For exploring what’s possible',
    features: [
      '3 AI trade signals per day',
      '250 tokens/response (2,500/day limit)',
      '1 broker connection',
      'Basic market analysis',
      'Standard execution speed',
      'Direct Execute only',
      '3-day trade history reports',
      'Standard community support',
    ],
    limits: [
      'Referral withdrawals locked',
      'No manager signal execution',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10,
    period: '/month',
    icon: Zap,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    popular: true,
    description: 'For professional traders & scaling portfolios',
    features: [
      'Unlimited AI trade signals',
      '500 tokens/response (Institutional grade)',
      'Unlimited daily chat tokens',
      '5 broker connections',
      'Both Direct & Manager Execution',
      'Unlimited referral withdrawals',
      'Full trade history reports',
      'Priority execution speed',
      'Dedicated account manager',
    ],
    limits: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 100,
    period: '/month',
    icon: Zap,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    popular: false,
    description: 'For hedge funds & institutional trading firms',
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

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // NOWPayments states
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

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
                description: remotePlan.description ?? p.description,
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

  const handleSubscribe = (planId: string) => {
    // If Pro is chosen with yearly billing, calculate the custom discounted yearly price to load into modal!
    setCheckoutPlan(planId);
    setInvoice(null);
    setPaymentStatus(null);
  };

  return (
    <div 
      className="sub-page py-5 md:py-6 px-4 min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(var(--border) 1.2px, transparent 1.2px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-0 left-[15%] w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-blue-600/10 to-indigo-500/10 blur-[110px] pointer-events-none -z-10 animate-pulse duration-10000" />
      <div className="absolute bottom-10 right-[15%] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-violet-600/10 to-fuchsia-500/10 blur-[110px] pointer-events-none -z-10 animate-pulse duration-8000" />

      <div className="sub-container max-w-[540px] md:max-w-[760px] mx-auto flex flex-col relative z-10">
        {/* Back Button Row */}
        {onBack && (
          <div className="mb-3 flex justify-start md:hidden">
            <button className="sub-back" onClick={onBack}>
              <ArrowLeft className="sub-back-icon" />
            </button>
          </div>
        )}

        {/* Heading Row */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-black text-[var(--text)] tracking-tight">
            Compare HeroPips plans
          </h2>
          <p className="text-[9.5px] text-[var(--subtext)] font-extrabold uppercase tracking-widest mt-1.5">
            Choose the best plan for you
          </p>
        </div>

          {/* Monthly / Yearly Billing Toggle Pill */}
          <div className="flex justify-center mb-4.5">
            <div className="inline-flex p-0.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-full items-center gap-1 relative overflow-hidden">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-black transition-colors duration-200 ${
                  billingPeriod === 'monthly'
                    ? 'text-neutral-900 shadow-sm'
                    : 'text-[var(--subtext)] hover:text-[var(--text)]'
                }`}
              >
                {billingPeriod === 'monthly' && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-neutral-200/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-black transition-colors duration-200 flex items-center gap-2.5 ${
                  billingPeriod === 'yearly'
                    ? 'text-neutral-900 shadow-sm'
                    : 'text-[var(--subtext)] hover:text-[var(--text)]'
                }`}
              >
                {billingPeriod === 'yearly' && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-neutral-200/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span>Yearly</span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/15">
                  <Tag className="w-2.5 h-2.5 text-blue-600 dark:text-blue-500 fill-current" />
                  Save 60%
                </span>
              </button>
            </div>
          </div>

        {/* Plans List Stack */}
        <PlansGrid
          plans={plans}
          currentPlan={currentPlan}
          onSubscribe={handleSubscribe}
          billingPeriod={billingPeriod}
          region={{ code: 'US', label: 'United States', currency: 'USD', symbol: '$', rate: 1 }}
        />

        {/* Divider */}
        <hr className="border-[var(--border)]/45 my-5" />

        {/* Footer Note */}
        <div className="sub-footer text-center space-y-2 max-w-[720px] mx-auto pb-4 opacity-85">
          <p className="text-[10.5px] text-[var(--subtext)] font-semibold tracking-wide">
            All payments are processed securely via NOWPayments. Prices calculated in USD.
          </p>
          <p className="text-[9.5px] text-[var(--subtext)]/80 leading-relaxed font-medium max-w-[640px] mx-auto">
            *HeroPips is powered by large language models. While it can produce powerful results, its behavior is probabilistic — meaning it may occasionally make mistakes. Please verify and confirm all transactions independently.
          </p>
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      <AnimatePresence>
        {checkoutPlan && (
          <CheckoutModal
            isOpen={!!checkoutPlan}
            onClose={() => {
              setCheckoutPlan(null);
              setInvoice(null);
              setPaymentStatus(null);
            }}
            planId={checkoutPlan}
            planName={plans.find(p => p.id === checkoutPlan)?.name || 'Paid'}
            planPrice={
              (() => {
                const base = plans.find(p => p.id === checkoutPlan)?.price || 0;
                return billingPeriod === 'yearly' ? Math.round(base * 0.9) : base;
              })()
            }
            initialInvoice={invoice}
            initialStatus={paymentStatus}
            onSuccess={(planId) => {
              setCurrentPlan(planId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
