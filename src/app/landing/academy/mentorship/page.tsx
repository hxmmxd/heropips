'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowRight, CalendarDays, Clock, MessageSquare, LineChart,
  Brain, CheckCircle2, Star, Shield, Video, NotebookPen, ChevronRight,
  BadgeCheck
} from 'lucide-react';
import TiltCard from '../../TiltCard';

// ---------------------------------------------------------
// MENTOR & SESSION DATA (fictional mentors, initials avatars)
// ---------------------------------------------------------

interface Mentor {
  initials: string;
  name: string;
  role: string;
  focus: string[];
  desk: string;
  years: string;
  quote: string;
  accent: string;
}

const MENTORS: Mentor[] = [
  {
    initials: 'AK',
    name: 'Arjan Kowalski',
    role: 'Funded Trader · FX Majors',
    focus: ['Risk frameworks', 'Session timing', 'EURUSD / GBPUSD'],
    desk: 'Passed 3 evaluations · manages a 6-figure funded allocation',
    years: '9 yrs',
    quote: 'Most traders fail sizing before they fail analysis. We fix sizing first.',
    accent: '#3b82f6',
  },
  {
    initials: 'DM',
    name: 'Dara Mensah',
    role: 'Funded Trader · Metals & Indices',
    focus: ['SMC structure', 'Gold volatility', 'News protocols'],
    desk: 'Specialist in XAUUSD regime shifts and high-impact event handling',
    years: '7 yrs',
    quote: 'A trade journal you never re-read is a diary. We turn yours into data.',
    accent: '#f59e0b',
  },
  {
    initials: 'LV',
    name: 'Lucia Varga',
    role: 'Trading Psychologist',
    focus: ['Tilt recovery', 'Drawdown psychology', 'Routine design'],
    desk: 'Works with evaluation-stage traders on rule adherence under stress',
    years: '11 yrs',
    quote: 'Discipline is not willpower. It is environment design plus review cadence.',
    accent: '#8b5cf6',
  },
  {
    initials: 'TO',
    name: 'Tomas Okafor',
    role: 'Funded Trader · Systematic',
    focus: ['12-gate audits', 'Backtest hygiene', 'Expectancy math'],
    desk: 'Maps discretionary habits onto quantified, checklist-driven process',
    years: '8 yrs',
    quote: 'If a setup cannot survive a gate audit, it does not deserve your capital.',
    accent: '#10b981',
  },
];

interface SessionFormat {
  key: string;
  icon: React.ReactNode;
  name: string;
  duration: string;
  desc: string;
  bullets: string[];
}

const FORMATS: SessionFormat[] = [
  {
    key: 'review',
    icon: <NotebookPen size={17} />,
    name: 'Trade Review',
    duration: '45 min',
    desc: 'Bring your last 10–20 journaled trades. Your mentor audits each against the 12-gate checklist and your own written plan, then isolates the one or two behaviors costing the most expectancy.',
    bullets: ['Journal audit with rule-adherence scoring', 'Written action list after every session', 'Progress tracked across sessions'],
  },
  {
    key: 'live',
    icon: <Video size={17} />,
    name: 'Live Session',
    duration: '60 min',
    desc: 'Screen-share through an active London or New York session. Watch how a funded trader narrates structure, waits through no-trade conditions, and executes — or deliberately stands aside.',
    bullets: ['Real-time market narration', 'Emphasis on the trades not taken', 'Recording provided afterwards'],
  },
  {
    key: 'psych',
    icon: <Brain size={17} />,
    name: 'Psychology',
    duration: '45 min',
    desc: 'Structured work on the behavioral layer: revenge trading, hesitation after losses, oversizing after wins. Built around your journal data, not generic mindset talk.',
    bullets: ['Pattern diagnosis from your own logs', 'Personal tilt-protocol document', 'Optional recurring cadence'],
  },
];

const BOOKING_STEPS = [
  {
    num: '01',
    title: 'Pick a mentor and format',
    desc: 'Filter mentors by specialty — risk, structure, psychology — and choose the session type that matches your current bottleneck.',
  },
  {
    num: '02',
    title: 'Share your journal ahead of time',
    desc: 'Sessions start prepared. Your mentor reviews your journal exports and written plan before the call, so the hour is spent on findings, not context.',
  },
  {
    num: '03',
    title: 'Meet, review, leave with actions',
    desc: 'Every session ends with a written action list and, where relevant, updated Risk Governor settings to enforce it mechanically.',
  },
];

// Mock booking widget data
const DAYS = [
  { label: 'Mon', date: '24' },
  { label: 'Tue', date: '25' },
  { label: 'Wed', date: '26' },
  { label: 'Thu', date: '27' },
  { label: 'Fri', date: '28' },
];
const SLOTS = ['09:00', '10:30', '13:00', '15:30', '17:00', '19:30'];

export default function MentorshipPage() {
  const [selMentor, setSelMentor] = useState(0);
  const [selFormat, setSelFormat] = useState('review');
  const [selDay, setSelDay] = useState(2);
  const [selSlot, setSelSlot] = useState<string | null>('13:00');

  useEffect(() => {
    document.title = 'HeroPips | 1-on-1 Mentorship';
  }, []);

  const mentor = MENTORS[selMentor];
  const format = FORMATS.find((f) => f.key === selFormat) ?? FORMATS[0];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .mn-page {
          background: var(--bg-app);
          color: var(--text-hi);
          overflow-x: clip;
        }
        .mn-inner {
          max-width: 1120px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }

        /* HERO */
        .mn-hero {
          padding: 150px 0 72px;
          text-align: center;
          position: relative;
        }
        .mn-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 720px; height: 420px;
          background: radial-gradient(ellipse at center top, color-mix(in srgb, var(--volt-500) 10%, transparent) 0%, transparent 70%);
          pointer-events: none;
        }
        .mn-eyebrow {
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
        .mn-title {
          font-size: clamp(34px, 5.2vw, 58px);
          font-weight: 800;
          letter-spacing: -2.2px;
          line-height: 1.06;
          margin-bottom: 18px;
          position: relative;
          z-index: 1;
        }
        .mn-title-accent { color: var(--volt-500); }
        .mn-sub {
          font-size: 16px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 620px;
          margin: 0 auto 30px;
          position: relative;
          z-index: 1;
        }
        .mn-cta-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .mn-btn-primary {
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
        .mn-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--volt-500) 40%, transparent);
        }
        .mn-btn-secondary {
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
        .mn-btn-secondary:hover {
          background: var(--surface-2);
          border-color: var(--border-strong);
        }

        .mn-section { padding: 72px 0; }
        .mn-section-alt {
          background: var(--surface-1);
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }
        .mn-section-head { text-align: center; margin-bottom: 44px; }
        .mn-section-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--volt-500);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .mn-section-title {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .mn-section-desc {
          font-size: 14.5px;
          color: var(--text-low);
          line-height: 1.65;
          max-width: 580px;
          margin: 0 auto;
        }

        /* MENTOR CARDS */
        .mn-mentor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .mn-mentor-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .mn-mentor-card:hover {
          transform: translateY(-3px);
          border-color: var(--mentor-accent);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.07);
        }
        .mn-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #fff;
          background: linear-gradient(135deg, var(--mentor-accent), color-mix(in srgb, var(--mentor-accent) 55%, #000));
          margin-bottom: 14px;
          flex-shrink: 0;
        }
        .mn-mentor-name {
          font-size: 15.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mn-mentor-name svg { color: var(--mentor-accent); }
        .mn-mentor-role {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-low);
          margin-bottom: 12px;
        }
        .mn-mentor-desk {
          font-size: 12px;
          color: var(--text-mid);
          line-height: 1.55;
          margin-bottom: 14px;
          flex-grow: 1;
        }
        .mn-focus-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        .mn-focus-chip {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
          color: var(--mentor-accent);
          background: color-mix(in srgb, var(--mentor-accent) 9%, transparent);
          border: 1px solid color-mix(in srgb, var(--mentor-accent) 22%, transparent);
        }
        .mn-mentor-quote {
          font-size: 12px;
          font-style: italic;
          color: var(--text-mid);
          line-height: 1.55;
          border-left: 3px solid var(--mentor-accent);
          padding-left: 10px;
        }
        .mn-mentor-years {
          position: absolute;
          top: 22px; right: 22px;
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-low);
          border: 1px solid var(--border-subtle);
          padding: 3px 7px;
          border-radius: 5px;
        }

        /* SESSION FORMATS */
        .mn-format-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .mn-format-card {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 26px;
          height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mn-format-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }
        .mn-format-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .mn-format-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--volt-500) 10%, transparent);
          color: var(--volt-500);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mn-format-duration {
          font-size: 11px;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-low);
          border: 1px solid var(--border-subtle);
          border-radius: 5px;
          padding: 3px 8px;
        }
        .mn-format-name { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
        .mn-format-desc {
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .mn-format-bullets {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mn-format-bullet {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 12.5px;
          color: var(--text-mid);
        }
        .mn-format-bullet svg { color: var(--volt-500); flex-shrink: 0; margin-top: 1px; }

        /* BOOKING MOCK */
        .mn-booking-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 28px;
          align-items: start;
        }
        .mn-steps { display: flex; flex-direction: column; gap: 20px; }
        .mn-step { display: flex; gap: 16px; }
        .mn-step-num {
          width: 34px; height: 34px;
          border-radius: 50%;
          background: var(--text-hi);
          color: var(--bg-app);
          font-size: 12px;
          font-weight: 800;
          font-family: monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mn-step-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .mn-step-desc { font-size: 13px; color: var(--text-mid); line-height: 1.6; }

        .mn-booking-widget {
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 18px;
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.07);
          overflow: hidden;
        }
        .mn-widget-head {
          padding: 18px 22px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface-1);
        }
        .mn-widget-head-title {
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mn-widget-head-title svg { color: var(--volt-500); }
        .mn-widget-demo-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-low);
          border: 1px dashed var(--border-strong);
          padding: 3px 8px;
          border-radius: 5px;
        }
        .mn-widget-body { padding: 22px; }
        .mn-widget-label {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-low);
          margin-bottom: 10px;
        }
        .mn-widget-mentors {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .mn-widget-mentor-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 12px 6px 6px;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-mid);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .mn-widget-mentor-btn:hover { border-color: var(--border-strong); }
        .mn-widget-mentor-btn.active {
          border-color: var(--mentor-accent);
          color: var(--text-hi);
          background: color-mix(in srgb, var(--mentor-accent) 7%, transparent);
        }
        .mn-widget-mentor-avatar {
          width: 24px; height: 24px;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 800;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--mentor-accent);
        }
        .mn-widget-formats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .mn-widget-format-btn {
          padding: 10px 8px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-mid);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          transition: all 0.18s ease;
        }
        .mn-widget-format-btn:hover { border-color: var(--border-strong); }
        .mn-widget-format-btn.active {
          border-color: var(--volt-500);
          color: var(--text-hi);
          background: color-mix(in srgb, var(--volt-500) 7%, transparent);
        }
        .mn-widget-days {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .mn-widget-day-btn {
          padding: 10px 4px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          font-family: inherit;
          cursor: pointer;
          text-align: center;
          transition: all 0.18s ease;
        }
        .mn-widget-day-btn:hover { border-color: var(--border-strong); }
        .mn-widget-day-btn.active {
          border-color: var(--volt-500);
          background: color-mix(in srgb, var(--volt-500) 7%, transparent);
        }
        .mn-widget-day-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-low);
          text-transform: uppercase;
        }
        .mn-widget-day-date {
          display: block;
          font-size: 15px;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-hi);
        }
        .mn-widget-slots {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 22px;
        }
        .mn-widget-slot-btn {
          padding: 9px 4px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          font-family: monospace;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-mid);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .mn-widget-slot-btn:hover { border-color: var(--border-strong); }
        .mn-widget-slot-btn.active {
          border-color: var(--volt-500);
          background: var(--volt-500);
          color: var(--bg-app);
        }
        .mn-widget-summary {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 12.5px;
          color: var(--text-mid);
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .mn-widget-summary strong { color: var(--text-hi); }
        .mn-widget-book-btn {
          width: 100%;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          background: var(--volt-500);
          color: var(--bg-app);
          font-size: 13.5px;
          font-weight: 800;
          font-family: inherit;
          padding: 13px;
          border-radius: 12px;
          border: none;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 4px 14px color-mix(in srgb, var(--volt-500) 28%, transparent);
        }
        .mn-widget-book-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px color-mix(in srgb, var(--volt-500) 38%, transparent);
        }

        /* FINAL CTA */
        .mn-final {
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background:
            radial-gradient(ellipse at 50% 120%, color-mix(in srgb, var(--volt-500) 14%, transparent) 0%, transparent 60%),
            var(--surface-1);
          padding: 64px 32px;
          text-align: center;
        }
        .mn-final-title {
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 800;
          letter-spacing: -1.2px;
          margin-bottom: 12px;
        }
        .mn-final-desc {
          font-size: 14.5px;
          color: var(--text-low);
          max-width: 520px;
          margin: 0 auto 28px;
          line-height: 1.65;
        }
        .mn-disclaimer {
          font-size: 11px;
          color: var(--text-low);
          max-width: 640px;
          margin: 20px auto 0;
          line-height: 1.6;
          opacity: 0.8;
        }

        @media (max-width: 900px) {
          .mn-booking-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .mn-widget-slots { grid-template-columns: repeat(2, 1fr); }
        }
      ` }} />

      <div className="mn-page">
        {/* HERO */}
        <section className="mn-hero">
          <div className="mn-inner">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="mn-eyebrow">
                <Users size={13} />
                Hero Academy · 1-on-1 Mentorship
              </span>
              <h1 className="mn-title">
                One hour with a funded trader<br />
                beats <span className="mn-title-accent">a hundred hours of videos.</span>
              </h1>
              <p className="mn-sub">
                Book private sessions with traders who have passed evaluations and manage live
                allocations — plus a dedicated trading psychologist. Every session is prepared
                from your journal and ends with a written action list.
              </p>
              <div className="mn-cta-row">
                <a href="/login?signup=true" className="mn-btn-primary">
                  Book Your First Session <ArrowRight size={15} />
                </a>
                <a href="#mn-mentors" className="mn-btn-secondary">
                  Meet the Mentors
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* MENTORS */}
        <section className="mn-section mn-section-alt" id="mn-mentors">
          <div className="mn-inner">
            <div className="mn-section-head">
              <p className="mn-section-eyebrow">The Bench</p>
              <h2 className="mn-section-title">Mentors who are graded on your progress</h2>
              <p className="mn-section-desc">
                Every HeroPips mentor trades or coaches under the same 12-gate methodology taught
                in the Academy — no outside gurus, no conflicting frameworks.
              </p>
            </div>
            <div className="mn-mentor-grid">
              {MENTORS.map((m, i) => (
                <motion.div
                  key={m.initials}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <TiltCard
                    className="mn-mentor-card"
                    style={{ '--mentor-accent': m.accent } as React.CSSProperties}
                  >
                    <span className="mn-mentor-years">{m.years}</span>
                    <div className="mn-avatar">{m.initials}</div>
                    <h3 className="mn-mentor-name">
                      {m.name}
                      <BadgeCheck size={14} />
                    </h3>
                    <p className="mn-mentor-role">{m.role}</p>
                    <p className="mn-mentor-desk">{m.desk}</p>
                    <div className="mn-focus-row">
                      {m.focus.map((f) => (
                        <span key={f} className="mn-focus-chip">{f}</span>
                      ))}
                    </div>
                    <p className="mn-mentor-quote">&ldquo;{m.quote}&rdquo;</p>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SESSION FORMATS */}
        <section className="mn-section">
          <div className="mn-inner">
            <div className="mn-section-head">
              <p className="mn-section-eyebrow">Session Formats</p>
              <h2 className="mn-section-title">Three formats, one operating system</h2>
              <p className="mn-section-desc">
                Each format targets a different layer of the trading stack: process, execution,
                and behavior. Most traders rotate between them.
              </p>
            </div>
            <div className="mn-format-grid">
              {FORMATS.map((f) => (
                <div key={f.key} className="mn-format-card">
                  <div className="mn-format-top">
                    <div className="mn-format-icon">{f.icon}</div>
                    <span className="mn-format-duration">
                      {f.duration}
                    </span>
                  </div>
                  <h3 className="mn-format-name">{f.name}</h3>
                  <p className="mn-format-desc">{f.desc}</p>
                  <ul className="mn-format-bullets">
                    {f.bullets.map((b) => (
                      <li key={b} className="mn-format-bullet">
                        <CheckCircle2 size={14} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOOKING FLOW + MOCK WIDGET */}
        <section className="mn-section mn-section-alt">
          <div className="mn-inner">
            <div className="mn-section-head">
              <p className="mn-section-eyebrow">How Booking Works</p>
              <h2 className="mn-section-title">From bottleneck to booked in under a minute</h2>
            </div>

            <div className="mn-booking-layout">
              {/* Steps */}
              <div className="mn-steps">
                {BOOKING_STEPS.map((s) => (
                  <div key={s.num} className="mn-step">
                    <div className="mn-step-num">{s.num}</div>
                    <div>
                      <h3 className="mn-step-title">{s.title}</h3>
                      <p className="mn-step-desc">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive mock booking widget */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mn-booking-widget"
              >
                <div className="mn-widget-head">
                  <span className="mn-widget-head-title">
                    <CalendarDays size={15} />
                    Book a Session
                  </span>
                  <span className="mn-widget-demo-tag">INTERACTIVE PREVIEW</span>
                </div>
                <div className="mn-widget-body">
                  <p className="mn-widget-label">Mentor</p>
                  <div className="mn-widget-mentors">
                    {MENTORS.map((m, i) => (
                      <button
                        key={m.initials}
                        className={`mn-widget-mentor-btn ${selMentor === i ? 'active' : ''}`}
                        style={{ '--mentor-accent': m.accent } as React.CSSProperties}
                        onClick={() => setSelMentor(i)}
                      >
                        <span className="mn-widget-mentor-avatar">{m.initials}</span>
                        {m.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <p className="mn-widget-label">Format</p>
                  <div className="mn-widget-formats">
                    {FORMATS.map((f) => (
                      <button
                        key={f.key}
                        className={`mn-widget-format-btn ${selFormat === f.key ? 'active' : ''}`}
                        onClick={() => setSelFormat(f.key)}
                      >
                        {f.icon}
                        {f.name}
                      </button>
                    ))}
                  </div>

                  <p className="mn-widget-label">This Week</p>
                  <div className="mn-widget-days">
                    {DAYS.map((d, i) => (
                      <button
                        key={d.label}
                        className={`mn-widget-day-btn ${selDay === i ? 'active' : ''}`}
                        onClick={() => setSelDay(i)}
                      >
                        <span className="mn-widget-day-label">{d.label}</span>
                        <span className="mn-widget-day-date">{d.date}</span>
                      </button>
                    ))}
                  </div>

                  <p className="mn-widget-label">Available Slots (UTC)</p>
                  <div className="mn-widget-slots">
                    {SLOTS.map((s) => (
                      <button
                        key={s}
                        className={`mn-widget-slot-btn ${selSlot === s ? 'active' : ''}`}
                        onClick={() => setSelSlot(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${mentor.initials}-${format.key}-${selDay}-${selSlot}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mn-widget-summary"
                    >
                      <strong>{format.name}</strong> ({format.duration}) with{' '}
                      <strong>{mentor.name}</strong> — {DAYS[selDay].label} {DAYS[selDay].date}
                      {selSlot ? ` at ${selSlot} UTC` : ''}. Journal upload requested 24h before
                      the session.
                    </motion.div>
                  </AnimatePresence>

                  <a href="/login?signup=true" className="mn-widget-book-btn">
                    Sign Up to Confirm Booking <ChevronRight size={15} />
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mn-section">
          <div className="mn-inner">
            <div className="mn-final">
              <h2 className="mn-final-title">Your journal already knows what is holding you back.</h2>
              <p className="mn-final-desc">
                A mentor turns that data into a plan. Create an account, upload your journal,
                and book your first review session this week.
              </p>
              <div className="mn-cta-row">
                <a href="/login?signup=true" className="mn-btn-primary">
                  Get Started with Mentorship <ArrowRight size={15} />
                </a>
              </div>
              <p className="mn-disclaimer">
                Mentorship sessions are educational and coaching services only. Mentors do not
                provide personalized investment advice or manage client funds. Trading foreign
                exchange and CFDs carries a high level of risk and may not be suitable for all investors.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
