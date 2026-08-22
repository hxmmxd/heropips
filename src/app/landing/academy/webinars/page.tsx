'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlaySquare, ArrowRight, Clock, CalendarDays, Play, Radio,
  Filter, TrendingUp, Landmark, Layers, Gauge, Search, Video
} from 'lucide-react';

// ---------------------------------------------------------
// WEBINAR ARCHIVE DATA (fictional presenters)
// ---------------------------------------------------------

type Topic = 'All' | 'Macro & News' | 'Gold & Metals' | 'SMC Deep-Dive' | 'Risk & Psychology' | 'Platform';

const TOPICS: { key: Topic; icon?: React.ReactNode }[] = [
  { key: 'All' },
  { key: 'Macro & News', icon: <Landmark size={12} /> },
  { key: 'Gold & Metals', icon: <TrendingUp size={12} /> },
  { key: 'SMC Deep-Dive', icon: <Layers size={12} /> },
  { key: 'Risk & Psychology', icon: <Gauge size={12} /> },
  { key: 'Platform', icon: <PlaySquare size={12} /> },
];

interface Webinar {
  title: string;
  date: string;
  duration: string;
  topic: Exclude<Topic, 'All'>;
  presenter: string;
  initials: string;
  desc: string;
  accent: string;
  views: string;
}

const FEATURED: Webinar = {
  title: 'September Outlook: NFP Week, Rate-Path Repricing & the Dollar Index',
  date: 'Aug 14, 2026',
  duration: '78 min',
  topic: 'Macro & News',
  presenter: 'Dara Mensah',
  initials: 'DM',
  desc: 'A forward calendar walkthrough for the month ahead: which releases the News Event Filter will lock around, how DXY positioning frames every USD cross, and the three scenarios we are tracking into NFP week — each mapped to gate-level implications.',
  accent: '#3b82f6',
  views: '4.2k',
};

const WEBINARS: Webinar[] = [
  {
    title: 'Gold at the Highs: Volatility Regimes and the ATR Band in XAUUSD',
    date: 'Aug 7, 2026',
    duration: '62 min',
    topic: 'Gold & Metals',
    presenter: 'Dara Mensah',
    initials: 'DM',
    desc: 'Why gold trends punish mean-reversion habits, and how Gate 5 volatility bands keep entries out of exhaustion spikes.',
    accent: '#f59e0b',
    views: '3.1k',
  },
  {
    title: 'Order Blocks vs. Supply & Demand: Ending the Definition Wars',
    date: 'Jul 31, 2026',
    duration: '55 min',
    topic: 'SMC Deep-Dive',
    presenter: 'Tomas Okafor',
    initials: 'TO',
    desc: 'A precise, testable definition of an order block — and the checklist Gate 2 uses to reject the look-alikes.',
    accent: '#8b5cf6',
    views: '5.6k',
  },
  {
    title: 'CPI Playbook: Trading the 30 Minutes Nobody Should Trade',
    date: 'Jul 24, 2026',
    duration: '48 min',
    topic: 'Macro & News',
    presenter: 'Arjan Kowalski',
    initials: 'AK',
    desc: 'Spread behavior, slippage data and the case for the pre/post-news lockout window — with archived tick data.',
    accent: '#3b82f6',
    views: '2.8k',
  },
  {
    title: 'Fair Value Gaps on M15: Fill Statistics Across 4 Years of Data',
    date: 'Jul 17, 2026',
    duration: '66 min',
    topic: 'SMC Deep-Dive',
    presenter: 'Tomas Okafor',
    initials: 'TO',
    desc: 'Which FVGs fill, which fail, and what the data says about using them as entry zones versus targets.',
    accent: '#8b5cf6',
    views: '4.9k',
  },
  {
    title: 'The Drawdown Diary: A Funded Trader Reviews His Worst Month',
    date: 'Jul 10, 2026',
    duration: '71 min',
    topic: 'Risk & Psychology',
    presenter: 'Arjan Kowalski',
    initials: 'AK',
    desc: 'A journaled, trade-by-trade autopsy of a -6.8% month — and the Risk Governor settings that contained it.',
    accent: '#10b981',
    views: '6.3k',
  },
  {
    title: 'Silver and the Gold Ratio: A Second Metal for Correlation Checks',
    date: 'Jul 3, 2026',
    duration: '52 min',
    topic: 'Gold & Metals',
    presenter: 'Dara Mensah',
    initials: 'DM',
    desc: 'Using XAGUSD and the gold/silver ratio as a confirmation layer inside Gate 9 correlation logic.',
    accent: '#f59e0b',
    views: '1.9k',
  },
  {
    title: 'Reading the Risk Governor: GREEN, AMBER and RED States Explained',
    date: 'Jun 26, 2026',
    duration: '44 min',
    topic: 'Platform',
    presenter: 'Lucia Varga',
    initials: 'LV',
    desc: 'What each equity-curve state means, why size gets throttled, and how to work with the governor instead of against it.',
    accent: '#06b6d4',
    views: '3.7k',
  },
  {
    title: 'Tilt Mechanics: The 90 Seconds After a Stop-Out',
    date: 'Jun 19, 2026',
    duration: '58 min',
    topic: 'Risk & Psychology',
    presenter: 'Lucia Varga',
    initials: 'LV',
    desc: 'The physiological window where revenge trades happen, and a repeatable reset protocol used by funded traders.',
    accent: '#10b981',
    views: '4.4k',
  },
  {
    title: 'FOMC Forward Guidance: Parsing Statements Like a Rates Desk',
    date: 'Jun 12, 2026',
    duration: '69 min',
    topic: 'Macro & News',
    presenter: 'Dara Mensah',
    initials: 'DM',
    desc: 'Dot plots, statement diffs and press-conference tells — what actually moves the dollar and what is noise.',
    accent: '#3b82f6',
    views: '2.5k',
  },
  {
    title: 'Break of Structure vs. Liquidity Sweep: The 5-Candle Test',
    date: 'Jun 5, 2026',
    duration: '61 min',
    topic: 'SMC Deep-Dive',
    presenter: 'Tomas Okafor',
    initials: 'TO',
    desc: 'A mechanical test separating genuine BOS from stop-hunts, validated across majors and gold.',
    accent: '#8b5cf6',
    views: '7.1k',
  },
  {
    title: 'Building Your Signal Routine Around the 12-Gate Terminal',
    date: 'May 29, 2026',
    duration: '39 min',
    topic: 'Platform',
    presenter: 'Arjan Kowalski',
    initials: 'AK',
    desc: 'A daily operating routine: pre-session checklist, signal triage, and end-of-day journal export.',
    accent: '#06b6d4',
    views: '3.3k',
  },
  {
    title: 'Position Sizing Under Prop-Firm Rules: The Math That Passes',
    date: 'May 22, 2026',
    duration: '64 min',
    topic: 'Risk & Psychology',
    presenter: 'Tomas Okafor',
    initials: 'TO',
    desc: 'Mapping daily-loss and max-drawdown constraints to per-trade risk. Includes the evaluation sizing worksheet.',
    accent: '#10b981',
    views: '5.8k',
  },
];

export default function WebinarsPage() {
  const [activeTopic, setActiveTopic] = useState<Topic>('All');

  useEffect(() => {
    document.title = 'HeroPips | Webinar Archive';
  }, []);

  const filtered = useMemo(
    () => (activeTopic === 'All' ? WEBINARS : WEBINARS.filter((w) => w.topic === activeTopic)),
    [activeTopic]
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .wb-page {
          background: var(--bg-app);
          color: var(--text-hi);
          overflow-x: clip;
        }
        .wb-inner {
          max-width: 1120px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }

        /* HERO */
        .wb-hero {
          padding: 150px 0 64px;
          text-align: center;
          position: relative;
        }
        .wb-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 720px; height: 420px;
          background: radial-gradient(ellipse at center top, color-mix(in srgb, var(--volt-500) 10%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }
        .wb-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--volt-500);
          border: 1px solid color-mix(in srgb, var(--volt-500) 35%, transparent);
          background: color-mix(in srgb, var(--volt-500) 7%, transparent);
          border-radius: 9999px;
          padding: 6px 14px;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }
        .wb-title {
          font-size: clamp(34px, 5.2vw, 58px);
          font-weight: 800;
          letter-spacing: -2.2px;
          line-height: 1.06;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }
        .wb-title-accent { color: var(--volt-500); }
        .wb-sub {
          font-size: 16px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 620px;
          margin: 0 auto 30px;
          position: relative;
          z-index: 1;
        }
        .wb-cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .wb-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--volt-500);
          color: var(--bg-app);
          font-size: 14px;
          font-weight: 700;
          padding: 12px 26px;
          border-radius: 9999px;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 4px 16px color-mix(in srgb, var(--volt-500) 30%, transparent);
        }
        .wb-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--volt-500) 40%, transparent);
        }
        .wb-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          color: var(--text-hi);
          border: 1px solid var(--border-subtle);
          font-size: 14px;
          font-weight: 600;
          padding: 12px 22px;
          border-radius: 9999px;
          text-decoration: none;
          transition: background 0.18s ease, border-color 0.18s ease;
        }
        .wb-btn-secondary:hover {
          background: var(--surface-2);
          border-color: var(--border-strong);
        }

        .wb-section { padding: 64px 0; }
        .wb-section-alt {
          background: var(--surface-1);
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }
        .wb-section-head { text-align: center; margin-bottom: 40px; }
        .wb-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--volt-500);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .wb-section-title {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .wb-section-desc {
          font-size: 14.5px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 580px;
          margin: 0 auto;
        }

        /* FEATURED SESSION */
        .wb-featured {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          overflow: hidden;
          background: var(--bg-app);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.07);
        }
        .wb-featured-visual {
          position: relative;
          min-height: 300px;
          background:
            radial-gradient(ellipse at 20% 20%, color-mix(in srgb, var(--volt-500) 22%, transparent) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 85%, rgba(59, 130, 246, 0.28) 0%, transparent 55%),
            #0b0f19;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .wb-featured-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 90%);
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 90%);
        }
        .wb-featured-play {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease, background 0.2s ease;
          cursor: pointer;
        }
        .wb-featured:hover .wb-featured-play {
          transform: scale(1.08);
          background: rgba(255, 255, 255, 0.14);
        }
        .wb-featured-live-tag {
          position: absolute;
          top: 18px; left: 18px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #ffffff;
          background: rgba(239, 68, 68, 0.9);
          border-radius: 6px;
          padding: 4px 9px;
          z-index: 1;
        }
        .wb-featured-body { padding: 34px; display: flex; flex-direction: column; }
        .wb-featured-topic {
          display: inline-flex;
          align-self: flex-start;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 5px;
          color: var(--wb-accent);
          background: color-mix(in srgb, var(--wb-accent) 10%, transparent);
          margin-bottom: 14px;
        }
        .wb-featured-title {
          font-size: clamp(19px, 2.4vw, 25px);
          font-weight: 800;
          letter-spacing: -0.7px;
          line-height: 1.25;
          margin-bottom: 12px;
        }
        .wb-featured-desc {
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.65;
          margin-bottom: 20px;
          flex-grow: 1;
        }
        .wb-featured-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .wb-presenter {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .wb-presenter-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--wb-accent), color-mix(in srgb, var(--wb-accent) 55%, #000));
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wb-presenter-name { font-size: 12.5px; font-weight: 700; }
        .wb-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          font-weight: 600;
          font-family: monospace;
          color: var(--text-low);
        }

        /* FILTER BAR */
        .wb-filter-bar {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 36px;
        }
        .wb-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          color: var(--text-mid);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .wb-filter-chip:hover {
          border-color: var(--border-strong);
          color: var(--text-hi);
        }
        .wb-filter-chip.active {
          background: var(--text-hi);
          border-color: var(--text-hi);
          color: var(--bg-app);
        }
        .wb-filter-count {
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
          opacity: 0.65;
        }

        /* WEBINAR GRID */
        .wb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .wb-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
          height: 100%;
        }
        .wb-card:hover {
          transform: translateY(-3px);
          border-color: var(--wb-accent);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.07);
        }
        .wb-card-thumb {
          position: relative;
          height: 128px;
          background:
            radial-gradient(ellipse at 25% 30%, color-mix(in srgb, var(--wb-accent) 30%, transparent) 0%, transparent 60%),
            #0b0f19;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wb-card-thumb-play {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform 0.2s ease;
        }
        .wb-card:hover .wb-card-thumb-play { transform: scale(1.12); }
        .wb-card-duration {
          position: absolute;
          bottom: 10px; right: 10px;
          font-size: 10.5px;
          font-weight: 800;
          font-family: monospace;
          color: #fff;
          background: rgba(0, 0, 0, 0.65);
          border-radius: 5px;
          padding: 3px 7px;
        }
        .wb-card-body {
          padding: 18px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .wb-card-topic {
          display: inline-flex;
          align-self: flex-start;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          border-radius: 4px;
          color: var(--wb-accent);
          background: color-mix(in srgb, var(--wb-accent) 10%, transparent);
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .wb-card-title {
          font-size: 14.5px;
          font-weight: 700;
          line-height: 1.35;
          margin-bottom: 8px;
        }
        .wb-card-desc {
          font-size: 12px;
          color: var(--text-low);
          line-height: 1.55;
          margin-bottom: 14px;
          flex-grow: 1;
        }
        .wb-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 12px;
        }
        .wb-card-presenter {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .wb-card-avatar {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--wb-accent);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wb-card-presenter-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-mid);
        }
        .wb-card-date {
          font-size: 10.5px;
          font-weight: 600;
          font-family: monospace;
          color: var(--text-low);
        }
        .wb-empty {
          text-align: center;
          color: var(--text-low);
          font-size: 14px;
          padding: 48px 0;
        }

        /* FINAL CTA */
        .wb-final {
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background:
            radial-gradient(ellipse at 50% 120%, color-mix(in srgb, var(--volt-500) 14%, transparent) 0%, transparent 60%),
            var(--surface-1);
          padding: 64px 32px;
          text-align: center;
        }
        .wb-final-title {
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .wb-final-desc {
          font-size: 14.5px;
          color: var(--text-low);
          max-width: 520px;
          margin: 0 auto 28px;
          line-height: 1.65;
        }
        .wb-disclaimer {
          font-size: 11px;
          color: var(--text-low);
          max-width: 640px;
          margin: 20px auto 0;
          line-height: 1.6;
          opacity: 0.8;
        }

        @media (max-width: 860px) {
          .wb-featured { grid-template-columns: 1fr; }
          .wb-featured-visual { min-height: 220px; }
        }
      ` }} />

      <div className="wb-page">
        {/* HERO */}
        <section className="wb-hero">
          <div className="wb-inner">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="wb-eyebrow">
                <PlaySquare size={13} />
                Hero Academy · Webinar Archive
              </span>
              <h1 className="wb-title">
                Every live session, forecast<br />
                and deep-dive — <span className="wb-title-accent">on demand.</span>
              </h1>
              <p className="wb-sub">
                Weekly live webinars from the HeroPips desk: macro previews before NFP and FOMC,
                gold outlooks, SMC methodology deep-dives, and risk clinics. Recorded, indexed,
                and searchable by topic.
              </p>
              <div className="wb-cta-row">
                <a href="/login?signup=true" className="wb-btn-primary">
                  Unlock the Full Archive <ArrowRight size={15} />
                </a>
                <a href="#wb-archive" className="wb-btn-secondary">
                  Browse Sessions
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURED LATEST SESSION */}
        <section className="wb-section">
          <div className="wb-inner">
            <div className="wb-section-head">
              <p className="wb-section-eyebrow">Latest Session</p>
              <h2 className="wb-section-title">Fresh from the desk</h2>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="wb-featured"
              style={{ '--wb-accent': FEATURED.accent } as React.CSSProperties}
            >
              <div className="wb-featured-visual">
                <div className="wb-featured-grid-bg" />
                <span className="wb-featured-live-tag">
                  <Radio size={11} />
                  RECORDED LIVE
                </span>
                <div className="wb-featured-play">
                  <Play size={26} style={{ marginLeft: 3 }} />
                </div>
              </div>
              <div className="wb-featured-body">
                <span className="wb-featured-topic">{FEATURED.topic}</span>
                <h3 className="wb-featured-title">{FEATURED.title}</h3>
                <p className="wb-featured-desc">{FEATURED.desc}</p>
                <div className="wb-featured-meta">
                  <span className="wb-presenter">
                    <span className="wb-presenter-avatar">{FEATURED.initials}</span>
                    <span className="wb-presenter-name">{FEATURED.presenter}</span>
                  </span>
                  <span className="wb-meta-chip"><CalendarDays size={12} /> {FEATURED.date}</span>
                  <span className="wb-meta-chip"><Clock size={12} /> {FEATURED.duration}</span>
                  <span className="wb-meta-chip"><Video size={12} /> {FEATURED.views} views</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ARCHIVE GRID + FILTER */}
        <section className="wb-section wb-section-alt" id="wb-archive">
          <div className="wb-inner">
            <div className="wb-section-head">
              <p className="wb-section-eyebrow">The Archive</p>
              <h2 className="wb-section-title">Browse by topic</h2>
              <p className="wb-section-desc">
                Every session below was delivered live to members and recorded in full.
                Filter the archive to the track you are working on.
              </p>
            </div>

            <div className="wb-filter-bar" role="tablist" aria-label="Filter webinars by topic">
              {TOPICS.map((t) => {
                const count =
                  t.key === 'All'
                    ? WEBINARS.length
                    : WEBINARS.filter((w) => w.topic === t.key).length;
                return (
                  <button
                    key={t.key}
                    className={`wb-filter-chip ${activeTopic === t.key ? 'active' : ''}`}
                    onClick={() => setActiveTopic(t.key)}
                    role="tab"
                    aria-selected={activeTopic === t.key}
                  >
                    {t.icon ?? <Filter size={12} />}
                    {t.key}
                    <span className="wb-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <motion.div layout className="wb-grid">
              <AnimatePresence mode="popLayout">
                {filtered.map((w) => (
                  <motion.div
                    key={w.title}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div
                      className="wb-card"
                      style={{ '--wb-accent': w.accent } as React.CSSProperties}
                    >
                      <div className="wb-card-thumb">
                        <div className="wb-card-thumb-play">
                          <Play size={16} style={{ marginLeft: 2 }} />
                        </div>
                        <span className="wb-card-duration">{w.duration}</span>
                      </div>
                      <div className="wb-card-body">
                        <span className="wb-card-topic">{w.topic}</span>
                        <h3 className="wb-card-title">{w.title}</h3>
                        <p className="wb-card-desc">{w.desc}</p>
                        <div className="wb-card-footer">
                          <span className="wb-card-presenter">
                            <span className="wb-card-avatar">{w.initials}</span>
                            <span className="wb-card-presenter-name">{w.presenter}</span>
                          </span>
                          <span className="wb-card-date">{w.date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filtered.length === 0 && (
              <p className="wb-empty">No sessions in this topic yet — check back after the next live event.</p>
            )}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="wb-section">
          <div className="wb-inner">
            <div className="wb-final">
              <h2 className="wb-final-title">The next session is live this week.</h2>
              <p className="wb-final-desc">
                Members join webinars live, put questions directly to the desk, and get every
                recording, slide deck and worksheet within 24 hours. Free accounts can preview
                one archived session per month.
              </p>
              <div className="wb-cta-row">
                <a href="/login?signup=true" className="wb-btn-primary">
                  Join the Next Live Session <ArrowRight size={15} />
                </a>
              </div>
              <p className="wb-disclaimer">
                Webinar content is educational commentary and does not constitute investment
                advice or a solicitation to trade. Market outlooks reflect the presenter&apos;s
                analysis at the time of recording. Trading foreign exchange and CFDs carries a
                high level of risk and may not be suitable for all investors.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
