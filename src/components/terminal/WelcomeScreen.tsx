'use client';

import React from 'react';

interface WelcomeScreenProps {
  onGenerateSignal?: (symbol: string) => void;
  onSendMessage: (text: string) => void;
}

export default function WelcomeScreen({
  onGenerateSignal,
  onSendMessage,
}: WelcomeScreenProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* ── Ambient Glow Backdrop ── */}
      <div className="wlc-glow" />

      {/* ── Main Content ── */}
      <div className="z-10 w-full max-w-xl md:max-w-3xl flex flex-col items-center text-center gap-7 md:gap-10 px-6">
        {/* Greeting */}
        <div className="wlc-hero">
          <>
            <p className="wlc-eyebrow wlc-fade" style={{ animationDelay: '0.05s' }}>
              <span className="wlc-dot wlc-dot--green" />Ready
            </p>
            <h2 className="wlc-title wlc-fade" style={{ animationDelay: '0.12s' }}>
              What would you like to analyze?
            </h2>
            <p className="wlc-sub wlc-fade" style={{ animationDelay: '0.18s' }}>
              AI-powered trade signals, technical analysis, and live broker management.
            </p>
          </>
        </div>

        <div className="wlc-grid wlc-fade" style={{ animationDelay: '0.28s' }}>
          {[
                {
                  label: 'Analyze XAUUSD',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 12L6.5 8h11L20 12v7H4v-7z" fill="#f59e0b" />
                      <path d="M4 12L6.5 8h11L20 12H4z" fill="#fcd34d" />
                      <path d="M5.5 13h4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M7 15.5h10M7 17.5h10" stroke="#92400e" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
                    </svg>
                  ),
                  action: () => onGenerateSignal?.('Gold'),
                },
                {
                  label: 'Analyze BTCUSD',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#f97316" />
                      <path d="M9.5 8h3.5a2 2 0 0 1 0 4H9.5m0-4v4m0 0h4a2 2 0 0 1 0 4H9.5m0-4v4M9 8h.5M9 16h.5M11 6.5V8M13.5 6.5V8M11 16v1.5M13.5 16v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  action: () => onGenerateSignal?.('Bitcoin'),
                },
                {
                  label: 'Analyze EUR/USD',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8.5" cy="12" r="5.5" fill="#dbeafe" />
                      <circle cx="8.5" cy="12" r="5.5" stroke="#3b82f6" strokeWidth="1.3" />
                      <path d="M6.5 10.5H10M6.5 13.5H10" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M15 8.5l4 3.5-4 3.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 12H19" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  ),
                  action: () => onGenerateSignal?.('EURUSD'),
                },
                {
                  label: 'Market overview',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="14" width="4" height="7" rx="1" fill="#3b82f6" />
                      <rect x="8" y="10" width="4" height="11" rx="1" fill="#10b981" />
                      <rect x="14" y="6" width="4" height="15" rx="1" fill="#f59e0b" />
                      <rect x="20" y="9" width="2" height="12" rx="1" fill="#6366f1" />
                      <path d="M3 11l5-4 5 3 6-6" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  action: () => onSendMessage('Give me a market overview'),
                },
                {
                  label: 'My positions',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="9" width="20" height="12" rx="2" fill="#818cf8" />
                      <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M2 14h20" stroke="#4f46e5" strokeWidth="1" />
                      <circle cx="12" cy="14" r="1.8" fill="white" />
                    </svg>
                  ),
                  action: () => onSendMessage('Show my open positions'),
                },
                {
                  label: 'Analyze NAS100',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17l5-6 4 3 5-7 4 2" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M17 7h4v4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="3" cy="17" r="1.3" fill="#34d399" />
                      <circle cx="8" cy="11" r="1.3" fill="#34d399" />
                      <circle cx="12" cy="14" r="1.3" fill="#34d399" />
                      <circle cx="17" cy="7" r="1.3" fill="#34d399" />
                      <circle cx="21" cy="9" r="1.3" fill="#34d399" />
                      <rect x="1" y="20.5" width="22" height="1.5" rx="0.75" fill="#10b981" opacity="0.2" />
                    </svg>
                  ),
                  action: () => onGenerateSignal?.('NAS100'),
                },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="wlc-card"
              style={{ animationDelay: `${0.3 + i * 0.04}s` }}
            >
              <span className="wlc-card-icon">{item.icon}</span>
              <span className="wlc-card-label">{item.label}</span>
              <svg className="wlc-card-arrow" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── Welcome Screen Styles ── */}
      <style>{`
        /* Ambient glow */
        .wlc-glow {
          position: absolute;
          width: 500px; height: 500px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--accent) 7%, transparent) 0%, color-mix(in srgb, var(--accent) 2%, transparent) 50%, transparent 70%);
          pointer-events: none;
          animation: wlc-glow-pulse 6s ease-in-out infinite alternate;
        }
        @keyframes wlc-glow-pulse {
          from { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
          to   { opacity: 1;   transform: translate(-50%, -50%) scale(1.1); }
        }

        /* Fade-up entrance */
        .wlc-fade {
          opacity: 0;
          animation: wlc-fade-up 0.5s ease-out forwards;
        }
        @keyframes wlc-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Hero section */
        .wlc-hero { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .wlc-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
          color: var(--subtext); text-transform: uppercase;
        }
        .wlc-dot {
          width: 6px; height: 6px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }
        .wlc-dot--green { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
        .wlc-dot--amber { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
        .wlc-title {
          font-size: 26px; font-weight: 600; letter-spacing: -0.025em;
          color: var(--text); line-height: 1.25; margin: 0;
        }
        .wlc-title--amber { color: #f59e0b; }
        .wlc-sub {
          font-size: 13px; color: var(--subtext); opacity: 0.65;
          line-height: 1.6; max-width: 400px;
        }

        /* Suggestion grid */
        .wlc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          width: 100%;
        }
        @media (max-width: 640px) {
          .wlc-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Suggestion card */
        .wlc-card {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--sidebar-bg);
          color: var(--text);
          font-size: 12.5px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          position: relative;
          opacity: 0;
          animation: wlc-fade-up 0.4s ease-out forwards;
        }
        .wlc-card:hover {
          border-color: color-mix(in srgb, var(--accent) 45%, transparent);
          background: color-mix(in srgb, var(--accent) 5%, var(--sidebar-bg));
          transform: translateY(-2px);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 8%, transparent);
        }
        .wlc-card:active { transform: scale(0.98) translateY(0); }



        .wlc-card-icon {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; flex-shrink: 0;
          color: var(--accent);
          opacity: 0.85;
        }
        .wlc-card-icon svg {
          width: 18px; height: 18px;
        }

        .wlc-card-label { flex: 1; letter-spacing: -0.01em; }
        .wlc-card-arrow {
          width: 14px; height: 14px; flex-shrink: 0;
          color: var(--subtext); opacity: 0;
          transition: all 0.2s ease;
          transform: translateX(-3px);
        }
        .wlc-card:hover .wlc-card-arrow {
          opacity: 0.5; transform: translateX(0);
        }

        /* Desktop Enlargement */
        @media (min-width: 768px) {
          .wlc-hero { gap: 12px; }
          .wlc-eyebrow { gap: 8px; font-size: 13px; }
          .wlc-title { font-size: 38px; font-weight: 700; }
          .wlc-sub { font-size: 16px; max-width: 550px; }
          .wlc-grid { gap: 12px; }
          .wlc-card { gap: 12px; padding: 18px 20px; border-radius: 14px; font-size: 15px; font-weight: 600; }
          .wlc-card-icon { width: 28px; height: 28px; }
          .wlc-card-icon svg { width: 24px; height: 24px; }
          .wlc-card-arrow { width: 18px; height: 18px; }
        }
      `}</style>
    </div>
  );
}
