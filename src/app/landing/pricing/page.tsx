'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeDollarSign, Check, Minus, ArrowRight, ChevronDown, Zap,
  Shield, Crown, Sparkles, HelpCircle, Landmark
} from 'lucide-react';

// ---------------------------------------------------------
// DATA
// ---------------------------------------------------------

interface Tier {
  key: string;
  icon: typeof Zap;
  name: string;
  tagline: string;
  monthly: number;      // USD / month, billed monthly
  annualMonthly: number; // effective USD / month when billed annually (~2 months free)
  featured?: boolean;
  cta: string;
  features: string[];
}

const TIERS: Tier[] = [
  {
    key: 'starter',
    icon: Zap,
    name: 'Starter',
    tagline: 'Learn the system with delayed data — free forever.',
    monthly: 0,
    annualMonthly: 0,
    cta: 'Start for free',
    features: [
      'Signal feed delayed by 60 minutes',
      'Full 12-gate audit trail on every signal',
      'Basic analytics (equity curve, win rate)',
      'Community market chat access',
      'Documentation & getting-started guides',
    ],
  },
  {
    key: 'pro',
    icon: Shield,
    name: 'Pro',
    tagline: 'The full real-time desk for the individual trader.',
    monthly: 49,
    annualMonthly: 41,
    featured: true,
    cta: 'Start Pro',
    features: [
      'Real-time signal feed, all grades',
      'Risk Governor with custom drawdown limits',
      'Full analytics suite & trade journal',
      'MT5 broker bridge (1 account)',
      'Telegram alert routing',
      'Trade review channel access',
    ],
  },
  {
    key: 'elite',
    icon: Crown,
    name: 'Elite Desk',
    tagline: 'For serious operators, funded traders, and small desks.',
    monthly: 149,
    annualMonthly: 124,
    cta: 'Start Elite Desk',
    features: [
      'Everything in Pro',
      'MT5 bridge for up to 5 accounts',
      'REST & webhook API access',
      '2 monthly 1-on-1 mentorship credits',
      'Priority support (same-day response)',
      'Prop-firm rule templates (FTMO-style)',
    ],
  },
];

interface CompareRow {
  label: string;
  starter: string | boolean;
  pro: string | boolean;
  elite: string | boolean;
}

interface CompareGroup {
  group: string;
  rows: CompareRow[];
}

const COMPARE: CompareGroup[] = [
  {
    group: 'Signals',
    rows: [
      { label: 'Signal feed', starter: '60-min delay', pro: 'Real-time', elite: 'Real-time' },
      { label: '12-gate audit trail', starter: true, pro: true, elite: true },
      { label: 'Signal grades included', starter: 'AA & AAA only', pro: 'All grades', elite: 'All grades' },
      { label: 'Session & pair filters', starter: false, pro: true, elite: true },
    ],
  },
  {
    group: 'Risk & Analytics',
    rows: [
      { label: 'Risk Governor', starter: false, pro: true, elite: true },
      { label: 'Position sizing calculator', starter: true, pro: true, elite: true },
      { label: 'Analytics suite', starter: 'Basic', pro: 'Full', elite: 'Full' },
      { label: 'Prop-firm rule templates', starter: false, pro: false, elite: true },
    ],
  },
  {
    group: 'Execution & Integrations',
    rows: [
      { label: 'MT5 broker bridge', starter: false, pro: '1 account', elite: '5 accounts' },
      { label: 'Telegram alert routing', starter: false, pro: true, elite: true },
      { label: 'REST & webhook API', starter: false, pro: false, elite: true },
    ],
  },
  {
    group: 'Community & Support',
    rows: [
      { label: 'Market chat rooms', starter: true, pro: true, elite: true },
      { label: 'Trade review channel', starter: false, pro: true, elite: true },
      { label: 'Mentorship credits', starter: false, pro: false, elite: '2 / month' },
      { label: 'Support response', starter: 'Community', pro: '24–48 h', elite: 'Same day' },
    ],
  },
];

const FAQS = [
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Plans are month-to-month (or year-to-year) with no lock-in. Cancel from your billing panel in two clicks and your plan simply runs out at the end of the paid period — no retention calls, no penalty fees. Annual plans can also be cancelled anytime and remain active until the term ends.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Monthly plans come with a 7-day money-back guarantee on your first subscription — if the platform is not for you, email support within a week of your first charge for a full refund. Annual plans are refundable pro-rata within the first 30 days. Renewals are not refundable, which is why we send a reminder before every renewal.',
  },
  {
    q: 'Which brokers are compatible?',
    a: 'Any broker that offers MetaTrader 5 accounts works with the HeroPips bridge — that covers the vast majority of retail and prop-firm brokers. We connect with trade-only credentials; withdrawal permissions are never requested. MT4-only brokers are not currently supported.',
  },
  {
    q: 'How are signals delivered?',
    a: 'Signals publish simultaneously to your HeroPips terminal dashboard and, on Pro and above, to your linked Telegram channel — typically within seconds of the final gate clearing. Elite Desk subscribers can additionally consume signals programmatically via signed webhooks or the REST API.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. HeroPips is an analytics and signal-research platform. Signals are quantitative probability assessments, not personalised recommendations, and nothing on this site constitutes financial, investment, or trading advice. You remain solely responsible for every trading decision and should consult a licensed advisor where appropriate.',
  },
  {
    q: 'What happens to my data and API keys if I downgrade?',
    a: 'Your journal, analytics history, and settings are retained on every tier, including Starter. Downgrading disables paid features (real-time feed, bridge connections, API keys are deactivated — not deleted) so everything resumes exactly where you left it if you upgrade again.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={16} style={{ color: 'var(--volt-500)' }} aria-label="Included" />;
  if (value === false) return <Minus size={15} style={{ color: 'var(--pr-ink-low)', opacity: 0.6 }} aria-label="Not included" />;
  return <span className="pr-cell-text">{value}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    document.title = 'HeroPips | Pricing';
  }, []);

  const isAnnual = billing === 'annual';

  return (
    <div className="pr-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .pr-page {
          /* page-scoped tokens — light theme */
          --pr-surface: #ffffff;
          --pr-surface-soft: rgba(11, 15, 25, 0.025);
          --pr-border: rgba(11, 15, 25, 0.09);
          --pr-border-soft: rgba(11, 15, 25, 0.06);
          --pr-ink: var(--text-hi);
          --pr-ink-mid: var(--text-mid);
          --pr-ink-low: var(--text-low);
          --pr-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          background: var(--lp-bg, var(--bg-app));
          color: var(--pr-ink);
          padding: 120px 24px 0;
        }
        .dark .pr-page {
          --pr-surface: rgba(255, 255, 255, 0.04);
          --pr-surface-soft: rgba(255, 255, 255, 0.03);
          --pr-border: rgba(255, 255, 255, 0.12);
          --pr-border-soft: rgba(255, 255, 255, 0.07);
          --pr-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }
        .pr-inner { max-width: var(--max-w); margin: 0 auto; width: 100%; }

        /* ── Hero ── */
        .pr-hero { text-align: center; padding: 24px 0 48px; }
        .pr-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--volt-500);
          border: 1px solid var(--pr-border); border-radius: 9999px;
          padding: 6px 14px; margin-bottom: 18px;
          background: var(--pr-surface-soft);
        }
        .pr-title {
          font-size: clamp(32px, 5vw, 52px); font-weight: 800;
          letter-spacing: -2px; line-height: 1.08; color: var(--pr-ink);
          margin-bottom: 16px;
        }
        .pr-title em { font-style: italic; color: var(--volt-500); }
        .pr-sub {
          font-size: 15.5px; color: var(--pr-ink-mid); line-height: 1.65;
          max-width: 600px; margin: 0 auto 32px;
        }

        /* ── Billing toggle ── */
        .pr-toggle-wrap { display: flex; justify-content: center; align-items: center; gap: 12px; }
        .pr-toggle {
          display: inline-flex; padding: 4px; gap: 4px;
          background: var(--pr-surface-soft); border: 1px solid var(--pr-border);
          border-radius: 9999px;
        }
        .pr-toggle-btn {
          font-size: 13px; font-weight: 700; font-family: inherit;
          padding: 8px 20px; border-radius: 9999px; cursor: pointer;
          border: none; background: transparent; color: var(--pr-ink-mid);
          transition: all 0.2s ease;
        }
        .pr-toggle-btn.active {
          background: var(--pr-ink); color: var(--lp-bg, var(--bg-app));
        }
        .pr-toggle-save {
          font-size: 11px; font-weight: 800; color: var(--volt-500);
          border: 1px dashed var(--volt-500); border-radius: 9999px;
          padding: 4px 10px; white-space: nowrap;
        }

        /* ── Tier cards ── */
        .pr-tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px 0 8px; align-items: stretch; }
        .pr-tier {
          display: flex; flex-direction: column;
          background: var(--pr-surface); border: 1px solid var(--pr-border);
          border-radius: 20px; padding: 30px; position: relative;
          box-shadow: var(--pr-shadow);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .pr-tier:hover { transform: translateY(-4px); }
        .pr-tier.featured { border-color: var(--volt-500); border-width: 1.5px; }
        .pr-tier-flag {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          background: var(--volt-500); color: #090a0f;
          padding: 5px 14px; border-radius: 9999px; white-space: nowrap;
        }
        .pr-tier-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .pr-tier-icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: var(--pr-surface-soft); border: 1px solid var(--pr-border-soft);
          color: var(--volt-500);
        }
        .pr-tier-name { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: var(--pr-ink); }
        .pr-tier-tagline { font-size: 12.5px; color: var(--pr-ink-mid); line-height: 1.55; margin-bottom: 20px; min-height: 38px; }
        .pr-tier-price-row { display: flex; align-items: flex-end; gap: 6px; margin-bottom: 4px; }
        .pr-tier-price {
          font-size: 42px; font-weight: 800; letter-spacing: -2px; line-height: 1;
          color: var(--pr-ink); font-variant-numeric: tabular-nums;
        }
        .pr-tier-per { font-size: 13px; font-weight: 600; color: var(--pr-ink-low); padding-bottom: 5px; }
        .pr-tier-billnote { font-size: 11px; color: var(--pr-ink-low); min-height: 15px; margin-bottom: 20px; }
        .pr-tier-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          padding: 12px 22px; border-radius: 9999px; margin-bottom: 22px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .pr-tier-cta.solid { background: var(--volt-500); color: #090a0f; }
        .pr-tier-cta.solid:hover { background: var(--volt-500-hover); transform: translateY(-1px); }
        .pr-tier-cta.ghost {
          background: transparent; color: var(--pr-ink);
          border: 1px solid var(--pr-border);
        }
        .pr-tier-cta.ghost:hover { border-color: var(--pr-ink); transform: translateY(-1px); }
        .pr-tier-features { display: flex; flex-direction: column; gap: 10px; }
        .pr-tier-feature {
          display: flex; gap: 9px; align-items: flex-start;
          font-size: 12.5px; color: var(--pr-ink-mid); line-height: 1.5;
        }
        .pr-tier-feature svg { flex-shrink: 0; margin-top: 2px; color: var(--volt-500); }

        /* ── Section scaffolding ── */
        .pr-section { padding: 64px 0 0; }
        .pr-section-head { margin-bottom: 28px; text-align: center; }
        .pr-section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--volt-500); margin-bottom: 10px;
        }
        .pr-section-title {
          font-size: clamp(24px, 3vw, 32px); font-weight: 800;
          letter-spacing: -1.2px; color: var(--pr-ink); margin-bottom: 10px;
        }
        .pr-section-desc {
          font-size: 14.5px; color: var(--pr-ink-mid); line-height: 1.6;
          max-width: 600px; margin: 0 auto;
        }

        /* ── Comparison table ── */
        .pr-table-scroll {
          overflow-x: auto; border: 1px solid var(--pr-border); border-radius: 18px;
          background: var(--pr-surface); box-shadow: var(--pr-shadow);
        }
        .pr-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .pr-table th, .pr-table td {
          padding: 13px 20px; text-align: center; font-size: 13px;
          border-bottom: 1px solid var(--pr-border-soft);
        }
        .pr-table th:first-child, .pr-table td:first-child { text-align: left; }
        .pr-table thead th {
          font-size: 13.5px; font-weight: 800; color: var(--pr-ink);
          background: var(--pr-surface-soft);
        }
        .pr-table thead th.featured-col { color: var(--volt-500); }
        .pr-th-price { display: block; font-size: 10.5px; font-weight: 600; color: var(--pr-ink-low); margin-top: 2px; }
        .pr-row-label { color: var(--pr-ink-mid); font-weight: 600; }
        .pr-group-row td {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--volt-500);
          background: var(--pr-surface-soft); padding: 9px 20px;
        }
        .pr-cell-text { font-weight: 600; color: var(--pr-ink); font-size: 12.5px; }
        .pr-table tbody tr:last-child td { border-bottom: none; }

        /* ── FAQ ── */
        .pr-faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
        .pr-faq-item {
          background: var(--pr-surface); border: 1px solid var(--pr-border);
          border-radius: 14px; overflow: hidden; transition: border-color 0.2s ease;
        }
        .pr-faq-item.open { border-color: var(--volt-500); }
        .pr-faq-q {
          width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 16px;
          font-size: 14.5px; font-weight: 700; font-family: inherit; text-align: left;
          color: var(--pr-ink); background: transparent; border: none; cursor: pointer;
          padding: 18px 22px;
        }
        .pr-faq-chevron { flex-shrink: 0; color: var(--pr-ink-low); transition: transform 0.25s ease; }
        .pr-faq-item.open .pr-faq-chevron { transform: rotate(180deg); color: var(--volt-500); }
        .pr-faq-a {
          font-size: 13.5px; color: var(--pr-ink-mid); line-height: 1.7;
          padding: 0 22px 18px;
        }

        /* ── Final CTA ── */
        .pr-cta {
          margin: 72px 0 0; text-align: center;
          background: var(--pr-ink); border-radius: 24px; padding: 64px 32px;
          position: relative; overflow: hidden;
        }
        .dark .pr-cta { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--pr-border); }
        .pr-cta::after {
          content: ''; position: absolute; bottom: -100px; left: 50%;
          transform: translateX(-50%); width: 520px; height: 260px;
          background: radial-gradient(ellipse at center, rgba(198, 255, 46, 0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .pr-cta-title {
          font-size: clamp(24px, 3.5vw, 36px); font-weight: 800;
          letter-spacing: -1.4px; color: #ffffff; margin-bottom: 12px;
          position: relative; z-index: 1;
        }
        .pr-cta-sub {
          font-size: 14.5px; color: rgba(255, 255, 255, 0.65);
          max-width: 480px; margin: 0 auto 28px; line-height: 1.6;
          position: relative; z-index: 1;
        }
        .pr-cta-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--volt-500); color: #090a0f;
          font-size: 14px; font-weight: 700; text-decoration: none;
          padding: 13px 28px; border-radius: 9999px;
          position: relative; z-index: 1;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .pr-cta-btn:hover { transform: translateY(-2px); background: var(--volt-500-hover); }

        /* ── Compliance footnote ── */
        .pr-disclaimer {
          max-width: 860px; margin: 40px auto 96px;
          display: flex; gap: 12px; align-items: flex-start;
          font-size: 11px; color: var(--pr-ink-low); line-height: 1.7;
          border: 1px solid var(--pr-border-soft); border-radius: 12px;
          background: var(--pr-surface-soft); padding: 16px 18px;
        }
        .pr-disclaimer svg { flex-shrink: 0; margin-top: 2px; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .pr-tiers { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .pr-page { padding: 100px 16px 0; }
          .pr-toggle-wrap { flex-wrap: wrap; }
        }
      ` }} />

      <div className="pr-inner">
        {/* ── HERO ── */}
        <motion.section className="pr-hero" initial="hidden" animate="visible" variants={fadeUp}>
          <span className="pr-eyebrow">
            <BadgeDollarSign size={12} />
            Pricing
          </span>
          <h1 className="pr-title">
            Institutional tooling.<br />
            <em>Retail</em> pricing.
          </h1>
          <p className="pr-sub">
            Every tier runs the same 12-gate validation engine — you choose the latency,
            the governance depth, and the level of human support. Upgrade, downgrade, or
            cancel whenever you like.
          </p>

          <div className="pr-toggle-wrap">
            <div className="pr-toggle" role="tablist" aria-label="Billing period">
              <button
                type="button"
                className={`pr-toggle-btn ${!isAnnual ? 'active' : ''}`}
                onClick={() => setBilling('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`pr-toggle-btn ${isAnnual ? 'active' : ''}`}
                onClick={() => setBilling('annual')}
              >
                Annual
              </button>
            </div>
            <span className="pr-toggle-save">
              <Sparkles size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
              2 months free on annual
            </span>
          </div>
        </motion.section>

        {/* ── TIERS ── */}
        <section className="pr-tiers">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const price = isAnnual ? tier.annualMonthly : tier.monthly;
            return (
              <motion.div
                key={tier.key}
                className={`pr-tier ${tier.featured ? 'featured' : ''}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                {tier.featured && (
                  <span className="pr-tier-flag"><Sparkles size={11} /> Most popular</span>
                )}
                <div className="pr-tier-head">
                  <span className="pr-tier-icon"><Icon size={17} /></span>
                  <h2 className="pr-tier-name">{tier.name}</h2>
                </div>
                <p className="pr-tier-tagline">{tier.tagline}</p>

                <div className="pr-tier-price-row">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${tier.key}-${billing}`}
                      className="pr-tier-price"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      ${price}
                    </motion.span>
                  </AnimatePresence>
                  <span className="pr-tier-per">/ month</span>
                </div>
                <p className="pr-tier-billnote">
                  {tier.monthly === 0
                    ? 'Free forever · No card required'
                    : isAnnual
                      ? `Billed annually as $${tier.annualMonthly * 12} (save $${tier.monthly * 12 - tier.annualMonthly * 12}/yr)`
                      : 'Billed monthly · Cancel anytime'}
                </p>

                <a
                  href="/login?signup=true"
                  className={`pr-tier-cta ${tier.featured ? 'solid' : 'ghost'}`}
                >
                  {tier.cta} <ArrowRight size={14} />
                </a>

                <div className="pr-tier-features">
                  {tier.features.map((feature) => (
                    <span key={feature} className="pr-tier-feature">
                      <Check size={14} /> {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section className="pr-section">
          <motion.div
            className="pr-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="pr-section-eyebrow">Feature Matrix</p>
            <h2 className="pr-section-title">Compare every line item</h2>
            <p className="pr-section-desc">
              No hidden tiers, no “contact sales” asterisks. This is the complete
              difference between the plans.
            </p>
          </motion.div>

          <motion.div
            className="pr-table-scroll"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">
                    Starter
                    <span className="pr-th-price">$0 / mo</span>
                  </th>
                  <th scope="col" className="featured-col">
                    Pro
                    <span className="pr-th-price">${isAnnual ? 41 : 49} / mo</span>
                  </th>
                  <th scope="col">
                    Elite Desk
                    <span className="pr-th-price">${isAnnual ? 124 : 149} / mo</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="pr-group-row">
                      <td colSpan={4}>{group.group}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.label}>
                        <td className="pr-row-label">{row.label}</td>
                        <td><CellValue value={row.starter} /></td>
                        <td><CellValue value={row.pro} /></td>
                        <td><CellValue value={row.elite} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </motion.div>
        </section>

        {/* ── FAQ ── */}
        <section className="pr-section">
          <motion.div
            className="pr-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="pr-section-eyebrow">
              <HelpCircle size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Billing FAQ
            </p>
            <h2 className="pr-section-title">The questions everyone asks</h2>
          </motion.div>

          <div className="pr-faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className={`pr-faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="pr-faq-q"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={17} className="pr-faq-chevron" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <p className="pr-faq-a">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <motion.section
          className="pr-cta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="pr-cta-title">Start free. Upgrade when the data convinces you.</h2>
          <p className="pr-cta-sub">
            The Starter tier is free forever — watch the delayed feed, audit the gates,
            and move to real-time only when you have seen the process hold up.
          </p>
          <a href="/login?signup=true" className="pr-cta-btn">
            Create your account <ArrowRight size={15} />
          </a>
        </motion.section>

        {/* ── COMPLIANCE FOOTNOTE ── */}
        <div className="pr-disclaimer">
          <Landmark size={14} />
          <span>
            <strong>Risk disclosure.</strong> Trading foreign exchange, CFDs, and other
            leveraged products involves substantial risk of loss and is not suitable for
            all investors. Past performance — simulated or real — is not indicative of
            future results. HeroPips provides quantitative research tooling and signal
            analytics only; nothing on this page or platform constitutes financial,
            investment, or trading advice, or a solicitation to buy or sell any financial
            instrument. Prices shown exclude applicable taxes. You should consider your
            objectives and experience, and seek advice from an independent licensed
            financial advisor before trading.
          </span>
        </div>
      </div>
    </div>
  );
}
