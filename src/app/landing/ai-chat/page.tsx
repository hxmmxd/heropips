'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, User, Send, ArrowRight, LineChart,
  Layers, BookOpen, Globe2, ShieldCheck, CheckCircle2, Clock,
  BarChart3, HelpCircle,
} from 'lucide-react';
import TiltCard from '../TiltCard';

// ---------------------------------------------------------
// MOCK CONVERSATIONS
// ---------------------------------------------------------

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  meta?: string;
  gateChips?: { label: string; pass: boolean }[];
}

const CONVERSATIONS: Record<string, { label: string; icon: React.ElementType; messages: ChatMsg[] }> = {
  signal: {
    label: 'Why did this fire?',
    icon: Layers,
    messages: [
      {
        role: 'user',
        text: 'Why did the XAU/USD long fire at 14:32? Walk me through the gates.',
      },
      {
        role: 'ai',
        text: 'Signal HP-4821 cleared 11 of 12 gates. The decisive inputs: Gate 01 confluence hit 71% weighted bullish consensus, Gate 02 confirmed a ChoCH with an unmitigated H1 order block retest at 2,338.4, and Gate 10 showed Weekly + Daily EMAs stacked bullish (2/3). Gate 05 was the only marginal read — ATR ratio 2.31, just inside the 2.5 ceiling.',
        meta: 'Answered from signal HP-4821 · full gate log attached',
        gateChips: [
          { label: 'G01 Confluence 71%', pass: true },
          { label: 'G02 SMC ChoCH+OB', pass: true },
          { label: 'G10 MTF 2/3', pass: true },
          { label: 'G05 ATR 2.31', pass: true },
          { label: 'G06 Conflict', pass: false },
        ],
      },
      {
        role: 'user',
        text: 'Which gate failed?',
      },
      {
        role: 'ai',
        text: 'Gate 06 (No-Conflict Filter). The bull/bear indicator spread was 8.9% — under the 10% threshold — because the Stochastic was overbought against the trend. Since Gate 06 is a Standard gate and the three Critical gates all passed, the signal still qualified at 11/12 with an AA grade.',
        meta: 'Gate 06 raw spread: 8.9% · threshold ≥10%',
      },
    ],
  },
  chart: {
    label: 'Analyze a chart',
    icon: LineChart,
    messages: [
      {
        role: 'user',
        text: 'Give me a read on GBP/JPY H4 right now.',
      },
      {
        role: 'ai',
        text: 'GBP/JPY H4 is in a corrective pullback inside a broader uptrend. Structure: last BOS was bullish at 195.80; price is now retracing into a fair value gap between 195.10–195.45 that overlaps the 0.618 retracement. Momentum: RSI 46 and cooling, MACD histogram contracting. Volatility regime is stable (ATR ratio 1.08). The engine currently scores this 6/12 — watching for Gate 02 structure confirmation before anything routes.',
        meta: 'Live read · data as of last closed H4 candle',
        gateChips: [
          { label: 'Bias: Bullish HTF', pass: true },
          { label: 'FVG 195.10–195.45', pass: true },
          { label: 'Score 6/12 — no signal', pass: false },
        ],
      },
      {
        role: 'user',
        text: 'What would need to change for a long signal?',
      },
      {
        role: 'ai',
        text: 'Three things, in order of weight: (1) Gate 01 needs weighted consensus back above 45% bullish — currently 38%. (2) Gate 02 needs a confirmed reaction from the FVG, ideally an M15 ChoCH inside the zone. (3) Session timing — the next London/NY overlap window opens in 3h 12m, which is when Gate 04 grades highest. If those align, the remaining gates are already green.',
        meta: 'Hypothetical path · not a recommendation to trade',
      },
    ],
  },
  journal: {
    label: 'Query my journal',
    icon: BookOpen,
    messages: [
      {
        role: 'user',
        text: 'What is my win rate on gold longs during London this quarter?',
      },
      {
        role: 'ai',
        text: 'Across Q3 you took 24 XAU/USD longs during the London session: 15 wins, 9 losses — a 62.5% win rate with +11.3R net and an expectancy of +0.47R per trade. That is 8.3 points above your all-session gold average. Your three largest winners all came from AAA-grade signals that passed 12/12 gates.',
        meta: 'Computed from your journal · 24 matching trades',
        gateChips: [
          { label: '62.5% win rate', pass: true },
          { label: '+11.3R net', pass: true },
          { label: 'Expectancy +0.47R', pass: true },
        ],
      },
      {
        role: 'user',
        text: 'And where am I leaking money?',
      },
      {
        role: 'ai',
        text: 'Two clear leaks: (1) Asian-session entries — 14 trades, 36% win rate, −4.1R net; nearly all were A-grade signals at 8/12 gates. (2) Re-entries within 2 hours of a stop-out on the same pair — 9 trades, −5.8R. Filtering both from your history would have added +9.9R this quarter. Consider raising your minimum grade to AA outside London hours.',
        meta: 'Leak analysis · trailing 90 days',
      },
    ],
  },
};

const CAPABILITIES = [
  {
    icon: LineChart,
    title: 'Chart Analysis on Demand',
    desc: 'Ask about any tracked pair and timeframe. The assistant reads live structure, momentum, volatility regime, and the current 12-gate score — then explains it in plain language.',
  },
  {
    icon: Layers,
    title: 'Signal Explanations',
    desc: 'Every fired signal is fully auditable. Ask why it fired, which gates were decisive, which were marginal, and what the risk engine sized it at — with the raw numbers.',
  },
  {
    icon: Globe2,
    title: 'Market Context Q&A',
    desc: 'Session timing, correlated-index posture, upcoming high-impact events, and volatility conditions — the same context feeds the engine trades on, queryable in chat.',
  },
  {
    icon: BookOpen,
    title: 'Natural-Language Journal Queries',
    desc: 'Your trade journal is the assistant’s database. Win rates by pair, session, or grade; streaks; leak analysis — answered from your actual record, not estimates.',
  },
];

const GUARDRAILS = [
  {
    icon: ShieldCheck,
    title: 'Grounded in engine data',
    desc: 'Answers cite the same gate logs, price feeds, and journal rows the execution stack uses — not generic market commentary.',
  },
  {
    icon: HelpCircle,
    title: 'Explains, never urges',
    desc: 'The assistant explains conditions and history. It does not push entries, promise outcomes, or provide personal financial advice.',
  },
  {
    icon: Clock,
    title: 'Instant, always on',
    desc: 'Median response under 3 seconds, 24/7 — including the moments mid-session when you most need a second opinion.',
  },
];

// ---------------------------------------------------------
// CHAT UI
// ---------------------------------------------------------

function ChatWindow({ messages, convoKey }: { messages: ChatMsg[]; convoKey: string }) {
  return (
    <div className="ac-chat-body">
      <AnimatePresence mode="wait">
        <motion.div
          key={convoKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {messages.map((m, i) => (
            <motion.div
              key={`${convoKey}-${i}`}
              className={`ac-msg-row ${m.role === 'user' ? 'ac-msg-user' : 'ac-msg-ai'}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="ac-avatar">
                {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className="ac-bubble">
                <p>{m.text}</p>
                {m.gateChips && (
                  <div className="ac-chip-row">
                    {m.gateChips.map((c) => (
                      <span key={c.label} className={`ac-chip ${c.pass ? 'ac-chip-pass' : 'ac-chip-fail'}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
                {m.meta && <span className="ac-meta">{m.meta}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// PAGE
// ---------------------------------------------------------

export default function AiChatPage() {
  const [convo, setConvo] = useState<keyof typeof CONVERSATIONS>('signal');

  useEffect(() => {
    document.title = 'HeroPips | AI Chat Assistant';
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .ac-page {
          background: var(--bg-app);
          color: var(--text-hi);
        }
        .ac-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .ac-section {
          padding: 88px 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .ac-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--volt-500);
          border: 1px solid var(--border-subtle);
          background: var(--surface-1);
          padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px;
        }
        .ac-h1 {
          font-size: clamp(34px, 5.5vw, 60px);
          font-weight: 800; letter-spacing: -2px; line-height: 1.08;
          color: var(--text-hi); margin-bottom: 20px;
        }
        .ac-h1 .ac-accent { color: var(--volt-500); }
        .ac-sub {
          font-size: 16.5px; line-height: 1.65; color: var(--text-mid);
          max-width: 640px; margin: 0 auto 32px auto;
        }
        .ac-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .ac-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--text-hi); color: var(--bg-app);
          font-size: 14px; font-weight: 700;
          padding: 13px 26px; border-radius: 9999px; text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .ac-btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        .ac-btn-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--surface-1); color: var(--text-hi);
          border: 1px solid var(--border-subtle);
          font-size: 14px; font-weight: 600;
          padding: 13px 24px; border-radius: 9999px; text-decoration: none;
          transition: background 0.15s ease;
        }
        .ac-btn-secondary:hover { background: var(--surface-2); }
        .ac-section-head { max-width: 680px; margin-bottom: 44px; }
        .ac-kicker {
          font-size: 11px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--volt-500); margin-bottom: 10px;
        }
        .ac-h2 {
          font-size: clamp(24px, 3.4vw, 36px);
          font-weight: 800; letter-spacing: -1.1px; line-height: 1.15;
          color: var(--text-hi); margin-bottom: 14px;
        }
        .ac-lead { font-size: 15px; line-height: 1.65; color: var(--text-mid); }

        /* Chat mock */
        .ac-chat-frame {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
          max-width: 860px;
          margin: 0 auto;
        }
        .ac-chat-header {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--surface-2);
        }
        .ac-chat-title {
          font-size: 13px; font-weight: 800; color: var(--text-hi);
          display: flex; align-items: center; gap: 8px;
        }
        .ac-status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
          display: inline-block;
        }
        .ac-tab-row {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .ac-tab {
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          color: var(--text-mid);
          font-size: 11.5px; font-weight: 700;
          font-family: inherit;
          padding: 7px 13px; border-radius: 9999px;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.15s ease;
        }
        .ac-tab:hover { color: var(--text-hi); }
        .ac-tab.active {
          background: var(--text-hi);
          color: var(--bg-app);
          border-color: var(--text-hi);
        }
        .ac-chat-body {
          padding: 26px 22px;
          min-height: 420px;
        }
        .ac-msg-row {
          display: flex; gap: 10px;
          margin-bottom: 18px;
          max-width: 92%;
        }
        .ac-msg-user { flex-direction: row-reverse; margin-left: auto; }
        .ac-avatar {
          width: 28px; height: 28px; flex-shrink: 0;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border-subtle);
          background: var(--surface-2);
          color: var(--text-mid);
        }
        .ac-msg-ai .ac-avatar {
          background: var(--text-hi);
          color: var(--bg-app);
          border-color: var(--text-hi);
        }
        .ac-bubble {
          border-radius: 14px;
          padding: 13px 16px;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-mid);
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
        }
        .ac-msg-user .ac-bubble {
          background: var(--text-hi);
          color: var(--bg-app);
          border-color: var(--text-hi);
          border-bottom-right-radius: 4px;
        }
        .ac-msg-ai .ac-bubble { border-bottom-left-radius: 4px; }
        .ac-chip-row {
          display: flex; gap: 6px; flex-wrap: wrap;
          margin-top: 10px;
        }
        .ac-chip {
          font-size: 10px; font-weight: 800; font-family: monospace;
          padding: 3px 8px; border-radius: 6px;
          white-space: nowrap;
        }
        .ac-chip-pass { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .ac-chip-fail { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .ac-meta {
          display: block;
          margin-top: 9px;
          font-size: 10.5px;
          font-family: monospace;
          color: var(--text-low);
        }
        .ac-chat-input {
          display: flex; align-items: center; gap: 10px;
          border-top: 1px solid var(--border-subtle);
          padding: 14px 20px;
          background: var(--surface-2);
        }
        .ac-chat-input-field {
          flex-grow: 1;
          font-size: 13px;
          color: var(--text-low);
          background: var(--bg-app);
          border: 1px solid var(--border-subtle);
          border-radius: 9999px;
          padding: 11px 18px;
        }
        .ac-send-btn {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: 50%;
          background: var(--volt-500);
          color: #0a0a0a;
          display: flex; align-items: center; justify-content: center;
        }

        /* Capability cards */
        .ac-cap-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        .ac-cap-card {
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 28px;
          height: 100%;
        }
        .ac-cap-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          display: flex; align-items: center; justify-content: center;
          color: var(--volt-500);
          margin-bottom: 16px;
        }
        .ac-cap-title { font-size: 16px; font-weight: 800; color: var(--text-hi); margin-bottom: 8px; }
        .ac-cap-desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.65; }

        /* Pipeline strip */
        .ac-pipeline {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          background: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          overflow: hidden;
        }
        .ac-pipe-step {
          padding: 24px;
          border-right: 1px solid var(--border-subtle);
        }
        .ac-pipe-step:last-child { border-right: none; }
        .ac-pipe-num {
          font-size: 10px; font-weight: 800; font-family: monospace;
          color: var(--volt-500);
          margin-bottom: 10px; display: block;
        }
        .ac-pipe-title { font-size: 13.5px; font-weight: 800; color: var(--text-hi); margin-bottom: 6px; }
        .ac-pipe-desc { font-size: 12px; color: var(--text-mid); line-height: 1.55; }

        /* Guardrails */
        .ac-guard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .ac-final { text-align: center; padding: 100px 0; }

        @media (max-width: 960px) {
          .ac-cap-grid { grid-template-columns: 1fr; }
          .ac-guard-grid { grid-template-columns: 1fr; }
          .ac-pipeline { grid-template-columns: 1fr; }
          .ac-pipe-step { border-right: none; border-bottom: 1px solid var(--border-subtle); }
          .ac-pipe-step:last-child { border-bottom: none; }
          .ac-section { padding: 64px 0; }
          .ac-msg-row { max-width: 100%; }
        }
      ` }} />

      <div className="ac-page" style={{ paddingTop: '120px' }}>

        {/* ── HERO ── */}
        <section className="ac-section" style={{ textAlign: 'center', paddingTop: '40px' }}>
          <div className="ac-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="ac-eyebrow">
                <Sparkles size={12} />
                Conversational Market Intelligence
              </span>
              <h1 className="ac-h1">
                AI Chat Assistant.<br />
                <span className="ac-accent">Ask the engine anything.</span>
              </h1>
              <p className="ac-sub">
                A chat interface wired directly into the 12-gate engine, live price feeds, and your own trade
                journal. Ask why a signal fired, get a structured read on any chart, or interrogate your
                performance in plain English — with every answer grounded in real engine data.
              </p>
              <div className="ac-ctas">
                <a href="/login?signup=true" className="ac-btn-primary">
                  Start Chatting Free
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="ac-btn-secondary">
                  Explore the Signal Engine
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CHAT DEMO ── */}
        <section className="ac-section">
          <div className="ac-container">
            <div className="ac-section-head" style={{ textAlign: 'center', margin: '0 auto 44px auto' }}>
              <p className="ac-kicker">Interactive Preview</p>
              <h2 className="ac-h2">Three conversations, straight from the terminal</h2>
              <p className="ac-lead">
                Switch between example threads to see how the assistant handles signal audits, live chart
                reads, and journal queries.
              </p>
            </div>

            <motion.div
              className="ac-chat-frame"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="ac-chat-header">
                <span className="ac-chat-title">
                  <span className="ac-status-dot" />
                  HeroPips Assistant
                </span>
                <div className="ac-tab-row">
                  {(Object.keys(CONVERSATIONS) as (keyof typeof CONVERSATIONS)[]).map((key) => {
                    const Icon = CONVERSATIONS[key].icon;
                    return (
                      <button
                        key={key}
                        className={`ac-tab ${convo === key ? 'active' : ''}`}
                        onClick={() => setConvo(key)}
                      >
                        <Icon size={12} />
                        {CONVERSATIONS[key].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ChatWindow messages={CONVERSATIONS[convo].messages} convoKey={convo} />

              <div className="ac-chat-input">
                <span className="ac-chat-input-field">Ask about a pair, a signal, or your journal…</span>
                <span className="ac-send-btn"><Send size={15} /></span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CAPABILITIES ── */}
        <section className="ac-section">
          <div className="ac-container">
            <div className="ac-section-head">
              <p className="ac-kicker">Capabilities</p>
              <h2 className="ac-h2">One assistant, four jobs</h2>
            </div>
            <div className="ac-cap-grid">
              {CAPABILITIES.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <TiltCard className="ac-cap-card">
                      <div className="ac-cap-icon"><Icon size={19} /></div>
                      <h3 className="ac-cap-title">{c.title}</h3>
                      <p className="ac-cap-desc">{c.desc}</p>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW ANSWERS ARE BUILT ── */}
        <section className="ac-section">
          <div className="ac-container">
            <div className="ac-section-head">
              <p className="ac-kicker">Under the hood</p>
              <h2 className="ac-h2">Every answer follows the same audited path</h2>
              <p className="ac-lead">
                The assistant is not a generic chatbot with market opinions. Each response is assembled from
                the same data plane the execution engine trades on.
              </p>
            </div>

            <div className="ac-pipeline">
              <div className="ac-pipe-step">
                <span className="ac-pipe-num">STEP 01</span>
                <div className="ac-pipe-title">Parse intent</div>
                <p className="ac-pipe-desc">
                  Your question is mapped to a data domain: a signal ID, a symbol and timeframe, a journal
                  filter, or a market-context lookup.
                </p>
              </div>
              <div className="ac-pipe-step">
                <span className="ac-pipe-num">STEP 02</span>
                <div className="ac-pipe-title">Pull engine data</div>
                <p className="ac-pipe-desc">
                  Gate logs, cached indicator states, calendar events, and journal rows are fetched from the
                  same stores the 12-gate engine reads.
                </p>
              </div>
              <div className="ac-pipe-step">
                <span className="ac-pipe-num">STEP 03</span>
                <div className="ac-pipe-title">Compute, then compose</div>
                <p className="ac-pipe-desc">
                  Statistics are computed deterministically first; the language model only narrates verified
                  numbers — it never invents them.
                </p>
              </div>
              <div className="ac-pipe-step">
                <span className="ac-pipe-num">STEP 04</span>
                <div className="ac-pipe-title">Cite the source</div>
                <p className="ac-pipe-desc">
                  Every answer carries its provenance — the signal ID, sample size, or data timestamp it was
                  built from — so you can verify it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── GUARDRAILS ── */}
        <section className="ac-section">
          <div className="ac-container">
            <div className="ac-section-head">
              <p className="ac-kicker">Trust &amp; guardrails</p>
              <h2 className="ac-h2">Built to inform, engineered to stay honest</h2>
            </div>
            <div className="ac-guard-grid">
              {GUARDRAILS.map((g, i) => {
                const Icon = g.icon;
                return (
                  <motion.div
                    key={g.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                  >
                    <div className="ac-cap-card">
                      <div className="ac-cap-icon"><Icon size={19} /></div>
                      <h3 className="ac-cap-title">{g.title}</h3>
                      <p className="ac-cap-desc">{g.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="ac-final">
          <div className="ac-container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="ac-eyebrow">
                <CheckCircle2 size={12} />
                Your Second Pair of Eyes
              </span>
              <h2 className="ac-h2" style={{ maxWidth: '620px', margin: '0 auto 14px auto' }}>
                Stop trading with unanswered questions.
              </h2>
              <p className="ac-sub">
                The AI Chat Assistant is included on every HeroPips plan — connected to your signals, your
                journal, and the live engine from day one.
              </p>
              <div className="ac-ctas">
                <a href="/login?signup=true" className="ac-btn-primary">
                  Create Your Account
                  <ArrowRight size={15} />
                </a>
                <a href="/landing/signal-engine" className="ac-btn-secondary">
                  <BarChart3 size={14} />
                  See the 12-Gate Engine
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
