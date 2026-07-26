'use client';

import React from 'react';
import { Check, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  icon: React.ComponentType<any>;
  color: string;
  gradient: string;
  popular: boolean;
  features: string[];
  limits: string[];
  description?: string;
}

interface PlansGridProps {
  plans: Plan[];
  currentPlan: string;
  onSubscribe: (planId: string) => void;
  billingPeriod: 'monthly' | 'yearly';
  region: { code: string; label: string; currency: string; symbol: string; rate: number };
}

export default function PlansGrid({ plans, currentPlan, onSubscribe, billingPeriod }: PlansGridProps) {
  // Order: Pro -> Free -> Enterprise (Free in center)
  const planOrder: Record<string, number> = { pro: 1, free: 2, enterprise: 3 };
  const sortedPlans = [...plans].sort((a, b) => (planOrder[a.id] || 99) - (planOrder[b.id] || 99));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col lg:flex-row gap-5 max-w-[1050px] mx-auto w-full px-2 items-stretch justify-center"
    >
      {sortedPlans.map((plan) => {
        const isActive = (plan.id === 'free' && (currentPlan === 'free' || currentPlan === 'starter' || !currentPlan)) ||
                         (plan.id === 'pro' && currentPlan === 'pro') ||
                         (plan.id === 'enterprise' && currentPlan === 'enterprise');

        // Resolve pricing matrix
        let originalPrice = 0;
        let activePrice = plan.price || 0;
        let periodLabel = '';
        let discountNote = '';

        if (plan.id === 'free') {
          originalPrice = 10;
          activePrice = 0;
          periodLabel = 'forever';
          discountNote = '100% OFF (Special Offer)';
        } else if (plan.id === 'pro') {
          if (billingPeriod === 'monthly') {
            originalPrice = 25;
            activePrice = plan.price || 10;
            periodLabel = 'month';
            discountNote = 'Coupon applied ($15 off)';
          } else {
            originalPrice = 250;
            activePrice = Math.round((plan.price || 10) * 10);
            periodLabel = 'year';
            discountNote = 'Special Offer (Save 60%)';
          }
        } else if (plan.id === 'enterprise') {
          if (billingPeriod === 'monthly') {
            originalPrice = 200;
            activePrice = plan.price || 100;
            periodLabel = 'month';
            discountNote = 'Institutional Tier';
          } else {
            originalPrice = 2000;
            activePrice = Math.round((plan.price || 100) * 8);
            periodLabel = 'year';
            discountNote = 'Annual Contract (Save 33%)';
          }
        }

        return (
          <motion.div
            key={plan.id}
            whileHover={{ y: -2, scale: 1.006 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={`relative w-full lg:flex-1 rounded-2xl p-4 md:p-[18px] border backdrop-blur-[6px] transition-all duration-300 ${
              plan.popular 
                ? 'bg-[var(--sidebar-bg)]/85 shadow-[0_12px_36px_-10px_rgba(59,130,246,0.18)] hover:shadow-[0_16px_40px_-8px_rgba(59,130,246,0.25)]' 
                : 'bg-[var(--sidebar-bg)]/55 border-[var(--border)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.05)] opacity-95'
            }`}
            style={{ 
              borderColor: plan.popular ? 'var(--accent)' : 'var(--border)',
              borderWidth: plan.popular ? '1.5px' : '1px'
            }}
          >
            {/* Header section with Name & Badge */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--subtext)] opacity-75 block mb-0.5">
                  {plan.id === 'free' ? 'Starter' : 'Premium'}
                </span>
                <h3 className="text-xl font-black text-[var(--text)] tracking-tight leading-none">
                  {plan.id === 'free' ? 'Free' : plan.name}
                </h3>
              </div>
              
              {isActive && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full shadow-sm">
                  Active
                </span>
              )}
            </div>

            {/* Price Row */}
            <div className="flex flex-col gap-0.5 mb-3">
              {plan.id === 'enterprise' ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[var(--text)] tracking-tighter leading-none">
                      Custom
                    </span>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[8px] text-amber-500 font-extrabold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded-md self-start mt-0.5 border border-amber-500/15"
                  >
                    Contact Us For Pricing
                  </motion.span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    {originalPrice > 0 && (
                      <div className="relative inline-flex items-center mr-1.5">
                        <motion.span
                          key={`orig-val-${billingPeriod}`}
                          initial={{ opacity: 0, scale: 0.9, y: 2 }}
                          animate={{ opacity: 0.75, scale: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-base md:text-lg font-extrabold text-[var(--subtext)] select-none"
                        >
                          ${originalPrice}
                        </motion.span>
                        {/* Animated Strike-Through Red Line Slash */}
                        <motion.div
                          key={`strike-${billingPeriod}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-1/2 left-0 right-0 h-[2.5px] bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.7)] origin-left"
                        />
                      </div>
                    )}

                    <span className="text-sm font-bold text-[var(--subtext)]">$</span>
                    
                    <motion.span
                      key={`active-${billingPeriod}`}
                      initial={{ opacity: 0, scale: 0.8, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.25, type: 'spring', stiffness: 400, damping: 25 }}
                      className="text-3xl font-black text-[var(--text)] tracking-tighter leading-none"
                    >
                      {activePrice}
                    </motion.span>
                    
                    <span className="text-[10px] text-[var(--subtext)] font-semibold ml-0.5">
                      per {periodLabel}
                    </span>
                  </div>
                  {discountNote && (
                    <motion.span
                      key={`note-${billingPeriod}`}
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, delay: 0.35 }}
                      className="text-[8.5px] text-emerald-500 font-extrabold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md self-start mt-1 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.12)] flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {discountNote}
                    </motion.span>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            {plan.description && (
              <p className="text-[11px] text-[var(--subtext)] mb-4 font-medium leading-normal">
                {plan.description}
              </p>
            )}

            {/* Dynamic Action Button */}
            <motion.button
              whileTap={isActive ? undefined : { scale: 0.98 }}
              onClick={() => {
                if (isActive) return;
                if (plan.id === 'enterprise') {
                  window.location.href = 'mailto:contact@tradegpt.ai?subject=Enterprise%20Plan%20Inquiry';
                } else {
                  onSubscribe(plan.id);
                }
              }}
              disabled={isActive}
              className={`group w-full py-2.5 rounded-xl font-black uppercase text-[10px] tracking-[0.12em] transition-all flex items-center justify-center gap-1.5 ${
                isActive 
                  ? 'bg-[var(--input-bg)] text-[var(--subtext)] border border-[var(--border)] cursor-default' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/5 hover:shadow-blue-500/15 active:scale-[0.98]'
              }`}
            >
              {isActive ? (
                'Current Plan'
              ) : plan.id === 'enterprise' ? (
                <span className="flex items-center gap-1">
                  Contact Us
                  <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  {plan.id === 'pro' ? `Continue with ${plan.name}` : 'Get Started'}
                  <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </motion.button>

            {/* Features Checklist */}
            <ul className="mt-4 space-y-1.5 pt-4 border-t border-[var(--border)]/55">
              {plan.features.map((f, i) => {
                const isUpgradeFeature = f.toLowerCase().startsWith('everything in');
                return (
                  <li key={i} className="flex items-start gap-2 text-[10.5px] text-[var(--text)]">
                    {isUpgradeFeature ? (
                      <Plus className="w-3 h-3 text-[var(--subtext)] flex-shrink-0 mt-0.5" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={isUpgradeFeature ? 'text-[var(--subtext)] font-bold' : 'font-medium'}>
                      {f}
                    </span>
                  </li>
                );
              })}
              {plan.limits.map((l, i) => (
                <li key={`l-${i}`} className="flex items-start gap-2 text-[10.5px] text-[var(--subtext)]/55">
                  <span className="w-3 text-center text-[9px] flex-shrink-0 mt-0.5">✕</span>
                  <span className="line-through">{l}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
