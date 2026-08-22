'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Shield, Layers, Target, ArrowRight, CheckCircle2,
  Clock, Users, BookOpen, Gauge, Activity, TrendingUp, Award,
  ChevronDown, CalendarDays, LineChart, Lock
} from 'lucide-react';
import TiltCard from '../../TiltCard';

// ---------------------------------------------------------
// CURRICULUM DATA
// ---------------------------------------------------------

interface WeekModule {
  week: string;
  title: string;
  focus: string;
  desc: string;
  outcomes: string[];
  sessions: string;
  accent: string;
  icon: React.ReactNode;
}

const CURRICULUM: WeekModule[] = [
  {
    week: '01',
    title: 'Foundations & Risk Architecture',
    focus: 'CAPITAL PRESERVATION',
    desc: 'Before a single chart is opened, we install the risk framework. Position sizing math, expectancy, drawdown behavior, and why the Risk Governor throttles size before you ever feel the urge to.',
    outcomes: [
      'Compute fixed-fractional and Kelly-derived position sizes by hand',
      'Model drawdown recovery curves and understand the 25% terminal wall',
      'Configure a personal daily-loss circuit breaker (3.0% / 4.5% / 6.0% tiers)',
      'Read an equity curve like a strategy health monitor',
    ],
    sessions: '4 live sessions · 6 lab exercises',
    accent: '#ef4444',
    icon: <Shield size={18} />,
  },
  {
    week: '02',
    title: 'The 12-Gate Methodology',
    focus: 'SIGNAL VALIDATION',
    desc: 'A gate-by-gate walkthrough of the confluence engine: what each check measures, the failure mode it prevents, and how to run the same audit manually on any chart before the engine confirms it for you.',
    outcomes: [
      'Audit a setup against all 12 gates without software assistance',
      'Identify BOS, ChoCH, FVG and Order Blocks on M15/H1 structure',
      'Grade multi-timeframe alignment across W1 / D1 / 4H stacks',
      'Explain why a 9/12 pass is tradeable and a 7/12 pass is not',
    ],
    sessions: '5 live sessions · 12 gate labs',
    accent: '#3b82f6',
    icon: <Layers size={18} />,
  },
  {
    week: '03',
    title: 'Live Signal Walkthroughs',
    focus: 'EXECUTION DISCIPLINE',
    desc: 'Real signals, replayed and dissected. Each session takes one archived HeroPips signal from detection through exit — including the losers — and maps every decision back to the framework.',
    outcomes: [
      'Journal entries, management and exits against a fixed checklist',
      'Practice partial take-profit and break-even migration rules',
      'Diagnose slippage, spread widening and session-liquidity effects',
      'Complete 10 simulated executions with full post-trade reviews',
    ],
    sessions: '5 live sessions · 10 replay labs',
    accent: '#10b981',
    icon: <Activity size={18} />,
  },
  {
    week: '04',
    title: 'Funded-Account Readiness',
    focus: 'EVALUATION PROTOCOL',
    desc: 'The capstone week maps everything to prop-firm evaluation rules: daily loss limits, max drawdown, consistency requirements. You leave with a written trading plan and a pass/fail simulation record.',
    outcomes: [
      'Translate evaluation rules into personal Risk Governor settings',
      'Run a full 10-day simulated evaluation with graded scorecards',
      'Draft a one-page trading plan reviewed by a funded mentor',
      'Exit checkpoint: readiness assessment and next-step routing',
    ],
    sessions: '4 live sessions · capstone evaluation',
    accent: '#8b5cf6',
    icon: <Award size={18} />,
  },
];

const FORMAT_POINTS = [
  {
    icon: <Users size={16} />,
    title: 'Cohort-based, capped at 40 seats',
    desc: 'Small enough that instructors know your journal. Cohorts start on the first Monday of each month.',
  },
  {
    icon: <Clock size={16} />,
    title: '4 weeks · ~6 hours per week',
    desc: 'Two evening live sessions weekly (recorded), plus structured lab work you complete on your own schedule.',
  },
  {
    icon: <BookOpen size={16} />,
    title: 'Checklists over lectures',
    desc: 'Every concept ships as a printable checklist or worksheet. If it cannot be audited, we do not teach it.',
  },
  {
    icon: <LineChart size={16} />,
    title: 'Graded simulation, not screenshots',
    desc: 'Progress is measured on journaled sim executions with rule-adherence scoring — not on profit claims.',
  },
];

const OUTCOME_STATS = [
  { value: '18', label: 'Live sessions', desc: 'Across the 4-week cohort' },
  { value: '28+', label: 'Lab exercises', desc: 'Checklist-driven practice' },
  { value: '10', label: 'Graded sim trades', desc: 'Full post-trade reviews' },
  { value: '1:10', label: 'Mentor ratio', desc: 'Instructors per cohort' },
];

const FAQS = [
  {
    q: 'Do I need prior trading experience?',
    a: 'No. Week 1 assumes zero background and builds the risk framework from first principles. Experienced traders typically report Week 1 is where they unlearn the most damaging habits.',
  },
  {
    q: 'Is this a profit guarantee or a signals subscription?',
    a: 'Neither. Hero Bootcamp is an education program. It teaches the methodology behind the HeroPips engine so you can evaluate signals critically. No outcome or profitability is guaranteed — trading involves substantial risk of loss.',
  },
  {
    q: 'What happens if I miss a live session?',
    a: 'All sessions are recorded and posted within 24 hours. Lab work is asynchronous. To graduate you must complete the Week 4 capstone evaluation, which has a two-week grace window.',
  },
  {
    q: 'Does graduating qualify me for a funded account?',
    a: 'Graduation gives you a readiness assessment mapped to common prop-firm rule sets, plus a reviewed trading plan. Funding decisions rest entirely with third-party firms and their own evaluations.',
  },
];

export default function BootcampPage() {
  const [activeWeek, setActiveWeek] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'HeroPips | Hero Bootcamp';
  }, []);

  const current = CURRICULUM[activeWeek];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .bc-page {
          background: var(--bg-app);
          color: var(--text-hi);
          overflow-x: clip;
        }
        .bc-inner {
          max-width: 1120px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }

        /* HERO */
        .bc-hero {
          padding: 150px 0 72px;
          text-align: center;
          position: relative;
        }
        .bc-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 720px; height: 420px;
          background: radial-gradient(ellipse at center top, color-mix(in srgb, var(--volt-500) 10%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }
        .bc-eyebrow {
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
        .bc-title {
          font-size: clamp(34px, 5.2vw, 58px);
          font-weight: 800;
          letter-spacing: -2.2px;
          line-height: 1.06;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }
        .bc-title-accent { color: var(--volt-500); }
        .bc-sub {
          font-size: 16px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 620px;
          margin: 0 auto 30px;
          position: relative;
          z-index: 1;
        }
        .bc-cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .bc-btn-primary {
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
        .bc-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--volt-500) 40%, transparent);
        }
        .bc-btn-secondary {
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
        .bc-btn-secondary:hover {
          background: var(--surface-2);
          border-color: var(--border-strong);
        }

        /* SECTION SHELL */
        .bc-section { padding: 72px 0; }
        .bc-section-alt {
          background: var(--surface-1);
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }
        .bc-section-head {
          text-align: center;
          margin-bottom: 44px;
        }
        .bc-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--volt-500);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .bc-section-title {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .bc-section-desc {
          font-size: 14.5px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 580px;
          margin: 0 auto;
        }

        /* CURRICULUM TIMELINE */
        .bc-timeline-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 28px;
          align-items: start;
        }
        .bc-timeline-rail {
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .bc-timeline-rail::before {
          content: '';
          position: absolute;
          left: 19px;
          top: 24px;
          bottom: 24px;
          width: 2px;
          background: var(--border-subtle);
        }
        .bc-week-node {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 12px;
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s ease, border-color 0.2s ease;
          position: relative;
          text-align: left;
          background: none;
          font-family: inherit;
          width: 100%;
        }
        .bc-week-node:hover { background: var(--surface-2); }
        .bc-week-node.active {
          background: var(--surface-1);
          border-color: var(--border-subtle);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
        }
        .bc-week-dot {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--surface-2);
          border: 2px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-mid);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          transition: all 0.2s ease;
        }
        .bc-week-node.active .bc-week-dot {
          background: var(--week-accent);
          border-color: var(--week-accent);
          color: #fff;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--week-accent) 18%, transparent);
        }
        .bc-week-node-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-hi);
          margin-bottom: 2px;
        }
        .bc-week-node-meta {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-low);
          text-transform: uppercase;
        }

        .bc-week-detail {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          min-height: 420px;
        }
        .bc-week-detail::after {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, color-mix(in srgb, var(--week-accent) 10%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }
        .bc-week-focus-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 4px 10px;
          border-radius: 5px;
          color: var(--week-accent);
          background: color-mix(in srgb, var(--week-accent) 10%, transparent);
          margin-bottom: 14px;
        }
        .bc-week-detail-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.6px;
          margin-bottom: 10px;
        }
        .bc-week-detail-desc {
          font-size: 14px;
          color: var(--text-mid);
          line-height: 1.65;
          margin-bottom: 22px;
          max-width: 560px;
        }
        .bc-outcome-list {
          list-style: none;
          margin: 0 0 22px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bc-outcome-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.5;
        }
        .bc-outcome-item svg {
          flex-shrink: 0;
          margin-top: 2px;
          color: var(--week-accent);
        }
        .bc-week-sessions {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          font-family: monospace;
          color: var(--text-low);
          border: 1px dashed var(--border-strong);
          border-radius: 8px;
          padding: 7px 12px;
        }

        /* FORMAT GRID */
        .bc-format-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .bc-format-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 24px;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }
        .bc-format-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }
        .bc-format-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--volt-500) 10%, transparent);
          color: var(--volt-500);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .bc-format-title {
          font-size: 14.5px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .bc-format-desc {
          font-size: 12.5px;
          color: var(--text-low);
          line-height: 1.55;
        }

        /* STATS STRIP */
        .bc-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          background: var(--border-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          overflow: hidden;
        }
        .bc-stat-cell {
          background: var(--bg-app);
          padding: 26px 20px;
          text-align: center;
        }
        .bc-stat-value {
          font-size: 30px;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: -1px;
          color: var(--volt-500);
          margin-bottom: 4px;
        }
        .bc-stat-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-hi);
        }
        .bc-stat-desc {
          font-size: 11px;
          color: var(--text-low);
          margin-top: 2px;
        }

        /* FAQ */
        .bc-faq-list {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bc-faq-item {
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          background: var(--bg-app);
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .bc-faq-item.open { border-color: var(--border-strong); }
        .bc-faq-q {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-hi);
          text-align: left;
        }
        .bc-faq-chevron { transition: transform 0.25s ease; flex-shrink: 0; color: var(--text-low); }
        .bc-faq-item.open .bc-faq-chevron { transform: rotate(180deg); }
        .bc-faq-a {
          font-size: 13.5px;
          color: var(--text-mid);
          line-height: 1.65;
          padding: 0 20px 18px;
        }

        /* FINAL CTA */
        .bc-final {
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background:
            radial-gradient(ellipse at 50% 120%, color-mix(in srgb, var(--volt-500) 14%, transparent) 0%, transparent 60%),
            var(--surface-1);
          padding: 64px 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .bc-final-title {
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .bc-final-desc {
          font-size: 14.5px;
          color: var(--text-low);
          max-width: 520px;
          margin: 0 auto 28px;
          line-height: 1.65;
        }
        .bc-disclaimer {
          font-size: 11px;
          color: var(--text-low);
          max-width: 640px;
          margin: 20px auto 0;
          line-height: 1.6;
          opacity: 0.8;
        }

        @media (max-width: 900px) {
          .bc-timeline-layout { grid-template-columns: 1fr; }
          .bc-timeline-rail {
            flex-direction: row;
            overflow-x: auto;
            gap: 8px;
            padding-bottom: 6px;
          }
          .bc-timeline-rail::before { display: none; }
          .bc-week-node { min-width: 220px; }
          .bc-week-detail { min-height: 0; }
        }
      ` }} />

      <div className="bc-page">
        {/* HERO */}
        <section className="bc-hero">
          <div className="bc-inner">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="bc-eyebrow">
                <GraduationCap size={13} />
                Hero Academy · Bootcamp
              </span>
              <h1 className="bc-title">
                Four weeks from first principles<br />
                to <span className="bc-title-accent">funded-account ready.</span>
              </h1>
              <p className="bc-sub">
                Hero Bootcamp is a structured, cohort-based onboarding built on the same
                12-gate methodology that powers the HeroPips engine. Risk architecture first,
                signal validation second, execution discipline throughout.
              </p>
              <div className="bc-cta-row">
                <a href="/login?signup=true" className="bc-btn-primary">
                  Reserve a Cohort Seat <ArrowRight size={15} />
                </a>
                <a href="#bc-curriculum" className="bc-btn-secondary">
                  View the Syllabus
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CURRICULUM TIMELINE */}
        <section className="bc-section bc-section-alt" id="bc-curriculum">
          <div className="bc-inner">
            <div className="bc-section-head">
              <p className="bc-section-eyebrow">The Syllabus</p>
              <h2 className="bc-section-title">A curriculum that compounds week over week</h2>
              <p className="bc-section-desc">
                Each week is a prerequisite for the next. Select a week to inspect its focus,
                measurable outcomes, and session load.
              </p>
            </div>

            <div
              className="bc-timeline-layout"
              style={{ '--week-accent': current.accent } as React.CSSProperties}
            >
              {/* Rail */}
              <div className="bc-timeline-rail">
                {CURRICULUM.map((w, i) => (
                  <button
                    key={w.week}
                    className={`bc-week-node ${activeWeek === i ? 'active' : ''}`}
                    style={{ '--week-accent': w.accent } as React.CSSProperties}
                    onClick={() => setActiveWeek(i)}
                    aria-pressed={activeWeek === i}
                  >
                    <span className="bc-week-dot">W{w.week}</span>
                    <span>
                      <span className="bc-week-node-title">{w.title}</span><br />
                      <span className="bc-week-node-meta">{w.focus}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Detail pane */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.week}
                  className="bc-week-detail"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="bc-week-focus-tag">
                    {current.icon}
                    WEEK {current.week} — {current.focus}
                  </span>
                  <h3 className="bc-week-detail-title">{current.title}</h3>
                  <p className="bc-week-detail-desc">{current.desc}</p>
                  <ul className="bc-outcome-list">
                    {current.outcomes.map((o) => (
                      <li key={o} className="bc-outcome-item">
                        <CheckCircle2 size={15} />
                        {o}
                      </li>
                    ))}
                  </ul>
                  <span className="bc-week-sessions">
                    <CalendarDays size={13} />
                    {current.sessions}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* COHORT FORMAT */}
        <section className="bc-section">
          <div className="bc-inner">
            <div className="bc-section-head">
              <p className="bc-section-eyebrow">Cohort Format</p>
              <h2 className="bc-section-title">Built like a training desk, not a video library</h2>
              <p className="bc-section-desc">
                Passive content does not change execution behavior. Every element of the bootcamp
                is structured around accountability and measurable rule-adherence.
              </p>
            </div>
            <div className="bc-format-grid">
              {FORMAT_POINTS.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <TiltCard className="bc-format-card">
                    <div className="bc-format-icon">{f.icon}</div>
                    <h3 className="bc-format-title">{f.title}</h3>
                    <p className="bc-format-desc">{f.desc}</p>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className="bc-section" style={{ paddingTop: 0 }}>
          <div className="bc-inner">
            <div className="bc-stats-strip">
              {OUTCOME_STATS.map((s) => (
                <div key={s.label} className="bc-stat-cell">
                  <div className="bc-stat-value">{s.value}</div>
                  <div className="bc-stat-label">{s.label}</div>
                  <div className="bc-stat-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bc-section bc-section-alt">
          <div className="bc-inner">
            <div className="bc-section-head">
              <p className="bc-section-eyebrow">Common Questions</p>
              <h2 className="bc-section-title">Before you reserve a seat</h2>
            </div>
            <div className="bc-faq-list">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className={`bc-faq-item ${open ? 'open' : ''}`}>
                    <button
                      className="bc-faq-q"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                    >
                      {f.q}
                      <ChevronDown size={17} className="bc-faq-chevron" />
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <p className="bc-faq-a">{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bc-section">
          <div className="bc-inner">
            <div className="bc-final">
              <h2 className="bc-final-title">The next cohort starts the first Monday of the month.</h2>
              <p className="bc-final-desc">
                Seats are capped at 40 per cohort to preserve the mentor ratio. Create an account
                to view upcoming cohort dates and reserve a place.
              </p>
              <div className="bc-cta-row">
                <a href="/login?signup=true" className="bc-btn-primary">
                  Start Your Application <ArrowRight size={15} />
                </a>
              </div>
              <p className="bc-disclaimer">
                Hero Bootcamp is an educational program. Nothing in the curriculum constitutes
                financial advice, and no trading outcome is guaranteed. Trading foreign exchange
                and CFDs carries a high level of risk and may not be suitable for all investors.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
