/* =========================================================================
 * HeroPips email library — every lifecycle + transactional template.
 *
 * Copy rules (the brand voice is the product's moat — keep it):
 *   - subjects ≤ ~55 chars, concrete, zero clickbait, zero emoji
 *   - one primary CTA per email; secondary links are quiet
 *   - FOMO only from REAL mechanics: 500 lifetime seats, queue position,
 *     streaks/XP, signal cadence. NEVER fabricate performance numbers.
 *   - every fact rendered comes from an event payload or the database
 * ======================================================================= */
import type { EmailCategory } from "@heropips/contracts";
import type { Block } from "./base";

/** Absolute site link with UTM attribution; `content` disambiguates CTAs. */
export type LinkFactory = (path: string, content?: string) => string;

export type TemplateDef<P> = {
  key: string;
  category: EmailCategory;
  subject: (p: P) => string;
  preheader: (p: P) => string;
  blocks: (p: P, l: LinkFactory) => Block[];
  /** Footer "why you got this" line. */
  reason: string;
};

const REASON_EA = "You're receiving this because you joined the HeroPips early-access list.";
const REASON_ORDER = "You're receiving this because of an order on heropips.com.";
const REASON_ACCOUNT = "You're receiving this because you have a HeroPips account.";
const REASON_ACADEMY = "You're receiving this because you have a HeroPips Academy profile.";

/** "risk-1-percent" → "Risk 1 percent" (lesson slugs are kebab-case). */
export function lessonTitle(slug: string): string {
  const words = slug.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function firstName(displayName: string | null | undefined): string {
  const first = displayName?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "Hero";
}

const fmtUsd = (usd: number): string => `$${usd.toLocaleString("en-US")}`;

/* =========================================================================
 * EARLY ACCESS — transactional
 * ======================================================================= */

export type EaWelcomeProps = {
  position: number;
  total: number;
  code: string;
  statusToken: string;
  referred: boolean;
};
export const eaWelcome: TemplateDef<EaWelcomeProps> = {
  key: "ea_welcome",
  category: "transactional",
  subject: (p) => `You're #${p.position} in line for HeroPips`,
  preheader: (p) =>
    p.referred
      ? "Your friend's link worked. Here's your spot — and how to move up."
      : "Your spot is locked. Here's how the line works — and how to skip it.",
  reason: REASON_EA,
  blocks: (p, l) => [
    { kind: "kicker", text: "Early access confirmed" },
    { kind: "h1", text: `You're in line — position #${p.position}` },
    {
      kind: "p",
      text: `${p.total.toLocaleString("en-US")} traders are queued for a platform that scores every trade idea, explains its reasoning, and executes on your own broker under rules you set. Invites go out in position order.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Your position", value: `#${p.position}` },
        { label: "In line", value: p.total.toLocaleString("en-US") },
        { label: "Your referral code", value: p.code },
      ],
    },
    {
      kind: "p",
      text: "Every 3 friends who join with your link moves you up 25 places. The people at the front get their invite — and first claim on the 500 founding seats.",
    },
    { kind: "button", label: "Track your position", url: l(`/early-access/status?token=${p.statusToken}`, "status") },
    { kind: "linkline", label: `Share your link: heropips.com/early-access?ref=${p.code}`, url: l(`/early-access?ref=${p.code}`, "share") },
    { kind: "divider" },
    {
      kind: "p",
      text: "While you wait: Level 0 of the HeroPips Academy is free — no account needed. Eight minutes gets you your first XP.",
    },
    { kind: "linkline", label: "Start Level 0 — What is trading", url: l("/academy/what-is-trading", "academy") },
  ],
};

export type EaReferralJumpProps = {
  position: number;
  referralsVerified: number;
  jumps: number;
  code: string;
  statusToken: string;
};
export const eaReferralJump: TemplateDef<EaReferralJumpProps> = {
  key: "ea_referral_jump",
  category: "lifecycle",
  subject: (p) => {
    const toNext = 3 - (p.referralsVerified % 3);
    return toNext === 3
      ? `You moved up — now #${p.position} in line`
      : `Referral landed — ${toNext} more for a 25-place jump`;
  },
  preheader: (p) => `${p.referralsVerified} referral${p.referralsVerified === 1 ? "" : "s"} so far. Your link is working.`,
  reason: REASON_EA,
  blocks: (p, l) => {
    const inCycle = p.referralsVerified % 3;
    return [
      { kind: "kicker", text: "Queue update" },
      { kind: "h1", text: "Someone just joined with your link" },
      {
        kind: "stats",
        rows: [
          { label: "Your position", value: `#${p.position}` },
          { label: "Verified referrals", value: String(p.referralsVerified) },
          { label: "Jumps earned (+25 each)", value: String(p.jumps) },
        ],
      },
      { kind: "progress", label: "Next jump", done: inCycle === 0 && p.referralsVerified > 0 ? 3 : inCycle, total: 3 },
      {
        kind: "p",
        text:
          inCycle === 0 && p.referralsVerified > 0
            ? "Jump complete — 25 places closer to your invite and to the 500 founding seats. The counter starts again with your next referral."
            : `${3 - inCycle} more verified ${3 - inCycle === 1 ? "referral" : "referrals"} and you jump another 25 places.`,
      },
      { kind: "button", label: "See your live position", url: l(`/early-access/status?token=${p.statusToken}`, "status") },
      { kind: "linkline", label: `Your link: heropips.com/early-access?ref=${p.code}`, url: l(`/early-access?ref=${p.code}`, "share") },
    ];
  },
};

/* =========================================================================
 * ORDERS & PAYMENTS — transactional
 * ======================================================================= */

export type OrderCreatedProps = {
  orderId: string;
  priceUsd: number;
  expiresAtIso: string;
  statusToken: string;
};
export const orderCreated: TemplateDef<OrderCreatedProps> = {
  key: "order_created",
  category: "transactional",
  subject: () => "Your founding seat is on hold",
  preheader: () => "Complete payment to lock lifetime access. The hold releases automatically.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Seat held" },
    { kind: "h1", text: "One founding seat is reserved for you" },
    {
      kind: "p",
      text: `We're holding a Founding Hero seat against order ${p.orderId}. Finish the crypto payment before the hold expires and the seat is yours — for life.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Order", value: p.orderId },
        { label: "Founding Hero — Lifetime Pro", value: fmtUsd(p.priceUsd) },
        { label: "Hold expires", value: new Date(p.expiresAtIso).toUTCString() },
      ],
    },
    { kind: "button", label: "Complete payment", url: l(`/founding/status?token=${p.statusToken}`, "pay") },
    {
      kind: "note",
      text: "If the hold lapses, the seat returns to the pool of 500 and your payment page closes. Crypto confirmations can take a few minutes — start early.",
    },
  ],
};

export type PurchaseConfirmedProps = {
  orderId: string;
  priceUsd: number;
  packageName: string;
  statusToken: string;
};
export const purchaseConfirmed: TemplateDef<PurchaseConfirmedProps> = {
  key: "purchase_confirmed",
  category: "transactional",
  subject: () => "Welcome, Founding Hero — your seat is locked",
  preheader: () => "Payment confirmed. Your access code is inside — setup takes two minutes.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Payment confirmed" },
    { kind: "h1", text: "Your lifetime seat is locked in" },
    {
      kind: "p",
      text: `That's one of only 500 founding seats — yours permanently. No subscription, no renewal, and every Pro feature we ever ship is included.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Order", value: p.orderId },
        { label: p.packageName, value: fmtUsd(p.priceUsd) },
        { label: "Term", value: "Lifetime" },
      ],
    },
    { kind: "code", value: p.orderId, caption: "Your access code — use it on the redeem page" },
    // The status token prefills both the order id and the paid email on the
    // redeem form; billing matches on both, so this removes the only two
    // fields a buyer could get wrong.
    { kind: "button", label: "Create your account now", url: l(`/app/redeem?token=${p.statusToken}`, "redeem") },
    { kind: "divider" },
    {
      kind: "list",
      items: [
        "3 live broker connections — MT5, Binance, KuCoin",
        "50 scored signals per day, each with its reasoning",
        "20 Trade Guard rules enforcing your risk plan",
        "Founding lounge + every Academy level unlocked",
      ],
    },
    { kind: "linkline", label: "View your order anytime", url: l(`/founding/status?token=${p.statusToken}`, "status") },
  ],
};

export type PaymentIssueProps = { orderId: string; statusToken: string };
export const paymentIssue: TemplateDef<PaymentIssueProps> = {
  key: "payment_issue",
  category: "transactional",
  subject: () => "Payment problem on your founding order",
  preheader: () => "The payment didn't go through. Your order page has the details.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Action needed" },
    { kind: "h1", text: "Your payment didn't complete" },
    {
      kind: "p",
      text: `Order ${p.orderId} hit a payment failure — usually an underpaid amount or a network fee mismatch. Nothing is lost: check the order page for exact status and next steps.`,
    },
    { kind: "button", label: "Review your order", url: l(`/founding/status?token=${p.statusToken}`, "review") },
    { kind: "note", text: "Stuck? Reply to this email and a human will sort it out with you." },
  ],
};

export type OrderExpiredProps = { orderId: string; priceUsd: number };
export const orderExpired: TemplateDef<OrderExpiredProps> = {
  key: "order_expired",
  category: "transactional",
  subject: () => "Your seat hold expired — the seat went back",
  preheader: () => "No charge was made. Seats keep moving; you can grab another in one click.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Hold released" },
    { kind: "h1", text: "That seat went back into the pool" },
    {
      kind: "p",
      text: `The 120-minute hold on order ${p.orderId} lapsed before payment confirmed, so the seat returned to the founding pool. You were not charged.`,
    },
    {
      kind: "p",
      text: `The founding deal itself hasn't changed: ${fmtUsd(p.priceUsd)} once, lifetime Pro, capped at 500 people. When the cap fills, the price model becomes a subscription — permanently.`,
    },
    { kind: "button", label: "Reserve a new seat", url: l("/founding", "retry") },
  ],
};

export type RefundConfirmedProps = { orderId: string };
export const refundConfirmed: TemplateDef<RefundConfirmedProps> = {
  key: "refund_confirmed",
  category: "transactional",
  subject: () => "Your refund is on its way",
  preheader: () => "Processed and heading back to your wallet. No hard feelings.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Refund processed" },
    { kind: "h1", text: "Done — your refund is moving" },
    {
      kind: "p",
      text: `Order ${p.orderId} has been refunded to the original payment method. Crypto settlement usually lands within a few hours, depending on the network.`,
    },
    {
      kind: "p",
      text: "Your founding seat has been released. If HeroPips wasn't right today, the free Academy stays open to you — and so does the door.",
    },
    { kind: "linkline", label: "Keep learning free at the Academy", url: l("/academy", "academy") },
  ],
};

/* =========================================================================
 * PLATFORM — transactional
 * ======================================================================= */

export type PlatformWelcomeProps = { displayName: string | null; founding: boolean };
export const platformWelcome: TemplateDef<PlatformWelcomeProps> = {
  key: "platform_welcome",
  category: "transactional",
  subject: (p) => `${firstName(p.displayName)}, your HeroPips account is live`,
  preheader: () => "Three steps to your first guarded trade — start with eight minutes.",
  reason: REASON_ACCOUNT,
  blocks: (p, l) => [
    { kind: "kicker", text: p.founding ? "Founding member" : "Account created" },
    { kind: "h1", text: `Welcome aboard, ${firstName(p.displayName)}` },
    {
      kind: "p",
      text: "HeroPips is rails, not tips: intelligence that scores and explains trade decisions, and guardrails that keep execution inside your rules. Here's the proven first week:",
    },
    {
      kind: "list",
      items: [
        "Day 1 — finish your first Academy lesson (8 minutes, XP counts)",
        "Day 2 — take one guarded trade on your $10,000 paper account",
        "Day 7 — connect your broker: MT5, Binance, or KuCoin",
      ],
    },
    { kind: "button", label: "Open your dashboard", url: l("/app", "dashboard") },
    ...(p.founding
      ? ([
          { kind: "divider" },
          {
            kind: "p",
            text: "Your founding badge is active: lifetime Pro limits, every Academy level unlocked, and the founding lounge — the room where the first 500 compare notes.",
          },
          { kind: "linkline", label: "Step into the founding lounge", url: l("/app/chat", "lounge") },
        ] as const)
      : []),
  ],
};

export type AcademyCertProps = {
  displayName: string | null;
  track: string;
  code: string;
  xp: number;
};
export const academyCertificate: TemplateDef<AcademyCertProps> = {
  key: "academy_certificate",
  category: "transactional",
  subject: (p) => `Your ${p.track} certificate is ready`,
  preheader: () => "Verified, shareable, and earned — not bought. Link inside.",
  reason: REASON_ACADEMY,
  blocks: (p, l) => [
    { kind: "kicker", text: "Certificate issued" },
    { kind: "h1", text: `${firstName(p.displayName)}, you earned it` },
    {
      kind: "p",
      text: `The ${p.track} track is complete — every lesson, every quiz. Your certificate carries a public verification code, so anyone can check it's real.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Track", value: p.track },
        { label: "Verification code", value: p.code },
        { label: "XP at issue", value: p.xp.toLocaleString("en-US") },
      ],
    },
    { kind: "button", label: "View & share your certificate", url: l(`/academy/verify/${p.code}`, "verify") },
    { kind: "p", text: "Next: the curriculum keeps going — and so does the leaderboard." },
  ],
};

/* =========================================================================
 * EARLY-ACCESS NURTURE JOURNEY — lifecycle (D1 → D19)
 * ======================================================================= */

export type EaJourneyProps = {
  position: number;
  code: string;
  statusToken: string;
  priceUsd: number;
  seatCap: number;
};

export const eaD1Story: TemplateDef<EaJourneyProps> = {
  key: "ea_d1_story",
  category: "lifecycle",
  subject: () => "What HeroPips actually does (no magic)",
  preheader: () => "Scored decisions, explained reasoning, execution on YOUR broker. That's it.",
  reason: REASON_EA,
  blocks: (_p, l) => [
    { kind: "kicker", text: "Day 1 — the machine" },
    { kind: "h1", text: "No signals-guru nonsense. Rails." },
    {
      kind: "p",
      text: "Most trading tools hand you a tip and vanish. HeroPips is built the opposite way — three parts, all inspectable:",
    },
    {
      kind: "list",
      items: [
        "Decision intelligence — every idea arrives scored, with entry, stop, target and the reasoning written out",
        "Trade Guard — your risk rules enforced in software: max risk per trade, daily loss caps, session limits",
        "Your broker, not ours — execution goes through your own MT5, Binance, or KuCoin account",
      ],
    },
    {
      kind: "p",
      text: "You stay in control of the money at all times. We never custody funds — we put your decisions on rails.",
    },
    { kind: "button", label: "See how the intelligence works", url: l("/product/intelligence", "product") },
  ],
};

export const eaD3Academy: TemplateDef<EaJourneyProps> = {
  key: "ea_d3_academy",
  category: "lifecycle",
  subject: () => "Don't just stand in line — bank XP while you wait",
  preheader: () => "Level 0 is free, no account needed. First lesson: 8 minutes.",
  reason: REASON_EA,
  blocks: (_p, l) => [
    { kind: "kicker", text: "Day 3 — free training" },
    { kind: "h1", text: "The Academy is open while you queue" },
    {
      kind: "p",
      text: "From curious trader to confident trader: 10 levels, 31 lessons, all gamified — XP, streaks, ranks, an arcade, and two verifiable certificates. Level 0 costs nothing and doesn't even ask for an account.",
    },
    {
      kind: "list",
      items: [
        "What is trading — 8 min, 60 XP",
        "Markets and pairs — 7 min, 60 XP",
        "Brokers, orders, spread — 8 min, 60 XP",
      ],
    },
    {
      kind: "p",
      text: "Traders who arrive on launch day already fluent move straight to the interesting part. Your XP banks now and claims to your account later.",
    },
    { kind: "button", label: "Start lesson one free", url: l("/academy/what-is-trading", "lesson") },
    { kind: "linkline", label: "Or warm up in the arcade", url: l("/academy/arcade", "arcade") },
  ],
};

export const eaD5Founding: TemplateDef<EaJourneyProps> = {
  key: "ea_d5_founding",
  category: "lifecycle",
  subject: (p) => `${p.seatCap} lifetime seats. Then it's subscriptions.`,
  preheader: (p) => `One payment of ${fmtUsd(p.priceUsd)}, Pro forever — and you skip the queue entirely.`,
  reason: REASON_EA,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 5 — the founding deal" },
    { kind: "h1", text: "The only version of HeroPips you can own" },
    {
      kind: "p",
      text: `We're selling exactly ${p.seatCap} founding seats: ${fmtUsd(p.priceUsd)} once, lifetime Pro access, every future Pro feature included. After seat ${p.seatCap}, HeroPips is subscription-only — those buyers rent what founders own.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Founding Hero — Lifetime Pro", value: `${fmtUsd(p.priceUsd)} once` },
        { label: "Live broker connections", value: "3" },
        { label: "Scored signals per day", value: "50" },
        { label: "Trade Guard rules", value: "20" },
      ],
    },
    {
      kind: "p",
      text: "Founders also skip the early-access queue — payment confirms, access code arrives, you're in.",
    },
    { kind: "button", label: "Claim a founding seat", url: l("/founding", "founding") },
    { kind: "note", text: "Crypto checkout via NOWPayments. Seat holds last 120 minutes." },
  ],
};

export const eaD8Referral: TemplateDef<EaJourneyProps> = {
  key: "ea_d8_referral",
  category: "lifecycle",
  subject: () => "Cut the line: 3 friends = 25 places",
  preheader: (p) => `You're #${p.position}. Your link does the climbing for you.`,
  reason: REASON_EA,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 8 — queue mechanics" },
    { kind: "h1", text: `Still #${p.position}? Your link fixes that` },
    {
      kind: "p",
      text: "Every 3 people who join through your link move you up 25 places — no cap, stackable, verified automatically. The traders at the front get invites first and first claim on founding seats.",
    },
    { kind: "code", value: p.code, caption: "Your referral code" },
    { kind: "button", label: "Grab your share link", url: l(`/early-access/status?token=${p.statusToken}`, "status") },
    {
      kind: "p",
      text: "Where it works best: the group chat that already argues about trades, a trading Discord, or that one friend who screenshots charts at 2am.",
    },
  ],
};

export const eaD12Proof: TemplateDef<EaJourneyProps & { weekGenerated: number; weekTargetHit: number }> = {
  key: "ea_d12_proof",
  category: "lifecycle",
  subject: () => "What ran inside HeroPips this week",
  preheader: () => "The machine doesn't wait for launch day. A look at the cadence.",
  reason: REASON_EA,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 12 — inside the machine" },
    { kind: "h1", text: "This is what you're queued for" },
    {
      kind: "p",
      text: "While the list grows, the engine keeps running its full loop — generating scored setups, attaching stops and targets, and resolving every one honestly, hit or miss:",
    },
    {
      kind: "stats",
      rows: [
        { label: "Signals generated this week", value: p.weekGenerated.toLocaleString("en-US") },
        { label: "Resolved at target", value: p.weekTargetHit.toLocaleString("en-US") },
        { label: "Every signal ships with", value: "Score · SL · TP · reasoning" },
      ],
    },
    {
      kind: "note",
      text: "Counts are raw engine activity, not a performance promise. Past signals never guarantee future results — that's exactly why Trade Guard exists.",
    },
    {
      kind: "p",
      text: "Members watch these resolve live, trade them on paper first, and let Trade Guard keep the sizing honest. The queue is the only thing between you and the room.",
    },
    { kind: "button", label: "Skip the queue — go founding", url: l("/founding", "founding") },
    { kind: "linkline", label: "Or climb free with referrals", url: l(`/early-access/status?token=${p.statusToken}`, "status") },
  ],
};

export const eaD19LastCall: TemplateDef<EaJourneyProps> = {
  key: "ea_d19_lastcall",
  category: "lifecycle",
  subject: (p) => `Where you stand, #${p.position} — and what's left`,
  preheader: (p) => `The ${p.seatCap}-seat founding cap doesn't reopen. Quick status inside.`,
  reason: REASON_EA,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 19 — status check" },
    { kind: "h1", text: "Two ways in. One closes at 500." },
    {
      kind: "p",
      text: `Path one: hold position #${p.position} and wait for your invite wave. Free, reliable, slower. Path two: take a founding seat — ${fmtUsd(p.priceUsd)} once, lifetime Pro, instant access, and the cap at ${p.seatCap} makes it the only offer we will never repeat.`,
    },
    {
      kind: "p",
      text: "When the founding allocation fills, this email series stops and the pricing page switches to subscriptions. Founders keep their terms forever.",
    },
    { kind: "button", label: "Check seats remaining", url: l("/founding", "founding") },
    { kind: "linkline", label: "Your queue position", url: l(`/early-access/status?token=${p.statusToken}`, "status") },
  ],
};

/* =========================================================================
 * FOUNDING ONBOARDING JOURNEY — paid but not yet registered
 * ======================================================================= */

export type FoJourneyProps = { orderId: string };

export const foD1Redeem: TemplateDef<FoJourneyProps> = {
  key: "fo_d1_redeem",
  category: "lifecycle",
  subject: () => "Your lifetime seat is paid — and still empty",
  preheader: () => "Two minutes: access code in, account live, rails on.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Setup pending" },
    { kind: "h1", text: "You own the seat. Now sit in it." },
    {
      kind: "p",
      text: "Payment confirmed yesterday — but no account yet. Everything you paid for is idling: 50 scored signals a day, your paper account, the founding lounge, all of Academy Pro.",
    },
    { kind: "code", value: p.orderId, caption: "Your access code (your order id)" },
    { kind: "button", label: "Redeem your access", url: l(`/app/redeem?code=${encodeURIComponent(p.orderId)}`, "redeem") },
    { kind: "note", text: "Takes about two minutes: code, email, password — done." },
  ],
};

export const foD3Redeem: TemplateDef<FoJourneyProps> = {
  key: "fo_d3_redeem2",
  category: "lifecycle",
  subject: () => "Founders who start in week one keep the edge",
  preheader: () => "Your access code still works. The lounge is talking without you.",
  reason: REASON_ORDER,
  blocks: (p, l) => [
    { kind: "kicker", text: "Still waiting for you" },
    { kind: "h1", text: "Three days. Zero trades guarded." },
    {
      kind: "p",
      text: "The pattern is boring and consistent: founders who set up in the first week build the habit — paper trades, streaks, guardrails tuned. The ones who 'do it later' show up asking what they missed.",
    },
    {
      kind: "list",
      items: [
        "Your $10,000 paper account is funded and untouched",
        "The founding lounge is live — first-500 badge waiting",
        "Academy Pro levels are unlocked on your seat",
      ],
    },
    { kind: "code", value: p.orderId, caption: "Access code" },
    { kind: "button", label: "Set up in two minutes", url: l(`/app/redeem?code=${encodeURIComponent(p.orderId)}`, "redeem") },
  ],
};

/* =========================================================================
 * MEMBER ACTIVATION JOURNEY — registered users
 * ======================================================================= */

export type MaJourneyProps = { displayName: string | null; founding: boolean };

export const maD2Academy: TemplateDef<MaJourneyProps> = {
  key: "ma_d2_academy",
  category: "lifecycle",
  subject: () => "Your first lesson is 8 minutes. Streaks start at one.",
  preheader: () => "What is trading — 60 XP, and the leaderboard notices.",
  reason: REASON_ACCOUNT,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 2 — first XP" },
    { kind: "h1", text: `${firstName(p.displayName)}, the scoreboard shows zero` },
    {
      kind: "p",
      text: "Every strong trader on the platform started with the same unglamorous move: lesson one, quiz passed, 60 XP banked. Streaks compound from day one — and the daily spin only pays if you show up.",
    },
    { kind: "button", label: "Take lesson one now", url: l("/app/academy", "academy") },
    { kind: "linkline", label: "See the leaderboard you're not on yet", url: l("/academy", "leaderboard") },
  ],
};

export const maD5Paper: TemplateDef<MaJourneyProps> = {
  key: "ma_d5_paper",
  category: "lifecycle",
  subject: () => "Your $10,000 paper account is still untouched",
  preheader: () => "Same signals, same guardrails, zero risk. That's the point.",
  reason: REASON_ACCOUNT,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 5 — first guarded trade" },
    { kind: "h1", text: "Trade the machine with house money" },
    {
      kind: "p",
      text: "Your paper account mirrors the real thing: live scored signals, real spreads, Trade Guard enforcing your rules — with $10,000 that isn't yours to lose. It exists so your first mistakes are free.",
    },
    {
      kind: "list",
      items: [
        "Pick one signal with a score you actually believe",
        "Let risk sizing set the quantity (1% is the classic)",
        "Watch the stop and target do their jobs",
      ],
    },
    { kind: "button", label: "Open intelligence & trade paper", url: l("/app/intelligence", "signals") },
  ],
};

export const maD10Broker: TemplateDef<MaJourneyProps> = {
  key: "ma_d10_broker",
  category: "lifecycle",
  subject: () => "Put your real rules on real rails",
  preheader: () => "MT5, Binance, or KuCoin — your account, your keys, our guardrails.",
  reason: REASON_ACCOUNT,
  blocks: (p, l) => [
    { kind: "kicker", text: "Day 10 — go live, guarded" },
    { kind: "h1", text: "Paper proves it. Rails protect it." },
    {
      kind: "p",
      text: "When the paper numbers stop scaring you, connect the real account. Execution still goes through YOUR broker — HeroPips never holds funds — and Trade Guard applies the same discipline to real orders.",
    },
    {
      kind: "list",
      items: [
        "MT5 — forex, indices, commodities",
        "Binance / KuCoin — spot crypto",
        "Guard rules cap risk per trade, per day, per session",
      ],
    },
    { kind: "button", label: "Connect your broker", url: l("/app/connect", "connect") },
    { kind: "note", text: "Not ready? Keep compounding paper + Academy. The rails will be here." },
  ],
};

/* =========================================================================
 * ACADEMY NUDGES — lifecycle (triggered by growth sweeper events)
 * ======================================================================= */

export type NudgeDailyProps = { displayName: string | null; streakDays: number; xp: number };
export const academyNudgeDaily: TemplateDef<NudgeDailyProps> = {
  key: "academy_nudge_daily",
  category: "lifecycle",
  subject: (p) => `Your ${p.streakDays}-day streak ends at midnight UTC`,
  preheader: () => "One lesson or one arcade round keeps it alive. Minutes, not hours.",
  reason: REASON_ACADEMY,
  blocks: (p, l) => [
    { kind: "kicker", text: "Streak alert" },
    { kind: "h1", text: `${p.streakDays} days. Don't hand it back.` },
    {
      kind: "p",
      text: `${firstName(p.displayName)}, you missed yesterday. One completed lesson or a single arcade win today keeps the ${p.streakDays}-day streak (and its spin bonus) alive. Skip today and the counter resets to zero.`,
    },
    {
      kind: "stats",
      rows: [
        { label: "Current streak", value: `${p.streakDays} days` },
        { label: "Your XP", value: p.xp.toLocaleString("en-US") },
      ],
    },
    { kind: "button", label: "Save the streak", url: l("/app/academy", "academy") },
  ],
};

export type NudgeWeeklyProps = {
  displayName: string | null;
  completedCount: number;
  totalLessons: number;
  nextSlug: string;
  xp: number;
};
export const academyNudgeWeekly: TemplateDef<NudgeWeeklyProps> = {
  key: "academy_nudge_weekly",
  category: "lifecycle",
  subject: (p) => `Next up: ${lessonTitle(p.nextSlug)}`,
  preheader: (p) => `You're ${p.completedCount}/${p.totalLessons} through the curriculum. Pick the thread back up.`,
  reason: REASON_ACADEMY,
  blocks: (p, l) => [
    { kind: "kicker", text: "Where you left off" },
    { kind: "h1", text: `${lessonTitle(p.nextSlug)} is waiting` },
    { kind: "progress", label: "Curriculum", done: p.completedCount, total: p.totalLessons },
    {
      kind: "p",
      text: `A week off is fine — trading rewards rhythm, not bursts. Your XP (${p.xp.toLocaleString("en-US")}) is intact, your progress is saved, and the next lesson picks up exactly where the story paused.`,
    },
    { kind: "button", label: "Continue the curriculum", url: l(`/academy/${p.nextSlug}`, "lesson") },
  ],
};

export type NudgeMonthlyProps = { displayName: string | null; xp: number };
export const academyNudgeMonthly: TemplateDef<NudgeMonthlyProps> = {
  key: "academy_nudge_monthly",
  category: "lifecycle",
  subject: () => "Your XP is still here. The market moved on.",
  preheader: () => "A month away, progress intact. Ten minutes rebuilds the habit.",
  reason: REASON_ACADEMY,
  blocks: (p, l) => [
    { kind: "kicker", text: "It's been a month" },
    { kind: "h1", text: `${firstName(p.displayName)}, the seat's still warm` },
    {
      kind: "p",
      text: `Nothing expired: ${p.xp.toLocaleString("en-US")} XP, your rank, your completions — all saved. The traders who come back strongest restart small: one lesson, one arcade round, one paper trade.`,
    },
    { kind: "button", label: "Ease back in", url: l("/app/academy", "academy") },
    { kind: "note", text: "Rather not hear from the Academy? The unsubscribe link below stops these." },
  ],
};

/* =========================================================================
 * WEEKLY DIGEST — lifecycle ("what you're missing", honest numbers)
 * ======================================================================= */

export type WeeklyDigestProps = {
  week: string;
  generated: number;
  targetHit: number;
  stopped: number;
  registered: boolean;
};
export const weeklyDigest: TemplateDef<WeeklyDigestProps> = {
  key: "weekly_digest",
  category: "lifecycle",
  subject: (p) => `This week on HeroPips: ${p.generated} signals ran their course`,
  preheader: (p) => `${p.targetHit} resolved at target, ${p.stopped} stopped out — every one scored and explained.`,
  reason: "You're receiving this weekly recap because you're on the HeroPips list.",
  blocks: (p, l) => [
    { kind: "kicker", text: `Week ${p.week}` },
    { kind: "h1", text: "The machine's week, in plain numbers" },
    {
      kind: "stats",
      rows: [
        { label: "Signals generated", value: p.generated.toLocaleString("en-US") },
        { label: "Resolved at target", value: p.targetHit.toLocaleString("en-US") },
        { label: "Stopped out (as designed)", value: p.stopped.toLocaleString("en-US") },
      ],
    },
    {
      kind: "note",
      text: "Raw engine counts, published wins AND losses alike. Not a performance promise — discipline you can inspect.",
    },
    {
      kind: "p",
      text: p.registered
        ? "Every one of these appeared in your intelligence feed with score, stop, target and reasoning. Next week, catch them live."
        : "Members watched these resolve live — scored, stopped, explained. You're reading the box score; they were at the game.",
    },
    {
      kind: "button",
      label: p.registered ? "Open your feed" : "Get in the room",
      url: p.registered ? l("/app/intelligence", "feed") : l("/founding", "founding"),
    },
  ],
};

/* =========================================================================
 * EARLY ACCESS — email verification + operations
 * ======================================================================= */

export type EaVerifyCodeProps = {
  code: string;
  expiresMinutes: number;
  /** Already holds a place — verifying just returns it. */
  known: boolean;
};
export const eaVerifyCode: TemplateDef<EaVerifyCodeProps> = {
  key: "ea_verify_code",
  category: "transactional",
  subject: (p) => `${p.code} — your HeroPips verification code`,
  preheader: (p) =>
    p.known
      ? `Enter ${p.code} to pull up your place in the early access line.`
      : `Enter ${p.code} to claim your place in the early access line.`,
  reason: "You're receiving this because this address was entered on heropips.com/early-access.",
  blocks: (p) => [
    { kind: "kicker", text: "Verify your email" },
    { kind: "h1", text: p.known ? "Welcome back — confirm it's you" : "One code stands between you and your spot" },
    {
      kind: "p",
      text: p.known
        ? "Type this code back into the page you left open and we'll pull up the place you already hold."
        : "Type this code back into the page you left open. Your numbered place in the launch line is reserved the moment it lands.",
    },
    { kind: "code", value: p.code, caption: `Expires in ${p.expiresMinutes} minutes` },
    {
      kind: "note",
      text: "Didn't ask for this? Ignore this email. Nothing is claimed and no list is joined without the code.",
    },
  ],
};

export type AdminEaSignupProps = {
  email: string;
  position: number;
  total: number;
  code: string;
  referredByCode: string | null;
  /** Human-readable trader-profile answers; empty when the questions were skipped. */
  profileLines: readonly string[];
  joinedAt: string;
};
export const adminEarlyAccessSignup: TemplateDef<AdminEaSignupProps> = {
  key: "admin_ea_signup",
  category: "transactional",
  subject: (p) => `Early access #${p.position} — ${p.email}`,
  preheader: (p) => `${p.email} verified and took position #${p.position} of ${p.total}.`,
  reason: "You're receiving this because you are the HeroPips operations contact (ADMIN_NOTIFY_EMAIL).",
  blocks: (p) => [
    { kind: "kicker", text: "New verified signup" },
    { kind: "h1", text: `#${p.position} · ${p.email}` },
    {
      kind: "stats",
      rows: [
        { label: "Email", value: p.email },
        { label: "Position", value: `#${p.position}` },
        { label: "Total in line", value: p.total.toLocaleString("en-US") },
        { label: "Their referral code", value: p.code },
        { label: "Referred by", value: p.referredByCode ?? "direct" },
        { label: "Verified at (UTC)", value: p.joinedAt },
      ],
    },
    { kind: "divider" },
    ...(p.profileLines.length > 0
      ? ([
          { kind: "p", text: "Trader profile" },
          { kind: "list", items: p.profileLines },
        ] satisfies Block[])
      : ([{ kind: "note", text: "Trader profile skipped — no answers submitted." }] satisfies Block[])),
  ],
};
