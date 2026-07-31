/* =========================================================================
 * HeroPips marketing content — single typed source for FAQ, pricing,
 * academy lessons, product copy and the public route inventory. Rendered by
 * /faq, /pricing, /academy, /product; PUBLIC_ROUTES drives app/sitemap.ts,
 * app/llms.txt and app/llms-full.txt.
 * ======================================================================= */

import { LTD } from "@heropips/contracts";
import { LESSONS_FULL } from "@/lib/academy/curriculum";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heropips.com";

/* ---------- FAQ ---------- */

export type FaqItem = { id: string; q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    id: "what-is-heropips",
    q: "What is HeroPips?",
    a: "HeroPips is an AI-powered financial intelligence ecosystem for retail traders — a trading intelligence platform, not a signal seller. Institutional-grade market data becomes decision intelligence: trade ideas scored for confidence and explained in plain reasoning, executed on your own broker — MT5, Binance, KuCoin and more — inside risk rules the platform enforces for you. The HeroPips Learn academy and a $10,000 paper account complete the ecosystem. Self-directed software: no advice, no custody — your funds stay at your broker.",
  },
  {
    id: "what-is-decision-intelligence",
    q: "What is decision intelligence?",
    a: "Understanding, not arrows. A bare signal says BUY EURUSD; a HeroPips intelligence brief shows the case — direction, entry, stop and R-multiple targets, a confidence score, the volatility, momentum and regime features behind it, the model version that produced it and the reasoning in plain language. You see why a setup is attractive before anything trades, so the decision stays yours and gets sharper over time.",
  },
  {
    id: "is-it-advice",
    q: "Is HeroPips financial advice?",
    a: "No. HeroPips is self-directed software. We do not provide investment advice, portfolio management or recommendations, we never touch or hold your funds, and nothing on this site is a promise of profit. You decide the rules; the software enforces them.",
  },
  {
    id: "how-automation-works",
    q: "How does the automation work?",
    a: "Every intelligence brief from the quant engine is sized from your equity and stop distance, checked against every Trade Guard rule — daily loss, drawdown, exposure, news, session, symbol — and only then routed to your own broker connection. If any guard fails, the order is blocked, not passed.",
  },
  {
    id: "where-intelligence-comes-from",
    q: "Where does the intelligence come from?",
    a: "From our internal quant engine only. Institutional-grade market data is engineered into volatility, momentum and regime features, scored by our machine-learning model (quant-ml-v1), and a brief publishes only above the confidence gate — with its confidence score, model version and reasoning attached. We never resell third-party calls, and every brief is informational software output, not financial advice.",
  },
  {
    id: "which-brokers",
    q: "Which brokers and exchanges work?",
    a: "MT5, Binance and KuCoin are live at early access, and a unified exchange API adds 30+ more crypto exchanges as it rolls out. You connect with trade-scope API keys on your existing account — no migration, no deposit with us.",
  },
  {
    id: "what-is-trade-guard",
    q: "What is Trade Guard?",
    a: "Trade Guard is the risk infrastructure of the platform: nine independent, always-on controls that sit between every trade — model-proposed or manual — and your broker: risk-percent sizing, daily loss breaker, max drawdown breaker, exposure caps, concurrent-position limits, news filters, session windows, symbol allowlists and prop-firm rule presets. It fails closed: if the risk engine is unreachable, live orders are blocked — never passed through.",
  },
  {
    id: "regulated-legally",
    q: "Is HeroPips a broker, a fund or an advisor?",
    a: "No — by design. HeroPips is built compliance-first as self-directed software: not a broker, not an investment adviser, not a fund. We never hold client funds, never trade discretionarily on your behalf and never promise returns. Capital-markets services — copy trading, managed strategies, institutional products — are a future pillar of the ecosystem that launches only where legally permitted and only after obtaining the appropriate licences.",
  },
  {
    id: "founding-hero-terms",
    q: "What exactly does Founding Hero include?",
    a: "Founding Hero is a one-time $499 purchase for lifetime access to the Pro tier — every Pro feature, forever, including future Pro features. Exactly 500 seats will ever exist. It is non-transferable, comes with a 14-day refund window (refunded in USDT equivalent), and will never be resold after the cap is reached. Full terms are at /legal/ltd-terms.",
  },
  {
    id: "crypto-payments",
    q: "How do crypto payments and refunds work?",
    a: `Founding Hero checkout is processed by NOWPayments. You receive a crypto invoice (BTC, ETH, USDT and more), and your seat is held for ${LTD.HOLD_TTL_MINUTES} minutes while you pay. Refunds inside the 14-day window are returned in USDT equivalent of the amount received. We never see or store your wallet keys.`,
  },
  {
    id: "when-launch",
    q: "When does HeroPips launch?",
    a: "HeroPips is built and live today for Founding Hero lifetime members — early access is real, gated access, not a demo. The full public launch, with open sign-ups and subscription tiers, comes after founding-member feedback has shaped the roadmap. Early access position determines public-launch invite order.",
  },
  {
    id: "is-my-money-safe",
    q: "Is my money and API access safe?",
    a: "Your funds never leave your broker — HeroPips has no custody, ever. Broker connections use trade-scope API keys only; withdrawal-enabled keys are rejected at setup. Keys are encrypted at rest, and you can revoke access at your broker at any time.",
  },
  {
    id: "referral-rules",
    q: "How does the referral program work?",
    a: "Every member gets a referral code. Sharing it moves your friends up the early access queue — every 3 verified sign-ups from your link jump you 25 positions — and referral rewards attribute to you when a referred user converts to a paid seat. The separate marketer/affiliate platform pays multi-level commissions up to 10 levels deep — details at /affiliates.",
  },
  {
    id: "points-non-cash",
    q: "Are XP and points worth money?",
    a: "No. XP, streaks, badges and early-access queue points are non-cash gamification. They cannot be redeemed, transferred or sold, and they have no monetary value. They exist to track learning progress and queue position — nothing else.",
  },
  {
    id: "simulated-results",
    q: "Are the performance numbers on this site real?",
    a: "Every performance figure shown before launch is simulated or hypothetical and is labeled as such. Simulated results have inherent limitations and do not represent real trading. Past performance — simulated or live — never guarantees future results.",
  },
  {
    id: "is-heropips-launched",
    q: "Is HeroPips launched?",
    a: "HeroPips is in early access: the platform is built and live for Founding Hero lifetime members, who are running the live intelligence feed, trading paper and using the academy today. It is not fully launched yet — founding-member feedback shapes what ships next, and the public SaaS launch with open sign-ups comes after that. It is real, gated access — not a prototype.",
  },
  {
    id: "founding-today",
    q: "What do Founding Heroes get today?",
    a: "Immediate access to the live platform: the decision-intelligence feed, auto-execution on their own broker (MT5, Binance, KuCoin), Trade Guard configuration, the paper account and the full HeroPips Learn academy — plus a direct line to the team, so their feedback shapes the roadmap before public launch. The seat itself is lifetime Pro for a one-time $499, paid in crypto, capped at 500 seats ever.",
  },
  {
    id: "affiliate-depth",
    q: "How deep does the affiliate program go?",
    a: "The marketer/affiliate platform pays multi-level commissions up to 10 levels deep. The number of levels and the per-level rates are configured by admins — the default schedule is 20% / 10% / 5% / 3% / 2% for levels 1–5. Every commission sits on a double-entry ledger, payouts are in crypto, and refunds claw back within 14 days.",
  },
  {
    id: "academy-free",
    q: "Is the HeroPips Academy free?",
    a: "Free to start: Level 0 is open to everyone, and its first lesson needs no account at all — anonymous XP banks on your device until you claim it with a free account. Member levels open with a free account (early access today), and the final two Pro levels are included with Founding Hero. No lesson ever asks for a deposit.",
  },
  {
    id: "academy-xp",
    q: "How do XP, streaks and ranks work?",
    a: "You earn XP from lessons and quizzes (60–150 XP per lesson, 10 XP per correct answer, +20 for a perfect quiz), arcade game wins and a once-a-day spin. Your first activity each UTC day extends a streak that pays a bonus of 5 XP per streak day, capped at 50. XP moves you through 10 ranks — Recruit at 0 XP up to Hero Trader at 5,000.",
  },
  {
    id: "academy-certificates",
    q: "Are the certificates verifiable?",
    a: "Yes. Every certificate carries a unique code and a public verify URL — heropips.com/academy/verify/CODE — that anyone can open to confirm the holder, the track and the issue date. Verify pages ship structured data (JSON-LD), so a shared certificate stays checkable by machines as well as people.",
  },
  {
    id: "academy-certificates-how",
    q: "How do the Academy certificates work?",
    a: "There are 11: one for completing each of the 10 levels, plus the Hero Trader grand certificate for finishing the whole path. The draft designs are publicly viewable at heropips.com/academy/certificates, and every issued certificate carries a unique code anyone can verify at heropips.com/academy/verify/CODE. They are educational credentials — proof you completed the lessons, not a licence or a trading qualification.",
  },
  {
    id: "academy-live-classes",
    q: "How do live classes work?",
    a: "Each level you complete unlocks that level's monthly live workshop, and completing all 10 levels unlocks the Hero Council — the monthly live masterclass — free for 12 months. Qualified referrals extend that access: when someone you invite completes Level 5, you climb a ladder where 5 referrals add 3 months, 25 add 12 months, and 100 make it lifetime. We are in early access, so schedules are announced to early-access members first.",
  },
  {
    id: "academy-cost",
    q: "What does the Academy cost?",
    a: "Level 0 is free and its first lesson needs no account at all. A free account unlocks the member levels — 1 through 7 — with early access today and open sign-ups at the public launch, and the final two levels (trading with the machine, going live) are the Pro track included with Founding Hero. No lesson ever asks for a deposit, and nothing in the academy is financial advice.",
  },
  {
    id: "academy-paper",
    q: "Do I need real money to finish the academy?",
    a: "No. The capstone — and every drill before it — runs on the $10,000 paper account with the same guardrails the live platform enforces. You prove the skills before any real money is ever involved.",
  },
];

/* ---------- Pricing ---------- */

export type Tier = {
  id: string;
  name: string;
  priceMonthly: number; // USD, integer
  tagline: string;
  connections: number;
  alertsPerMonth: number;
  backtests: boolean;
  propPresets: boolean;
  features: string[];
  badge?: { label: string; tone: "volt" | "pulse" };
};

export const ANNUAL_DISCOUNT = 0.2;
export const annualMonthly = (m: number) => Math.round(m * (1 - ANNUAL_DISCOUNT));

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Learn and practice. No card, no risk.",
    connections: 0,
    alertsPerMonth: 0,
    backtests: false,
    propPresets: false,
    features: [
      "Full academy access",
      "Paper trading only",
      "Delayed intelligence feed",
      "XP, streaks and quizzes",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    tagline: "Your first guarded live connection.",
    connections: 1,
    alertsPerMonth: 100,
    backtests: false,
    propPresets: false,
    features: [
      "1 live broker connection",
      "100 guarded auto-executions / month",
      "All 9 Trade Guard controls",
      "Real-time intelligence feed",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 79,
    tagline: "Serious automation across accounts.",
    connections: 3,
    alertsPerMonth: 1000,
    backtests: true,
    propPresets: false,
    features: [
      "3 live broker connections",
      "1,000 guarded auto-executions / month",
      "Strategy backtests",
      "Full intelligence feed — every model release",
      "Priority execution queue",
    ],
    badge: { label: "Popular", tone: "volt" },
  },
  {
    id: "elite",
    name: "Elite",
    priceMonthly: 199,
    tagline: "Built for prop-firm challenges at scale.",
    connections: 10,
    alertsPerMonth: 10000,
    backtests: true,
    propPresets: true,
    features: [
      "10 live broker connections",
      "10,000 guarded auto-executions / month",
      "Prop-firm rule presets (1-step / 2-step)",
      "Strategy backtests",
      "Dedicated support channel",
    ],
    badge: { label: "Prop", tone: "pulse" },
  },
];

export const PRICING_NOTE =
  "Subscription tiers open at the public SaaS launch. Available today: Founding Hero — lifetime Pro (intelligence, execution, academy) for a one-time $499, 500 seats ever.";

/* ---------- Academy lessons ---------- */

export type LessonSection = {
  h: string;
  paras: string[];
  table?: { caption: string; head: string[]; rows: string[][] };
};

export type Lesson = {
  slug: string;
  number: string; // "01"
  title: string;
  minutes: number;
  summary: string;
  sections: LessonSection[];
};

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-a-pip",
    number: "01",
    title: "What a pip actually is",
    minutes: 6,
    summary:
      "The unit every forex price move is measured in — and why it matters more for sizing than for bragging.",
    sections: [
      {
        h: "The smallest step a price takes",
        paras: [
          "A pip — “percentage in point” — is the standard unit of price movement in foreign exchange. For most currency pairs it is the fourth decimal place: 0.0001. If EURUSD moves from 1.0842 to 1.0850, it moved 8 pips. If it falls from 1.0842 to 1.0742, that is 100 pips. Yen pairs are the classic exception: because one yen is worth so much less than one euro or dollar, the pip sits at the second decimal, 0.01. USDJPY going from 155.20 to 155.65 is a 45-pip move.",
          "Most brokers today quote one extra digit — a fifth decimal on EURUSD, a third on USDJPY. That last digit is a pipette, one tenth of a pip. When your platform shows 1.08425, read it as 1.0842 and a half. Pipettes matter for spreads; pips are the language of moves, stops and targets.",
        ],
      },
      {
        h: "Why traders count in pips, not dollars",
        paras: [
          "Pips normalize price movement across instruments. A 60-pip stop on EURUSD and a 60-pip stop on GBPUSD describe comparable market distance even though the dollar amounts differ. That lets you write rules — “risk no more than a 40-pip stop on London-session entries” — that transfer between pairs and between account sizes. Dollar P&L is an output; pips are the input your strategy actually controls.",
        ],
      },
      {
        h: "Pip value: where money enters the equation",
        paras: [
          "The cash value of one pip depends on your position size. On EURUSD, a standard lot (100,000 units) makes one pip worth about $10. A mini lot (10,000) is about $1 per pip, and a micro lot (1,000) about $0.10. So the same 30-pip move is $300, $30 or $3 depending purely on what size you chose — the market did the identical thing.",
          "This is the quiet lesson hiding inside a definition: position size, not prediction, decides what a move costs or pays you. If your stop is 25 pips away and you can only afford to lose $50, arithmetic — not confidence — sets your size: $50 ÷ 25 pips = $2 per pip, which is two micro lots. Lesson 03 turns that arithmetic into the 1% rule professionals actually use. Learn to see every trade as pips first and money second, and sizing stops being an emotion.",
        ],
      },
    ],
  },
  {
    slug: "read-a-candle",
    number: "02",
    title: "Read a candlestick like a hero",
    minutes: 7,
    summary:
      "OHLC anatomy, what wicks really record, and the misread that costs beginners the most.",
    sections: [
      {
        h: "Four prices, one picture",
        paras: [
          "A candlestick compresses everything that happened in a time window into four prices: Open, High, Low, Close — OHLC. The thick part, the body, spans open to close. The thin lines above and below, the wicks (or shadows), stretch to the highest and lowest prices traded. On a dark theme like ours, a candle that closed above its open prints in profit green; one that closed below prints in loss red.",
          "That is the whole anatomy. A 1-hour candle with open 1.0850, high 1.0878, low 1.0846, close 1.0871 tells you: buyers finished 21 pips ahead, price probed 7 pips higher than the close at some point, and sellers only managed 4 pips below the open all hour.",
        ],
      },
      {
        h: "Wicks are rejection records",
        paras: [
          "The body says who won; the wicks say what was attempted and refused. A long upper wick means price visited higher levels and was sold back down — buyers tried, sellers answered. A long lower wick means a dip was bought back up. Wicks at significant levels (yesterday's high, a round number, a session open) are more informative than wicks in the middle of nowhere: they show where resting interest actually defended a price, which is exactly the kind of level a rule-based stop or entry can anchor to.",
        ],
      },
      {
        h: "The misread that costs beginners most",
        paras: [
          "The classic error: seeing a big green candle and concluding “buyers are in control — buy.” A candle is a summary, not a signal. That green body may have closed in the bottom third of its range after a violent rejection at the high — bullish body, bearish finish. Always read the close relative to the full range: a close near the high is conviction; a close in the middle after a round trip is indecision wearing a green shirt.",
          "Second error: reading one candle without its timeframe. A dramatic engulfing candle on the 5-minute chart is often noise inside a single 1-hour bar. Before acting on any candle, ask: what does this look like one timeframe up? On paper, practice narrating candles — “probed high, rejected, closed weak” — until the description comes before the emotion. That narration is precisely what you will later encode as rules.",
        ],
      },
    ],
  },
  {
    slug: "risk-1-percent",
    number: "03",
    title: "Why pros risk 1%",
    minutes: 8,
    summary:
      "Expectancy, the mathematics of losing streaks, and why drawdowns are so brutally expensive to reverse.",
    sections: [
      {
        h: "Expectancy: the only edge that compounds",
        paras: [
          "A strategy's expectancy is what an average trade pays: (win rate × average win) − (loss rate × average loss). A system that wins 45% of the time, making 2R on winners and losing 1R on losers, has an expectancy of (0.45 × 2) − (0.55 × 1) = +0.35R per trade. Positive expectancy is necessary — but it is not sufficient. Expectancy tells you what happens on average; risk-per-trade decides whether you survive long enough for the average to arrive.",
        ],
      },
      {
        h: "Losing streaks are not bad luck — they are scheduled",
        paras: [
          "With a 50% win rate, the chance of some 7-loss streak appearing within 100 trades is better than even. Streaks are a mathematical certainty of any real system, so the only question is what one does to your account. The damage compounds against you:",
          "At 1% risk, a 10-loss streak is an annoyance. At 5%, it is a crisis. At 10%, the account is functionally dead — and every real strategy will eventually meet that streak. This table is simulated arithmetic, not a performance claim.",
        ],
        table: {
          caption: "Equity remaining after 10 consecutive losses (simulated arithmetic)",
          head: ["Risk per trade", "After 10 losses", "Drawdown"],
          rows: [
            ["1%", "90.4%", "−9.6%"],
            ["2%", "81.7%", "−18.3%"],
            ["5%", "59.9%", "−40.1%"],
            ["10%", "34.9%", "−65.1%"],
          ],
        },
      },
      {
        h: "Drawdowns charge compound interest",
        paras: [
          "Losses and recoveries are not symmetric. Lose 10% and you need +11.1% to get back to even. Lose 20% and you need +25%. Lose 50% and you must double the account — +100% — just to return to where you started. At −65%, the required recovery is +186%. The deeper the hole, the more the mathematics itself becomes your opponent, which is why professionals obsess over the size of losses rather than the frequency of wins.",
          "This is exactly what Trade Guard mechanizes: risk-percent sizing computes your position from your stop distance and a fixed fraction of equity, and drawdown breakers halt trading before a bad day becomes an unrecoverable month. Discipline as software, because willpower has losing streaks too.",
        ],
        table: {
          caption: "Gain required to recover a drawdown",
          head: ["Drawdown", "Required recovery"],
          rows: [
            ["−10%", "+11.1%"],
            ["−20%", "+25.0%"],
            ["−33%", "+49.3%"],
            ["−50%", "+100%"],
            ["−65%", "+185.7%"],
          ],
        },
      },
    ],
  },
];

/* ---------- Product copy ---------- */

export const PILLARS = [
  {
    title: "Intelligence",
    desc: "Decision intelligence, not signals: volatility, momentum and regime features scored by quant-ml-v1, published above the confidence gate with confidence, model version and reasoning attached — never resold third-party calls.",
    href: "/product/intelligence",
  },
  {
    title: "Automation",
    desc: "Every decision executes on your own broker — MT5, Binance and KuCoin today, 30+ exchanges via unified API rolling out. Trade-scope keys, encrypted, never custodial.",
    href: "/product/automation",
  },
  {
    title: "Trade Guard",
    desc: "Risk-percent sizing, drawdown circuit breakers, news filters and prop-firm rule guards on every order. One bad day can't blow the account.",
    href: "/product/trade-guard",
  },
  {
    title: "Academy + paper",
    desc: "HeroPips Learn: structured lessons and a $10,000 paper account on the same pipeline — learn while it trades, prove it before your broker sees an order.",
    href: "/academy",
  },
] as const;

export const JOURNEY = [
  { step: "01", title: "Decision born", desc: "Quant data → engineered features → quant-ml-v1 score. Only above-gate setups publish, reasoning attached." },
  { step: "02", title: "Guard check", desc: "Sized from your equity and stop distance; every Trade Guard rule must say yes." },
  { step: "03", title: "Executed", desc: "Routed to your own broker connection — MT5, Binance or KuCoin. Exactly once." },
  { step: "04", title: "On the record", desc: "Fills, R-multiples and P&L journaled. Simulated figures always labeled." },
] as const;

export type Guard = { name: string; param: string; desc: string };

export const GUARDS: Guard[] = [
  { name: "Risk-% sizing", param: "max_risk: 1.0% equity / trade", desc: "Position size is computed from your stop distance so no single trade can lose more than the fraction you set." },
  { name: "Daily loss breaker", param: "daily_stop: −3.0% equity", desc: "Trading halts for the day the moment realized plus open losses cross your daily limit." },
  { name: "Max drawdown breaker", param: "max_dd: −8% from peak", desc: "A hard circuit breaker: flatten and lock the account when drawdown from equity peak exceeds the cap." },
  { name: "Exposure cap", param: "max_exposure: 10× equity notional", desc: "Total open notional across all positions stays under your leverage ceiling." },
  { name: "Concurrent positions", param: "max_open: 3 trades", desc: "Caps simultaneous open positions so correlated trades can't stack risk." },
  { name: "News filter", param: "block: ±15 min, high-impact", desc: "Suppresses new orders around scheduled high-impact events like NFP and rate decisions." },
  { name: "Session window", param: "allow: 07:00–20:00 UTC", desc: "Orders execute only inside the sessions you trade; everything else is rejected." },
  { name: "Symbol allowlist", param: "symbols: EURUSD, GBPUSD, XAUUSD", desc: "Briefs for any instrument not on your list are dropped before sizing." },
  { name: "Prop-firm presets", param: "preset: 2-step challenge", desc: "One-click rule bundles matching common 1-step / 2-step challenge limits: daily loss, total loss, minimum days." },
];

export const EXECUTION_MODES = [
  {
    mode: "Notify",
    desc: "Briefs arrive as alerts only — the full case, no orders. You read, you decide, you place any trade yourself. No execution permission exists.",
  },
  {
    mode: "Confirm",
    desc: "Each brief becomes a one-tap approval with full context — features, confidence, model version, stop, size after guards. Nothing executes without your explicit tap, and every order still passes Trade Guard.",
  },
  {
    mode: "Full-auto",
    desc: "Execution runs unattended — only after explicit written consent, only with Trade Guard active, and only within the guard limits you configured. Revocable instantly.",
  },
] as const;

/* ---------- Public route inventory ---------- */

/**
 * One indexable public URL. Ordered: the list is rendered verbatim into
 * llms.txt / llms-full.txt and mapped into the sitemap.
 */
export type PublicRoute = {
  path: string;
  title: string;
  summary: string;
  group: "Product" | "Learn" | "Access" | "Legal" | "Company";
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
};

/**
 * THE public surface — the single source of truth for app/sitemap.ts,
 * app/llms.txt and app/llms-full.txt. Add a route here and all three follow.
 *
 * Deliberately absent: /app/** (noindex platform), /api/** (BFF),
 * /founding/status + /early-access/status (token-gated), /unsubscribe
 * (one-click token in the query string), /offline (service-worker shell) and
 * /academy/verify/[code] (unbounded, per-person).
 */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  {
    path: "/",
    title: "HeroPips — decision intelligence, your broker, on rails",
    summary:
      "What HeroPips is: scored, explained decision intelligence from an internal quant engine, executed on your own broker — MT5, Binance, KuCoin — under enforced risk rules.",
    group: "Product",
    priority: 1.0,
    changeFrequency: "weekly",
  },
  {
    path: "/product",
    title: "Product — the trading intelligence platform",
    summary:
      "How the platform works end to end: institutional-grade data becomes scored, explained decision intelligence that executes on your broker behind Trade Guard.",
    group: "Product",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/product/intelligence",
    title: "Intelligence — decisions explained, not signals sold",
    summary:
      "Where the intelligence comes from: quant data, engineered volatility/momentum/regime features, quant-ml-v1 scoring, a confidence gate, and reasoning plus model_version attached to every brief.",
    group: "Product",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/product/automation",
    title: "Automation — execution on your own broker",
    summary:
      "Broker coverage (MT5, Binance, KuCoin today; 30+ exchanges via a unified API), how execution and Trade Guard interact, and why only trade-scope keys are accepted. Never custodial.",
    group: "Product",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/product/trade-guard",
    title: "Trade Guard — nine risk controls, fail-closed",
    summary:
      "The nine independent guards between every trade and your broker — sizing, daily-loss and drawdown breakers, exposure caps, news filters, prop-firm presets. If the engine is down, orders block.",
    group: "Product",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/academy",
    title: "HeroPips Academy — learn trading from zero, free to start",
    summary:
      "The gamified curriculum: 10 levels, 31 short lessons, quizzes, XP, streaks, 11 verifiable certificates and live classes. Level 0 is free for everyone, no account needed.",
    group: "Learn",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/academy/certificates",
    title: "Academy certificates — see them before you earn them",
    summary:
      "All 11 certificates as draft samples — one per level plus the Hero Trader grand credential — each issued with a unique code and a public verification URL.",
    group: "Learn",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/academy/arcade",
    title: "Trading Arcade — practice games that pay XP",
    summary:
      "Chart-reading and risk drills: call the next move, size positions correctly, spin the daily wheel. Practice only — no real money anywhere.",
    group: "Learn",
    priority: 0.6,
    changeFrequency: "weekly",
  },
  ...LESSONS_FULL.map(
    (lesson): PublicRoute => ({
      path: `/academy/${lesson.slug}`,
      title: lesson.title,
      summary: lesson.summary,
      group: "Learn",
      priority: 0.7,
      changeFrequency: "monthly",
    }),
  ),
  {
    path: "/pricing",
    title: "Pricing — free to learn, fair to automate",
    summary:
      "Founding Hero is purchasable today: lifetime Pro for a one-time $499 in crypto. Free, Starter $29, Pro $79 and Elite $199 monthly tiers open at the public SaaS launch (annual −20%).",
    group: "Access",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    // Daily while founding seats are selling — the counter and availability move.
    path: "/founding",
    title: "Founding Hero — lifetime access, 500 seats ever",
    summary:
      "The $499 one-time crypto seat: lifetime Pro with the academy included, 500 seats ever, 14-day refund in USDT equivalent, immediate live access.",
    group: "Access",
    priority: 0.9,
    changeFrequency: "daily",
  },
  {
    path: "/early-access",
    title: "Early access — claim your place in the launch line",
    summary:
      "Join the public-launch list: verify your email, take a numbered place, and jump 25 positions for every 3 verified friends who join.",
    group: "Access",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/affiliates",
    title: "Affiliates & referrals — two ways to earn",
    summary:
      "User referrals (queue-jumps plus rewards on paid conversions) and the separate marketer platform — multi-level commissions up to 10 levels, double-entry ledger, crypto payouts, 14-day clawback.",
    group: "Access",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/faq",
    title: "FAQ — straight answers",
    summary:
      "Where the intelligence comes from, which brokers work, what Founding Hero includes, launch status, the advice/custody stance, and what HeroPips never promises.",
    group: "Company",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/legal/terms",
    title: "Terms of Service",
    summary:
      "Self-directed software with no advice and no custody: account rules, gamification points, referral limits and acceptable use.",
    group: "Legal",
    priority: 0.3,
    changeFrequency: "yearly",
  },
  {
    path: "/legal/privacy",
    title: "Privacy Policy",
    summary:
      "What HeroPips collects (and what it never sees), the processors — NOWPayments, SendGrid, PostHog — retention, and your GDPR rights including export and deletion.",
    group: "Legal",
    priority: 0.3,
    changeFrequency: "yearly",
  },
  {
    path: "/legal/risk",
    title: "Risk Disclosure",
    summary:
      "Trading leveraged instruments carries a substantial risk of loss. The limits of simulated results, of automation, and of any past performance figure.",
    group: "Legal",
    priority: 0.3,
    changeFrequency: "yearly",
  },
  {
    path: "/legal/refunds",
    title: "Refund Policy",
    summary:
      "The 14-day Founding Hero refund window paid in USDT equivalent, subscription cancellation rules, and how to request a refund on an irreversible crypto payment.",
    group: "Legal",
    priority: 0.3,
    changeFrequency: "yearly",
  },
  {
    path: "/legal/ltd-terms",
    title: "Founding Hero Terms",
    summary:
      "The lifetime offer in contract form: 500 seats ever, one-time $499, lifetime Pro entitlement, 14-day refund and no resale after the cap.",
    group: "Legal",
    priority: 0.3,
    changeFrequency: "yearly",
  },
];
