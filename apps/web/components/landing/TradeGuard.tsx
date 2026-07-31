import { Card, ButtonLink, Eyebrow, Kicker } from "@heropips/ui";

/* Inline stroke icons — currentColor, 20px viewBox 24. */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = {
  percent: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  breaker: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <polyline points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
    </svg>
  ),
  watchdog: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  news: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 4h13a2 2 0 0 1 2 2v12a2 2 0 0 0 2-2V8" /><path d="M4 4v14a2 2 0 0 0 2 2h13" /><line x1="8" y1="9" x2="13" y2="9" /><line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
    </svg>
  ),
  panic: (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2z" /><line x1="12" y1="7.5" x2="12" y2="13" /><circle cx="12" cy="16.5" r="0.5" />
    </svg>
  ),
};

/* tag = the mono rule label on each chip — mirrors the Trade Guard rule names. */
const GUARDS = [
  { icon: Icon.percent, tag: "RISK %", title: "Risk-% auto-size", copy: "Every order sized from equity and stop distance — never from feel." },
  { icon: Icon.breaker, tag: "DAILY CAP", title: "Daily-loss circuit breaker", copy: "Hit your daily limit and trading halts until the next session." },
  { icon: Icon.watchdog, tag: "MAX DD", title: "Max drawdown watchdog", copy: "A hard equity floor that closes exposure before it deepens." },
  { icon: Icon.news, tag: "NEWS", title: "News filter", copy: "Blocks entries around CPI, FOMC and NFP release windows." },
  { icon: Icon.clock, tag: "SESSION", title: "Session windows", copy: "Trade only inside the hours you allow. Outside them, nothing fires." },
  { icon: Icon.panic, tag: "PANIC", title: "Panic close", copy: "One action flattens every position and cancels every order." },
];

export function TradeGuard() {
  return (
    <section className="section" aria-labelledby="guards-h">
      <div className="container">
        <div className="hp-section-head">
          <Eyebrow>Trade Guard</Eyebrow>
          <h2 id="guards-h">Your rules, enforced.</h2>
          <p>
            You define the limits once. HeroPips applies them to every order — model decision or
            manual trade — with no mid-session override.
          </p>
        </div>
        <div className="hp-grid-guards" style={{ marginTop: 40 }}>
          {GUARDS.map((g) => (
            <Card key={g.title} className="hp-guard-chip" style={{ padding: 22 }}>
              <div className="hp-guard-head">
                <div className="hp-guard-ico">{g.icon}</div>
                <Kicker>{g.tag}</Kicker>
              </div>
              <h3 style={{ margin: 0, fontSize: "var(--text-md)" }}>{g.title}</h3>
              <p style={{ margin: "6px 0 0", fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}>{g.copy}</p>
            </Card>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <ButtonLink href="/product/trade-guard" variant="ghost" size="md">See Trade Guard →</ButtonLink>
        </div>
      </div>
    </section>
  );
}
