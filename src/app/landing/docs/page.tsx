'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, UserPlus, Plug, Radio, Shield, ArrowRight,
  Layers, Activity, Gauge, Boxes, FileText, Clock, ChevronRight,
  Terminal, CheckCircle2, Hash, GraduationCap
} from 'lucide-react';

// ---------------------------------------------------------
// DATA
// ---------------------------------------------------------

const START_STEPS = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Create your account',
    desc: 'Register in under two minutes. Verify your email and access the terminal dashboard immediately — no card required for the Starter tier.',
    time: '2 min',
    href: '/login?signup=true',
  },
  {
    num: '02',
    icon: Plug,
    title: 'Connect your broker via MT5',
    desc: 'Link any MetaTrader 5 account through our encrypted bridge. Trade-only permissions; withdrawal access is never requested.',
    time: '5 min',
    href: '#',
  },
  {
    num: '03',
    icon: Radio,
    title: 'Read your first signal',
    desc: 'Understand grade, confluence score, entry, stop, and targets. Learn how the 12-gate audit trail is attached to every signal card.',
    time: '8 min',
    href: '/landing/signal-engine',
  },
  {
    num: '04',
    icon: Shield,
    title: 'Configure the Risk Governor',
    desc: 'Set your drawdown ceilings, daily loss circuit breaker, and base Kelly fraction so position sizing adapts to your account state.',
    time: '10 min',
    href: '/landing/signal-engine',
  },
];

const CATEGORIES = [
  {
    key: 'Platform',
    icon: Layers,
    accentVar: 'var(--dc-cat-blue)',
    desc: 'Terminal navigation, account settings, notifications, and workspace configuration.',
    count: 14,
  },
  {
    key: 'Signals & Gates',
    icon: Activity,
    accentVar: 'var(--dc-cat-volt)',
    desc: 'Signal anatomy, the 12-gate confluence pipeline, grading, and session logic.',
    count: 18,
  },
  {
    key: 'Risk Management',
    icon: Gauge,
    accentVar: 'var(--dc-cat-red)',
    desc: 'Drawdown governors, circuit breakers, sizing multipliers, and recovery protocol.',
    count: 11,
  },
  {
    key: 'Integrations',
    icon: Boxes,
    accentVar: 'var(--dc-cat-cyan)',
    desc: 'MT5 bridge, Telegram alerts, exchange API keys, and webhook broadcasting.',
    count: 9,
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'] | 'All';

interface Article {
  title: string;
  category: Exclude<CategoryKey, 'All'>;
  readTime: string;
  excerpt: string;
  href: string;
}

const ARTICLES: Article[] = [
  { title: 'Anatomy of a HeroPips signal card', category: 'Signals & Gates', readTime: '6 min', excerpt: 'Every field on the signal card explained: grade, confluence %, entry band, invalidation, and R-multiple targets.', href: '/landing/signal-engine' },
  { title: 'How the 12-gate confluence pipeline works', category: 'Signals & Gates', readTime: '12 min', excerpt: 'A gate-by-gate walkthrough of the validation chain, from Confluence Bias to Candlestick Geometry.', href: '/landing/signal-engine' },
  { title: 'Critical vs. standard gates', category: 'Signals & Gates', readTime: '5 min', excerpt: 'Why gates 1, 8, and 10 can veto a setup outright while standard gates accumulate score.', href: '/landing/signal-engine' },
  { title: 'Session filters and the London/NY overlap', category: 'Signals & Gates', readTime: '4 min', excerpt: 'How execution windows are restricted to high-liquidity sessions and what that means for your feed.', href: '#' },
  { title: 'Connecting a MetaTrader 5 account', category: 'Integrations', readTime: '7 min', excerpt: 'Step-by-step MT5 bridge setup, including investor vs. trade credentials and supported brokers.', href: '#' },
  { title: 'Routing alerts to Telegram', category: 'Integrations', readTime: '3 min', excerpt: 'Bind your Telegram handle to the alert stream and customise which grades trigger a push.', href: '#' },
  { title: 'Exchange API keys and encryption', category: 'Integrations', readTime: '5 min', excerpt: 'How API keys are stored, what permissions are requested, and how to rotate credentials safely.', href: '#' },
  { title: 'Webhook and REST broadcasting for desks', category: 'Integrations', readTime: '9 min', excerpt: 'Push validated signals into your own infrastructure with signed webhook payloads.', href: '#' },
  { title: 'Setting your maximum drawdown ceiling', category: 'Risk Management', readTime: '6 min', excerpt: 'Configure the graduated throttle zones the Drawdown Governor uses to scale position size.', href: '/landing/signal-engine' },
  { title: 'The daily loss circuit breaker explained', category: 'Risk Management', readTime: '5 min', excerpt: 'Caution, warning, and terminal tiers — and what happens to open positions at each threshold.', href: '/landing/signal-engine' },
  { title: 'Anti-martingale recovery sizing', category: 'Risk Management', readTime: '7 min', excerpt: 'Why size is rebuilt slowly after a drawdown trough instead of doubled into losses.', href: '#' },
  { title: 'Position sizing with fractional Kelly', category: 'Risk Management', readTime: '10 min', excerpt: 'The maths behind the base risk fraction and the multiplier stack applied on top of it.', href: '#' },
  { title: 'Navigating the terminal dashboard', category: 'Platform', readTime: '4 min', excerpt: 'A tour of the signal feed, analytics panels, journal, and account switcher.', href: '#' },
  { title: 'Managing notification preferences', category: 'Platform', readTime: '3 min', excerpt: 'Choose per-channel delivery for signals, risk events, and account digests.', href: '#' },
  { title: 'Reading your performance analytics', category: 'Platform', readTime: '8 min', excerpt: 'Equity curve, win-rate decomposition, R-distribution, and session heatmaps explained.', href: '#' },
  { title: 'Two-factor authentication and security', category: 'Platform', readTime: '4 min', excerpt: 'Enable TOTP 2FA and review active sessions from the security panel.', href: '#' },
];

const FILTER_CHIPS: CategoryKey[] = ['All', 'Platform', 'Signals & Gates', 'Risk Management', 'Integrations'];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function DocsPage() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<CategoryKey>('All');

  useEffect(() => {
    document.title = 'HeroPips | Documentation';
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const catOk = activeCat === 'All' || a.category === activeCat;
      const qOk = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [query, activeCat]);

  return (
    <div className="dc-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .dc-page {
          /* page-scoped tokens — light theme */
          --dc-surface: #ffffff;
          --dc-surface-soft: rgba(11, 15, 25, 0.025);
          --dc-border: rgba(11, 15, 25, 0.09);
          --dc-border-soft: rgba(11, 15, 25, 0.06);
          --dc-ink: var(--text-hi);
          --dc-ink-mid: var(--text-mid);
          --dc-ink-low: var(--text-low);
          --dc-cat-blue: #3b82f6;
          --dc-cat-volt: var(--volt-500);
          --dc-cat-red: #ef4444;
          --dc-cat-cyan: #06b6d4;
          --dc-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          background: var(--lp-bg, var(--bg-app));
          color: var(--dc-ink);
          padding: 120px 24px 0;
        }
        .dark .dc-page {
          --dc-surface: rgba(255, 255, 255, 0.04);
          --dc-surface-soft: rgba(255, 255, 255, 0.03);
          --dc-border: rgba(255, 255, 255, 0.12);
          --dc-border-soft: rgba(255, 255, 255, 0.07);
          --dc-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }
        .dc-inner {
          max-width: var(--max-w);
          margin: 0 auto;
          width: 100%;
        }

        /* ── Hero ── */
        .dc-hero { text-align: center; padding: 24px 0 56px; }
        .dc-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--volt-500);
          border: 1px solid var(--dc-border); border-radius: 9999px;
          padding: 6px 14px; margin-bottom: 18px;
          background: var(--dc-surface-soft);
        }
        .dc-title {
          font-size: clamp(32px, 5vw, 52px); font-weight: 800;
          letter-spacing: -2px; line-height: 1.08; color: var(--dc-ink);
          margin-bottom: 16px;
        }
        .dc-title em { font-style: italic; color: var(--volt-500); }
        .dc-sub {
          font-size: 15.5px; color: var(--dc-ink-mid); line-height: 1.65;
          max-width: 620px; margin: 0 auto 32px;
        }
        .dc-search-wrap {
          max-width: 560px; margin: 0 auto; position: relative;
        }
        .dc-search-input {
          width: 100%; padding: 14px 18px 14px 46px;
          font-size: 14.5px; font-family: inherit;
          color: var(--dc-ink);
          background: var(--dc-surface);
          border: 1px solid var(--dc-border);
          border-radius: 14px;
          outline: none;
          box-shadow: var(--dc-shadow);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .dc-search-input::placeholder { color: var(--dc-ink-low); }
        .dc-search-input:focus { border-color: var(--volt-500); }
        .dc-search-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: var(--dc-ink-low); pointer-events: none;
        }

        /* ── Section scaffolding ── */
        .dc-section { padding: 56px 0; }
        .dc-section-head { margin-bottom: 32px; }
        .dc-section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--volt-500); margin-bottom: 10px;
        }
        .dc-section-title {
          font-size: clamp(24px, 3vw, 32px); font-weight: 800;
          letter-spacing: -1.2px; color: var(--dc-ink); margin-bottom: 10px;
        }
        .dc-section-desc {
          font-size: 14.5px; color: var(--dc-ink-mid); line-height: 1.6; max-width: 620px;
        }

        /* ── Getting started steps ── */
        .dc-steps-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }
        .dc-step-card {
          display: flex; flex-direction: column;
          background: var(--dc-surface); border: 1px solid var(--dc-border);
          border-radius: 16px; padding: 24px; text-decoration: none;
          box-shadow: var(--dc-shadow);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .dc-step-card:hover { transform: translateY(-3px); border-color: var(--volt-500); }
        .dc-step-top {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
        .dc-step-icon {
          width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: var(--dc-surface-soft); border: 1px solid var(--dc-border-soft);
          color: var(--volt-500);
        }
        .dc-step-num {
          font-family: monospace; font-size: 11px; font-weight: 700;
          color: var(--dc-ink-low); border: 1px solid var(--dc-border);
          padding: 2px 7px; border-radius: 5px;
        }
        .dc-step-title { font-size: 15.5px; font-weight: 700; color: var(--dc-ink); margin-bottom: 8px; }
        .dc-step-desc { font-size: 12.5px; color: var(--dc-ink-mid); line-height: 1.55; flex-grow: 1; }
        .dc-step-foot {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--dc-border-soft);
        }
        .dc-step-time {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; color: var(--dc-ink-low);
        }
        .dc-step-go { color: var(--volt-500); display: inline-flex; }

        /* ── Categories ── */
        .dc-cats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .dc-cat-card {
          background: var(--dc-surface); border: 1px solid var(--dc-border);
          border-radius: 16px; padding: 24px; cursor: pointer;
          text-align: left; font-family: inherit; width: 100%;
          box-shadow: var(--dc-shadow);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .dc-cat-card:hover { transform: translateY(-3px); border-color: var(--dc-cat-accent); }
        .dc-cat-card.active { border-color: var(--dc-cat-accent); }
        .dc-cat-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: var(--dc-cat-accent); background: var(--dc-surface-soft);
          border: 1px solid var(--dc-border-soft); margin-bottom: 16px;
        }
        .dc-cat-name { font-size: 15.5px; font-weight: 700; color: var(--dc-ink); margin-bottom: 6px; }
        .dc-cat-desc { font-size: 12.5px; color: var(--dc-ink-mid); line-height: 1.55; margin-bottom: 14px; }
        .dc-cat-count {
          font-size: 11px; font-weight: 700; color: var(--dc-cat-accent);
          display: inline-flex; align-items: center; gap: 4px;
        }

        /* ── Article browser ── */
        .dc-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .dc-chip {
          font-size: 12.5px; font-weight: 600; font-family: inherit;
          padding: 7px 16px; border-radius: 9999px; cursor: pointer;
          color: var(--dc-ink-mid); background: var(--dc-surface);
          border: 1px solid var(--dc-border);
          transition: all 0.2s ease;
        }
        .dc-chip:hover { color: var(--dc-ink); border-color: var(--dc-ink-low); }
        .dc-chip.active {
          background: var(--dc-ink); color: var(--lp-bg, var(--bg-app));
          border-color: var(--dc-ink);
        }
        .dc-articles-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dc-article-row {
          display: flex; gap: 16px; align-items: flex-start;
          background: var(--dc-surface); border: 1px solid var(--dc-border);
          border-radius: 14px; padding: 18px 20px; text-decoration: none;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .dc-article-row:hover { border-color: var(--volt-500); transform: translateY(-2px); }
        .dc-article-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--dc-surface-soft); border: 1px solid var(--dc-border-soft);
          color: var(--volt-500);
        }
        .dc-article-title { font-size: 14px; font-weight: 700; color: var(--dc-ink); margin-bottom: 4px; }
        .dc-article-excerpt { font-size: 12px; color: var(--dc-ink-mid); line-height: 1.5; margin-bottom: 8px; }
        .dc-article-meta {
          display: flex; gap: 12px; font-size: 10.5px; font-weight: 600;
          color: var(--dc-ink-low); text-transform: uppercase; letter-spacing: 0.05em;
        }
        .dc-empty {
          grid-column: 1 / -1; text-align: center; padding: 48px 24px;
          border: 1px dashed var(--dc-border); border-radius: 14px;
          color: var(--dc-ink-mid); font-size: 14px;
        }

        /* ── Doc preview panel ── */
        .dc-preview-grid {
          display: grid; grid-template-columns: 220px 1fr; gap: 0;
          background: var(--dc-surface); border: 1px solid var(--dc-border);
          border-radius: 18px; overflow: hidden; box-shadow: var(--dc-shadow);
        }
        .dc-preview-toc {
          border-right: 1px solid var(--dc-border-soft);
          padding: 28px 20px; background: var(--dc-surface-soft);
        }
        .dc-toc-label {
          font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--dc-ink-low); margin-bottom: 14px;
        }
        .dc-toc-item {
          display: flex; align-items: center; gap: 7px;
          font-size: 12.5px; font-weight: 600; color: var(--dc-ink-mid);
          padding: 7px 10px; border-radius: 8px; margin-bottom: 2px;
        }
        .dc-toc-item.current {
          color: var(--volt-500); background: var(--dc-surface);
          border: 1px solid var(--dc-border-soft);
        }
        .dc-preview-body { padding: 32px 36px; }
        .dc-preview-crumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 600; color: var(--dc-ink-low); margin-bottom: 14px;
        }
        .dc-preview-h1 {
          font-size: 24px; font-weight: 800; letter-spacing: -0.8px;
          color: var(--dc-ink); margin-bottom: 14px;
        }
        .dc-preview-p { font-size: 13.5px; color: var(--dc-ink-mid); line-height: 1.7; margin-bottom: 16px; }
        .dc-preview-code {
          font-family: monospace; font-size: 12px; line-height: 1.7;
          background: var(--dc-ink); color: #10b981;
          border-radius: 10px; padding: 16px 18px; overflow-x: auto; margin-bottom: 16px;
        }
        .dark .dc-preview-code { background: rgba(0, 0, 0, 0.45); }
        .dc-preview-note {
          display: flex; gap: 10px; align-items: flex-start;
          font-size: 12.5px; color: var(--dc-ink-mid); line-height: 1.6;
          border-left: 3px solid var(--volt-500);
          background: var(--dc-surface-soft);
          padding: 12px 14px; border-radius: 0 10px 10px 0;
        }

        /* ── Final CTA ── */
        .dc-cta {
          margin: 72px 0 96px; text-align: center;
          background: var(--dc-ink); border-radius: 24px; padding: 64px 32px;
          position: relative; overflow: hidden;
        }
        .dark .dc-cta { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--dc-border); }
        .dc-cta::after {
          content: ''; position: absolute; bottom: -100px; left: 50%;
          transform: translateX(-50%); width: 520px; height: 260px;
          background: radial-gradient(ellipse at center, rgba(198, 255, 46, 0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .dc-cta-title {
          font-size: clamp(24px, 3.5vw, 36px); font-weight: 800;
          letter-spacing: -1.4px; color: #ffffff; margin-bottom: 12px;
          position: relative; z-index: 1;
        }
        .dc-cta-sub {
          font-size: 14.5px; color: rgba(255, 255, 255, 0.65);
          max-width: 480px; margin: 0 auto 28px; line-height: 1.6;
          position: relative; z-index: 1;
        }
        .dc-cta-actions {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 1;
        }
        .dc-cta-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--volt-500); color: #090a0f;
          font-size: 14px; font-weight: 700; text-decoration: none;
          padding: 12px 26px; border-radius: 9999px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .dc-cta-btn-primary:hover { transform: translateY(-2px); background: var(--volt-500-hover); }
        .dc-cta-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255, 255, 255, 0.06); color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 14px; font-weight: 600; text-decoration: none;
          padding: 12px 24px; border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .dc-cta-btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .dc-steps-grid, .dc-cats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .dc-page { padding: 100px 16px 0; }
          .dc-steps-grid, .dc-cats-grid, .dc-articles-grid { grid-template-columns: 1fr; }
          .dc-preview-grid { grid-template-columns: 1fr; }
          .dc-preview-toc { border-right: none; border-bottom: 1px solid var(--dc-border-soft); }
          .dc-preview-body { padding: 24px 20px; }
        }
      ` }} />

      <div className="dc-inner">
        {/* ── HERO ── */}
        <motion.section
          className="dc-hero"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <span className="dc-eyebrow">
            <BookOpen size={12} />
            Knowledge Base
          </span>
          <h1 className="dc-title">
            Documentation, built for<br />
            <em>operators</em> — not spectators.
          </h1>
          <p className="dc-sub">
            Everything you need to run HeroPips like a quantitative desk: platform guides,
            the full 12-gate signal specification, risk governance manuals, and integration
            playbooks — written plainly, versioned continuously.
          </p>
          <div className="dc-search-wrap">
            <Search size={17} className="dc-search-icon" />
            <input
              className="dc-search-input"
              type="text"
              placeholder="Search guides — try “drawdown”, “MT5”, or “signal”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search documentation"
            />
          </div>
        </motion.section>

        {/* ── GETTING STARTED ── */}
        <section className="dc-section">
          <motion.div
            className="dc-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="dc-section-eyebrow">Getting Started</p>
            <h2 className="dc-section-title">From zero to first validated signal</h2>
            <p className="dc-section-desc">
              Four short guides take you from a fresh account to a fully governed,
              broker-connected terminal. Most traders finish the sequence in under half an hour.
            </p>
          </motion.div>

          <div className="dc-steps-grid">
            {START_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.a
                  key={step.num}
                  href={step.href}
                  className="dc-step-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="dc-step-top">
                    <span className="dc-step-icon"><Icon size={18} /></span>
                    <span className="dc-step-num">STEP {step.num}</span>
                  </div>
                  <h3 className="dc-step-title">{step.title}</h3>
                  <p className="dc-step-desc">{step.desc}</p>
                  <div className="dc-step-foot">
                    <span className="dc-step-time"><Clock size={11} /> {step.time} read</span>
                    <span className="dc-step-go"><ArrowRight size={15} /></span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section className="dc-section">
          <motion.div
            className="dc-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="dc-section-eyebrow">Guide Library</p>
            <h2 className="dc-section-title">Browse by discipline</h2>
            <p className="dc-section-desc">
              The library is organised the way the platform is engineered — four domains,
              each maintained by the team that builds that part of the system. Selecting a
              category filters the article index below.
            </p>
          </motion.div>

          <div className="dc-cats-grid">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              const isActive = activeCat === cat.key;
              return (
                <motion.button
                  key={cat.key}
                  type="button"
                  className={`dc-cat-card ${isActive ? 'active' : ''}`}
                  style={{ '--dc-cat-accent': cat.accentVar } as React.CSSProperties}
                  onClick={() => setActiveCat(isActive ? 'All' : cat.key)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="dc-cat-icon"><Icon size={19} /></span>
                  <h3 className="dc-cat-name">{cat.key}</h3>
                  <p className="dc-cat-desc">{cat.desc}</p>
                  <span className="dc-cat-count">
                    <FileText size={11} /> {cat.count} guides
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── ARTICLE INDEX (search/filter) ── */}
        <section className="dc-section">
          <motion.div
            className="dc-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="dc-section-eyebrow">Article Index</p>
            <h2 className="dc-section-title">
              {filtered.length} guide{filtered.length === 1 ? '' : 's'}
              {activeCat !== 'All' ? ` in ${activeCat}` : ''}
              {query.trim() ? ` matching “${query.trim()}”` : ''}
            </h2>
          </motion.div>

          <div className="dc-chips" role="tablist" aria-label="Filter articles by category">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`dc-chip ${activeCat === chip ? 'active' : ''}`}
                onClick={() => setActiveCat(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="dc-articles-grid">
            {filtered.length === 0 && (
              <div className="dc-empty">
                No guides match that search yet. Try a broader term, or email{' '}
                <strong>support@heropips.com</strong> and we&apos;ll write it.
              </div>
            )}
            {filtered.map((article) => (
              <a key={article.title} href={article.href} className="dc-article-row">
                <span className="dc-article-icon"><FileText size={15} /></span>
                <div>
                  <h3 className="dc-article-title">{article.title}</h3>
                  <p className="dc-article-excerpt">{article.excerpt}</p>
                  <div className="dc-article-meta">
                    <span><Hash size={9} style={{ display: 'inline', verticalAlign: '-1px' }} /> {article.category}</span>
                    <span>{article.readTime} read</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── DOC PREVIEW PANEL ── */}
        <section className="dc-section">
          <motion.div
            className="dc-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="dc-section-eyebrow">Sample Page</p>
            <h2 className="dc-section-title">What a HeroPips guide looks like</h2>
            <p className="dc-section-desc">
              Every guide pairs plain-language explanation with the exact terminal output you
              will see — no screenshots that age, no marketing gloss inside the manual.
            </p>
          </motion.div>

          <motion.div
            className="dc-preview-grid"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <aside className="dc-preview-toc">
              <p className="dc-toc-label">On this page</p>
              <div className="dc-toc-item current"><ChevronRight size={12} /> Overview</div>
              <div className="dc-toc-item"><ChevronRight size={12} /> Signal grades</div>
              <div className="dc-toc-item"><ChevronRight size={12} /> The audit trail</div>
              <div className="dc-toc-item"><ChevronRight size={12} /> Entry &amp; invalidation</div>
              <div className="dc-toc-item"><ChevronRight size={12} /> Next steps</div>
            </aside>
            <article className="dc-preview-body">
              <div className="dc-preview-crumb">
                <span>Docs</span> <ChevronRight size={11} /> <span>Signals &amp; Gates</span>
                <ChevronRight size={11} /> <span style={{ color: 'var(--volt-500)' }}>Reading your first signal</span>
              </div>
              <h1 className="dc-preview-h1">Reading your first signal</h1>
              <p className="dc-preview-p">
                When a setup clears the confluence pipeline, a signal card is published to your
                terminal and any connected channels. Each card carries the pair, direction,
                a letter grade (B through AAA), and the confluence score that produced it. A
                signal is never published without its audit trail attached.
              </p>
              <pre className="dc-preview-code">
{`SIGNAL  #HP-20418          GRADE AA · CONFLUENCE 78%
PAIR    XAU/USD (Gold)     DIRECTION  BUY
ENTRY   2,341.20 – 2,342.60
STOP    2,334.80           TARGETS  2,354.10 (2.0R)
GATES   10/12 passed · Critical gates 1, 8, 10: CLEAR`}
              </pre>
              <div className="dc-preview-note">
                <CheckCircle2 size={16} style={{ color: 'var(--volt-500)', flexShrink: 0, marginTop: 1 }} />
                <span>
                  A published signal is a probability statement, not an instruction. Your Risk
                  Governor settings decide whether — and at what size — it is actionable for
                  your account. See <a href="/landing/signal-engine" style={{ color: 'var(--volt-500)', fontWeight: 700 }}>the Signal Engine</a> for the full gate specification.
                </span>
              </div>
            </article>
          </motion.div>
        </section>

        {/* ── FINAL CTA ── */}
        <motion.section
          className="dc-cta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="dc-cta-title">Read the manual. Then run the machine.</h2>
          <p className="dc-cta-sub">
            The best way to learn the platform is inside it — create a free account and
            follow the getting-started sequence with live data.
          </p>
          <div className="dc-cta-actions">
            <a href="/login?signup=true" className="dc-cta-btn-primary">
              Create free account <ArrowRight size={15} />
            </a>
            <a href="/landing/signal-engine" className="dc-cta-btn-secondary">
              <Terminal size={14} /> Explore the Signal Engine
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
