'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Radio, MessagesSquare, ClipboardCheck, LifeBuoy, ArrowRight,
  Send, MessageCircle, Globe2, ShieldCheck, Scale, BookOpenCheck,
  HeartHandshake, Quote, Clock
} from 'lucide-react';

// ---------------------------------------------------------
// DATA
// ---------------------------------------------------------

const COMMUNITY_STATS = [
  { value: '24,000+', label: 'Active members', desc: 'Across Telegram & Discord' },
  { value: '90+', label: 'Countries', desc: 'Every major trading session' },
  { value: '3,100', label: 'Messages / day', desc: 'Moderated market discussion' },
  { value: '400+', label: 'Trade reviews', desc: 'Peer-audited each month' },
];

const CHANNELS = [
  {
    icon: Radio,
    name: 'Signal Feed',
    platform: 'Telegram',
    accentVar: 'var(--cm-acc-volt)',
    desc: 'The read-only broadcast of every validated signal with its full 12-gate audit trail. No chatter, no noise — the same feed the terminal receives.',
    meta: 'Read-only · Real-time',
    href: '#',
  },
  {
    icon: MessagesSquare,
    name: 'Market Chat',
    platform: 'Discord',
    accentVar: 'var(--cm-acc-cyan)',
    desc: 'Session-by-session discussion rooms for London, New York, and Asia. Macro releases, structure debates, and live session notes from senior members.',
    meta: 'Open discussion · 24/5',
    href: '#',
  },
  {
    icon: ClipboardCheck,
    name: 'Trade Reviews',
    platform: 'Discord',
    accentVar: 'var(--cm-acc-blue)',
    desc: 'Post your executions — winners and losers — for structured peer review. Templates enforce process critique over outcome worship.',
    meta: 'Template-based · Peer-audited',
    href: '#',
  },
  {
    icon: LifeBuoy,
    name: 'Support Desk',
    platform: 'Telegram',
    accentVar: 'var(--cm-acc-amber)',
    desc: 'Platform, billing, and MT5 bridge questions answered by the HeroPips team. Median first response under 4 hours on trading days.',
    meta: 'Staffed · Mon–Fri',
    href: '#',
  },
];

const VALUES = [
  {
    icon: Scale,
    title: 'Process over P&L',
    desc: 'We critique decisions, not outcomes. A disciplined loss earns more respect here than a reckless win.',
  },
  {
    icon: ShieldCheck,
    title: 'No hype, no pumping',
    desc: 'Screenshots of gains without process context, “guaranteed” calls, and affiliate spam are removed on sight.',
  },
  {
    icon: BookOpenCheck,
    title: 'Show your working',
    desc: 'Claims need charts, levels, and reasoning. The strongest argument in the room is the best-documented one.',
  },
  {
    icon: HeartHandshake,
    title: 'Protect the newcomer',
    desc: 'No gatekeeping, no ridicule. Every senior member was once the person asking what a fair value gap is.',
  },
];

const QUOTES = [
  {
    initials: 'DK',
    name: 'Daniel K.',
    role: 'Member since 2024 · London session',
    accentVar: 'var(--cm-acc-volt)',
    text: 'The trade review channel changed how I journal. Having strangers audit my process — kindly but honestly — did more for my discipline than a year of trading alone.',
  },
  {
    initials: 'AM',
    name: 'Amara M.',
    role: 'Member since 2023 · Lagos',
    accentVar: 'var(--cm-acc-cyan)',
    text: 'What sold me was the moderation. Someone posted a “100x guaranteed” call my first week and it was gone in minutes, with a public explanation of why. That told me everything.',
  },
  {
    initials: 'RS',
    name: 'Rahul S.',
    role: 'Member since 2024 · Asia session',
    accentVar: 'var(--cm-acc-blue)',
    text: 'I trade the Asia open, and there are actually people awake and talking structure at 2am UTC. The session rooms make a global community feel like a small desk.',
  },
  {
    initials: 'LB',
    name: 'Lena B.',
    role: 'Member since 2025 · Frankfurt',
    accentVar: 'var(--cm-acc-amber)',
    text: 'The signal feed is the product, but the community is why I stayed. Watching senior members reason about why they skipped a signal taught me more than taking one.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function CommunityPage() {
  useEffect(() => {
    document.title = 'HeroPips | Community';
  }, []);

  return (
    <div className="cm-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .cm-page {
          /* page-scoped tokens — light theme */
          --cm-surface: #ffffff;
          --cm-surface-soft: rgba(11, 15, 25, 0.025);
          --cm-border: rgba(11, 15, 25, 0.09);
          --cm-border-soft: rgba(11, 15, 25, 0.06);
          --cm-ink: var(--text-hi);
          --cm-ink-mid: var(--text-mid);
          --cm-ink-low: var(--text-low);
          --cm-acc-volt: var(--volt-500);
          --cm-acc-cyan: #06b6d4;
          --cm-acc-blue: #3b82f6;
          --cm-acc-amber: #f59e0b;
          --cm-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          background: var(--lp-bg, var(--bg-app));
          color: var(--cm-ink);
          padding: 120px 24px 0;
        }
        .dark .cm-page {
          --cm-surface: rgba(255, 255, 255, 0.04);
          --cm-surface-soft: rgba(255, 255, 255, 0.03);
          --cm-border: rgba(255, 255, 255, 0.12);
          --cm-border-soft: rgba(255, 255, 255, 0.07);
          --cm-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }
        .cm-inner { max-width: var(--max-w); margin: 0 auto; width: 100%; }

        /* ── Hero ── */
        .cm-hero { text-align: center; padding: 24px 0 56px; }
        .cm-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--volt-500);
          border: 1px solid var(--cm-border); border-radius: 9999px;
          padding: 6px 14px; margin-bottom: 18px;
          background: var(--cm-surface-soft);
        }
        .cm-title {
          font-size: clamp(32px, 5vw, 52px); font-weight: 800;
          letter-spacing: -2px; line-height: 1.08; color: var(--cm-ink);
          margin-bottom: 16px;
        }
        .cm-title em { font-style: italic; color: var(--volt-500); }
        .cm-sub {
          font-size: 15.5px; color: var(--cm-ink-mid); line-height: 1.65;
          max-width: 640px; margin: 0 auto 30px;
        }
        .cm-hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .cm-btn-telegram, .cm-btn-discord {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          padding: 12px 26px; border-radius: 9999px;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .cm-btn-telegram { background: var(--volt-500); color: #090a0f; }
        .cm-btn-discord {
          background: var(--cm-surface); color: var(--cm-ink);
          border: 1px solid var(--cm-border);
        }
        .cm-btn-telegram:hover, .cm-btn-discord:hover { transform: translateY(-2px); }
        .cm-hero-note {
          margin-top: 14px; font-size: 11.5px; color: var(--cm-ink-low);
        }

        /* ── Stats band ── */
        .cm-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--cm-border); border-radius: 18px;
          overflow: hidden; background: var(--cm-surface); box-shadow: var(--cm-shadow);
        }
        .cm-stat {
          padding: 26px 24px; text-align: center;
          border-right: 1px solid var(--cm-border-soft);
        }
        .cm-stat:last-child { border-right: none; }
        .cm-stat-value {
          font-size: 30px; font-weight: 800; letter-spacing: -1.5px;
          color: var(--cm-ink); font-variant-numeric: tabular-nums;
        }
        .cm-stat-label { font-size: 13px; font-weight: 700; color: var(--volt-500); margin-top: 4px; }
        .cm-stat-desc { font-size: 11.5px; color: var(--cm-ink-low); margin-top: 3px; }

        /* ── Section scaffolding ── */
        .cm-section { padding: 64px 0 0; }
        .cm-section-head { margin-bottom: 32px; }
        .cm-section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--volt-500); margin-bottom: 10px;
        }
        .cm-section-title {
          font-size: clamp(24px, 3vw, 32px); font-weight: 800;
          letter-spacing: -1.2px; color: var(--cm-ink); margin-bottom: 10px;
        }
        .cm-section-desc {
          font-size: 14.5px; color: var(--cm-ink-mid); line-height: 1.6; max-width: 640px;
        }

        /* ── Channel cards ── */
        .cm-channels-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .cm-channel-card {
          display: flex; flex-direction: column;
          background: var(--cm-surface); border: 1px solid var(--cm-border);
          border-radius: 16px; padding: 26px; text-decoration: none;
          box-shadow: var(--cm-shadow);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .cm-channel-card:hover { transform: translateY(-3px); border-color: var(--cm-acc); }
        .cm-channel-top {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
        }
        .cm-channel-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: var(--cm-surface-soft); border: 1px solid var(--cm-border-soft);
          color: var(--cm-acc);
        }
        .cm-channel-platform {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--cm-acc);
          border: 1px solid var(--cm-border); border-radius: 9999px; padding: 4px 10px;
        }
        .cm-channel-name { font-size: 17px; font-weight: 700; color: var(--cm-ink); margin-bottom: 8px; }
        .cm-channel-desc { font-size: 13px; color: var(--cm-ink-mid); line-height: 1.6; flex-grow: 1; }
        .cm-channel-foot {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--cm-border-soft);
        }
        .cm-channel-meta {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; color: var(--cm-ink-low);
        }
        .cm-channel-join {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 700; color: var(--cm-acc);
        }

        /* ── Values / code of conduct ── */
        .cm-values-wrap {
          display: grid; grid-template-columns: 1fr 1.4fr; gap: 32px; align-items: start;
        }
        .cm-values-pitch {
          background: var(--cm-ink); border-radius: 18px; padding: 32px;
          position: relative; overflow: hidden;
        }
        .dark .cm-values-pitch { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--cm-border); }
        .cm-values-pitch::after {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 240px; height: 240px;
          background: radial-gradient(circle, rgba(198, 255, 46, 0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .cm-values-pitch-title {
          font-size: 21px; font-weight: 800; letter-spacing: -0.8px;
          color: #ffffff; margin-bottom: 12px; position: relative; z-index: 1;
        }
        .cm-values-pitch-desc {
          font-size: 13.5px; color: rgba(255, 255, 255, 0.65); line-height: 1.65;
          position: relative; z-index: 1; margin-bottom: 20px;
        }
        .cm-values-pitch-badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: var(--volt-500);
          border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 9999px;
          padding: 6px 12px; position: relative; z-index: 1;
        }
        .cm-values-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .cm-value-card {
          background: var(--cm-surface); border: 1px solid var(--cm-border);
          border-radius: 14px; padding: 20px;
        }
        .cm-value-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--cm-surface-soft); border: 1px solid var(--cm-border-soft);
          color: var(--volt-500); margin-bottom: 12px;
        }
        .cm-value-title { font-size: 14px; font-weight: 700; color: var(--cm-ink); margin-bottom: 6px; }
        .cm-value-desc { font-size: 12.5px; color: var(--cm-ink-mid); line-height: 1.55; }

        /* ── Quotes ── */
        .cm-quotes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .cm-quote-card {
          background: var(--cm-surface); border: 1px solid var(--cm-border);
          border-radius: 16px; padding: 26px; box-shadow: var(--cm-shadow);
          display: flex; flex-direction: column;
        }
        .cm-quote-mark { color: var(--cm-acc); margin-bottom: 12px; }
        .cm-quote-text {
          font-size: 14px; color: var(--cm-ink-mid); line-height: 1.7;
          flex-grow: 1; margin-bottom: 18px;
        }
        .cm-quote-person { display: flex; align-items: center; gap: 12px; }
        .cm-quote-avatar {
          width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: var(--cm-acc);
          background: var(--cm-surface-soft); border: 1.5px solid var(--cm-acc);
        }
        .cm-quote-name { font-size: 13.5px; font-weight: 700; color: var(--cm-ink); }
        .cm-quote-role { font-size: 11px; color: var(--cm-ink-low); margin-top: 1px; }
        .cm-quotes-note {
          margin-top: 14px; font-size: 10.5px; color: var(--cm-ink-low); text-align: center;
        }

        /* ── Final CTA ── */
        .cm-cta {
          margin: 72px 0 96px; text-align: center;
          background: var(--cm-ink); border-radius: 24px; padding: 64px 32px;
          position: relative; overflow: hidden;
        }
        .dark .cm-cta { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--cm-border); }
        .cm-cta::after {
          content: ''; position: absolute; bottom: -100px; left: 50%;
          transform: translateX(-50%); width: 520px; height: 260px;
          background: radial-gradient(ellipse at center, rgba(198, 255, 46, 0.16) 0%, transparent 70%);
          pointer-events: none;
        }
        .cm-cta-title {
          font-size: clamp(24px, 3.5vw, 36px); font-weight: 800;
          letter-spacing: -1.4px; color: #ffffff; margin-bottom: 12px;
          position: relative; z-index: 1;
        }
        .cm-cta-sub {
          font-size: 14.5px; color: rgba(255, 255, 255, 0.65);
          max-width: 500px; margin: 0 auto 28px; line-height: 1.6;
          position: relative; z-index: 1;
        }
        .cm-cta-actions {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 1;
        }
        .cm-cta-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--volt-500); color: #090a0f;
          font-size: 14px; font-weight: 700; text-decoration: none;
          padding: 12px 26px; border-radius: 9999px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .cm-cta-btn-primary:hover { transform: translateY(-2px); background: var(--volt-500-hover); }
        .cm-cta-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255, 255, 255, 0.06); color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 14px; font-weight: 600; text-decoration: none;
          padding: 12px 24px; border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .cm-cta-btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .cm-values-wrap { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .cm-page { padding: 100px 16px 0; }
          .cm-stats { grid-template-columns: repeat(2, 1fr); }
          .cm-stat { border-right: none; border-bottom: 1px solid var(--cm-border-soft); }
          .cm-stat:nth-child(odd) { border-right: 1px solid var(--cm-border-soft); }
          .cm-stat:nth-child(3), .cm-stat:nth-child(4) { border-bottom: none; }
          .cm-channels-grid, .cm-quotes-grid, .cm-values-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      <div className="cm-inner">
        {/* ── HERO ── */}
        <motion.section className="cm-hero" initial="hidden" animate="visible" variants={fadeUp}>
          <span className="cm-eyebrow">
            <Users size={12} />
            Trader Network
          </span>
          <h1 className="cm-title">
            One signal feed.<br />
            <em>Thousands</em> of second opinions.
          </h1>
          <p className="cm-sub">
            HeroPips members trade the same validated feed — then dissect it together.
            Join moderated Telegram and Discord rooms where market structure gets argued
            with charts, trades get audited by peers, and hype gets deleted.
          </p>
          <div className="cm-hero-ctas">
            <a href="#" className="cm-btn-telegram">
              <Send size={15} /> Join on Telegram
            </a>
            <a href="#" className="cm-btn-discord">
              <MessageCircle size={15} /> Join on Discord
            </a>
          </div>
          <p className="cm-hero-note">Free to join · Signal Feed channel requires an active plan for real-time delivery.</p>
        </motion.section>

        {/* ── STATS ── */}
        <motion.section
          className="cm-stats"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {COMMUNITY_STATS.map((stat) => (
            <div key={stat.label} className="cm-stat">
              <div className="cm-stat-value">{stat.value}</div>
              <div className="cm-stat-label">{stat.label}</div>
              <div className="cm-stat-desc">{stat.desc}</div>
            </div>
          ))}
        </motion.section>

        {/* ── CHANNELS ── */}
        <section className="cm-section">
          <motion.div
            className="cm-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="cm-section-eyebrow">The Rooms</p>
            <h2 className="cm-section-title">Four channels, four jobs</h2>
            <p className="cm-section-desc">
              Each room has a single purpose and its own moderation rules. Signals stay
              clean, discussion stays structured, and support stays reachable.
            </p>
          </motion.div>

          <div className="cm-channels-grid">
            {CHANNELS.map((ch, i) => {
              const Icon = ch.icon;
              return (
                <motion.a
                  key={ch.name}
                  href={ch.href}
                  className="cm-channel-card"
                  style={{ '--cm-acc': ch.accentVar } as React.CSSProperties}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="cm-channel-top">
                    <span className="cm-channel-icon"><Icon size={20} /></span>
                    <span className="cm-channel-platform">
                      {ch.platform === 'Telegram' ? <Send size={10} /> : <MessageCircle size={10} />}
                      {ch.platform}
                    </span>
                  </div>
                  <h3 className="cm-channel-name">{ch.name}</h3>
                  <p className="cm-channel-desc">{ch.desc}</p>
                  <div className="cm-channel-foot">
                    <span className="cm-channel-meta"><Clock size={11} /> {ch.meta}</span>
                    <span className="cm-channel-join">Join <ArrowRight size={13} /></span>
                  </div>
                </motion.a>
              );
            })}
          </div>
        </section>

        {/* ── CODE OF CONDUCT / VALUES ── */}
        <section className="cm-section">
          <motion.div
            className="cm-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="cm-section-eyebrow">Code of Conduct</p>
            <h2 className="cm-section-title">Moderated like a trading desk</h2>
          </motion.div>

          <div className="cm-values-wrap">
            <motion.div
              className="cm-values-pitch"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="cm-values-pitch-title">
                Good communities are curated, not accumulated.
              </h3>
              <p className="cm-values-pitch-desc">
                Every member agrees to the same four principles on joining. Moderators —
                a mix of HeroPips staff and elected senior members — enforce them
                publicly, with reasons attached to every removal. The result is a room
                where the loudest voice is the best-evidenced one.
              </p>
              <span className="cm-values-pitch-badge">
                <ShieldCheck size={12} /> Enforced 24/5 across both platforms
              </span>
            </motion.div>

            <div className="cm-values-grid">
              {VALUES.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div
                    key={v.title}
                    className="cm-value-card"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="cm-value-icon"><Icon size={16} /></span>
                    <h4 className="cm-value-title">{v.title}</h4>
                    <p className="cm-value-desc">{v.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── MEMBER QUOTES ── */}
        <section className="cm-section">
          <motion.div
            className="cm-section-head"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
          >
            <p className="cm-section-eyebrow">Member Voices</p>
            <h2 className="cm-section-title">What the room sounds like</h2>
            <p className="cm-section-desc">
              <Globe2 size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />
              From four time zones, four members on why they stayed.
            </p>
          </motion.div>

          <div className="cm-quotes-grid">
            {QUOTES.map((q, i) => (
              <motion.div
                key={q.initials}
                className="cm-quote-card"
                style={{ '--cm-acc': q.accentVar } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="cm-quote-mark"><Quote size={18} /></span>
                <p className="cm-quote-text">{q.text}</p>
                <div className="cm-quote-person">
                  <span className="cm-quote-avatar">{q.initials}</span>
                  <div>
                    <div className="cm-quote-name">{q.name}</div>
                    <div className="cm-quote-role">{q.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="cm-quotes-note">
            Illustrative member testimonials. Individual experiences vary; nothing here is a promise of trading results.
          </p>
        </section>

        {/* ── FINAL CTA ── */}
        <motion.section
          className="cm-cta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="cm-cta-title">Pull up a chair at the desk.</h2>
          <p className="cm-cta-sub">
            Join free, read the rooms for a week, and decide if this is the standard of
            conversation you want around your trading.
          </p>
          <div className="cm-cta-actions">
            <a href="#" className="cm-cta-btn-primary">
              <Send size={14} /> Join on Telegram
            </a>
            <a href="#" className="cm-cta-btn-secondary">
              <MessageCircle size={14} /> Join on Discord
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
