/* =========================================================================
 * Level 9 — Go Live Like a Hero. Real money, funded accounts and scaling that survives — graduation into the live arena
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_9: readonly LessonContent[] = [
  {
    slug: "going-live-checklist",
    title: "The going-live checklist",
    hook: "Demo proved the strategy. Live tests the trader. Different exam.",
    summary:
      "The real gaps between demo and live — slippage, news spreads, money that hurts — the gate you must pass before funding an account, and the exact first-week protocol at minimum size.",
    sections: [
      {
        h: "The demo-to-live gap is real, and it has three parts",
        paras: [
          "Demo trading is the market with the physics turned friendly. Gap one: fills. On paper your order fills at 1.0850 exactly, every time. Live, the market moved in the milliseconds your order traveled — you get 1.0851, sometimes 1.0853. That slippage of a pip or two sounds trivial until you multiply: on a strategy averaging 0.3R per trade with a 30-pip stop, two pips of slippage per round trip quietly eats about a fifth of the edge. Thin edges that thrived on demo can die of fills alone.",
          "Gap two: spread behavior. Your demo showed EURUSD at 0.8 pips all day. Live, thirty seconds before a rate decision, that spread can stretch to 5 or 10 pips — your stop can be hit by the SPREAD widening, without price itself ever reaching your level. Gap three is the one no simulator can model: the money is real now. The same 1R loss that was a shrug on paper arrives with a heartbeat. Every emotion from Level 7 returns for a live encore, and it is louder than rehearsal.",
        ],
        check: {
          q: "Your live stop got hit but the chart shows price never quite reached your stop level. The likely culprit is…",
          options: [
            "The broker is cheating you",
            "The spread widened around news — the bid or ask touched your stop even though the chart's price didn't",
            "A chart bug — the trade shouldn't count",
          ],
          answer: 1,
          explain: "Stops trigger on bid or ask, not the mid price your chart draws. Around news the spread stretches, and that alone can reach a stop. It's a reason to avoid holding tight stops through red-calendar events.",
        },
      },
      {
        h: "The go-live gate: earn the switch",
        paras: [
          "Going live is not a feeling — it's a gate with written criteria, decided while you're calm. The HeroPips standard gate has three bars. One: at least three consecutive profitable months on paper, through the Level 4 capstone and beyond — not three winning weeks, not one great month; three months is long enough to include losing streaks and at least one market mood change. Two: a written plan that passed Level 8's ambiguity test — setup, risk %, daily stop, session, and review schedule specific enough that a stranger could execute it. Three: a sized-down start committed in advance — first live month at the smallest size your broker allows, or one quarter of your paper size, whichever is smaller.",
          "Why so strict, when the strategy already proved itself? Because the strategy isn't what's untested — you are. Live trading changes exactly one variable: real money and the emotions attached to it. The gate holds everything else constant, so that when week one feels different, you know precisely which variable is responsible. Keep the same guard set running — same risk %, same daily breaker, confirm mode on — because the machine doesn't know or care that the money is real now. That indifference is exactly what you're paying it for.",
        ],
        table: {
          caption: "The go-live gate — all three, no exceptions",
          head: ["Bar", "Standard", "What it proves"],
          rows: [
            ["Track record", "3+ consecutive profitable months on paper", "The edge survives losing streaks and changing market moods"],
            ["Written plan", "Rules a stranger could execute unchanged", "There's a process to follow when emotions arrive"],
            ["Sized-down start", "Broker minimum or 1/4 paper size, whichever is smaller", "The tuition for live lessons is capped at pocket change"],
          ],
        },
        figure: {
          kind: "risk-reward",
          caption: "The geometry doesn't change at the gate: 1R risked against 2R targeted. If your live trades stop looking like this, the trader changed — not the market.",
        },
      },
      {
        h: "First-week protocol, hour by honest hour",
        paras: [
          "Week one live is a laboratory, not a payday. The protocol: minimum size on every trade, no exceptions, even when a setup looks perfect — especially then. One setup only, the pattern your journal ranks as your best-read. Log every fill against the price you clicked: your slippage log is week one's most valuable output, because it measures the real cost of YOUR broker at YOUR trading hours on YOUR pairs — a number no course can give you. And log feelings with the same seriousness: rate the urge to interfere with each open trade from 1 to 5. That column tells you whether the operator is ready for more size; the P&L column, at minimum size, is nearly noise.",
          "Do not raise size in week one under any outcome. Five wins prove little at this sample size — you know that from Level 4 — and raising size on a hot week is exactly the emotional decision the protocol exists to block. The step-up rule, written before you start: size increases one notch only after two consecutive weeks where every trade followed the plan AND slippage-adjusted expectancy tracks paper. Process first, then evidence, then size — in that order, forever.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "What week one should optimize for: the calm curve. At minimum size the dollars are small either way — the discipline pattern you set now is what scales later.",
        },
        callout: {
          tone: "tip",
          title: "The step-back rule",
          body: "Write it before you need it: two consecutive weeks of broken process — not losses, broken PROCESS — and you return to paper for a month. Losses at minimum size cost coffee money. Practiced indiscipline compounds into the expensive kind.",
        },
      },
    ],
    terms: [
      { term: "slippage", def: "The gap between the price you clicked and the price you got. Small per trade, meaningful across hundreds of trades." },
      { term: "spread widening", def: "The bid-ask gap stretching during news or thin hours — it can hit stops even when the chart's mid price never reaches them." },
      { term: "go-live gate", def: "Written criteria — months of paper profit, a plan, a sized-down start — that must all pass before real money is committed." },
      { term: "minimum size", def: "The smallest position your broker allows. The correct size for your first live weeks, whatever the guard set would permit." },
      { term: "slippage log", def: "A record of clicked price versus filled price on every trade — the true cost of your broker at your hours, measured instead of guessed." },
    ],
    quiz: [
      {
        q: "The one variable that going live actually changes is…",
        options: [
          "The strategy's win rate",
          "How charts are drawn",
          "Real money and the emotions attached to it — which is why everything else must stay constant",
          "The pip value of each pair",
        ],
        answer: 2,
        explain: "The gate holds strategy, size rules and guardrails fixed so the one new variable — real-money emotion — can be observed and trained in isolation.",
      },
      {
        q: "Why can slippage kill a strategy that was profitable on demo?",
        options: [
          "Slippage only affects losing trades",
          "A pip or two per round trip is a fixed tax — thin edges measured on perfect demo fills can be smaller than the tax",
          "Brokers add slippage as a penalty for new accounts",
          "It can't — slippage is too small to matter",
        ],
        answer: 1,
        explain: "Edge is measured net of costs. Demo showed the edge before the fill tax; live charges it on every trade. Week one's slippage log measures your actual rate.",
      },
      {
        q: "Which record satisfies the go-live gate's track requirement?",
        options: [
          "One month at +20%",
          "Three winning weeks in a row",
          "A great backtest over five years",
          "Three or more consecutive profitable months of live-style paper trading",
        ],
        answer: 3,
        explain: "Three months is the minimum window that usually includes losing streaks and a market mood change — the conditions that actually test a process.",
      },
      {
        q: "During week one live, your first five trades all win. The protocol says…",
        options: [
          "Stay at minimum size — five trades prove nothing, and raising size on a hot week is the exact impulse the protocol blocks",
          "Double size to capitalize on the streak",
          "Skip to full planned size — the gate is clearly passed",
          "Stop trading to lock in the perfect week",
        ],
        answer: 0,
        explain: "Sample size didn't stop mattering because money got real. Size steps up on the written rule — two clean process weeks plus expectancy tracking paper — never on a streak.",
      },
      {
        q: "The step-back rule returns you to paper trading when…",
        options: [
          "Any single trade loses",
          "Two consecutive weeks show broken process — plan violations, not merely losses",
          "The account is down for the month",
          "A news event causes slippage",
        ],
        answer: 1,
        explain: "Losses at minimum size are cheap tuition. Practiced indiscipline is the expensive thing — the rule targets process failure, which is the one you can actually control.",
      },
    ],
  },

  {
    slug: "prop-firms-and-funded-accounts",
    title: "Prop firms and funded accounts",
    hook: "Trade a firm's $100k instead of your $1k — after reading the fine print like a hero.",
    summary:
      "How prop-firm challenges really work — targets, drawdown rules, verification, payouts — the honest math of pass rates, the traps written into the rules, and when funded trading beats your own capital.",
    sections: [
      {
        h: "The deal on the table",
        paras: [
          "A proprietary trading firm ('prop firm') offers a trade: pay a fee — say $500 — and prove yourself on their simulated challenge account. Pass, and you trade a funded account of $50,000 or $100,000, keeping a split of the profits, commonly 80% yours. For a skilled trader with a small account, the appeal is obvious arithmetic: your edge earning 3% on your own $2,000 makes $60; the same edge on a funded $100,000 makes $3,000, of which you keep $2,400. The firm's pitch is real — capital is the one thing skill can't conjure.",
          "The typical funnel has three stages. Challenge: hit a profit target, usually 8–10%, without breaking two loss rules — a daily drawdown cap (often 5%) and a maximum total drawdown (often 10%). Verification: a second, easier phase — maybe a 5% target, same loss rules — to prove the challenge wasn't one lucky week. Funded: you trade their account under the same drawdown rules forever, and payouts arrive on a schedule, often biweekly or monthly. Break a loss rule at ANY stage, including funded, and the account is gone — fee included.",
        ],
        figure: {
          kind: "prop-funnel",
          caption: "The funnel narrows at every stage: many enter the challenge, fewer verify, fewer still get funded — and payouts only flow at the narrow end.",
        },
        check: {
          q: "In a typical prop challenge, breaking the daily drawdown limit once means…",
          options: [
            "A warning and a restart of that day",
            "The challenge is failed and the fee is spent — regardless of how profitable you were before",
            "The profit target increases as a penalty",
          ],
          answer: 1,
          explain: "Drawdown rules are hard boundaries, not suggestions. One breach ends the attempt — which is exactly why the risk discipline from Level 2 is the real entry ticket.",
        },
      },
      {
        h: "The honest math of pass rates",
        paras: [
          "Here is the number prop ads never lead with: industry disclosures and firm-published statistics put challenge pass rates roughly in the single digits to low teens — and traders who both pass AND collect multiple payouts are rarer still. That's not automatically a scam; it's the business model. Most revenue for many firms comes from challenge fees, not from a share of star traders' profits. You are not the customer of a capital provider — you are, statistically, the product of a testing business. Enter with that lens and the fine print starts making sense.",
          "Now the math that decides whether YOU should enter. A 10% target under a 5% daily cap means you must be able to string together roughly +10R to +20R of performance (depending on your risk per trade) without any single day reaching −5%. At 1% risk per trade, hitting +10% needs about ten net winning R — a reasonable month for a proven strategy, an impossible demand for an unproven one. And mind the deadline trap: many challenges impose 30-day limits, which quietly pressure you to raise risk beyond your plan. A time limit plus a drawdown cap is a vise: rush and you break the floor; wait and you miss the deadline. Firms without time limits remove one jaw of the vise — worth paying more for.",
        ],
        callout: {
          tone: "warn",
          title: "Run the expected-value math before paying",
          body: "A $500 fee with a realistic 10% personal pass chance prices each attempt at an expected $5,000 of fees per funded account. If your paper record wouldn't pass the challenge rules retroactively — apply them to your last three months and check — the fee is a donation, not an investment.",
        },
      },
      {
        h: "Evaluation traps hiding in the rules",
        paras: [
          "The rulebook is where challenges are actually won and lost, so read all of it before paying. Trap one: how daily drawdown is measured. Many firms count FLOATING losses — if your open trade dips 5.1% intraday and then recovers to close green, you failed while being right. Trap two: consistency rules — some firms cap any single day at, say, 40% of total profit, so one great day can invalidate an otherwise passing run. Trap three: banned tactics — trading through red-calendar news, holding over weekends, or copying trades across accounts can void a funded account after the fact, sometimes with profits confiscated. Trap four: scaling plans that reset — some firms shrink your drawdown allowance as your balance grows, making the account more fragile exactly when you're doing well.",
          "None of these traps are illegal, and the reputable firms print every one of them plainly. The professional response is the same one you'd give any signal source from Level 8: audit before trusting. Read the rules like an engineer reading a contract, restate them in your own words, and back-test YOUR strategy against THEIR rulebook. A strategy that earns 4% a month with 6% intraday swings passes some firms' rules and fails others' — identical trading, opposite outcomes, decided entirely by fine print.",
        ],
        table: {
          caption: "Fine-print traps and the question that exposes each",
          head: ["Trap", "Ask before paying"],
          rows: [
            ["Floating drawdown", "Do open-trade losses count against the daily cap, or only closed ones?"],
            ["Consistency rule", "Is there a cap on how much one day may contribute to the target?"],
            ["Banned tactics", "Are news trading, weekend holds, or automation restricted — and is my strategy affected?"],
            ["Time limit", "Is there a deadline, and would my paper pace have met it without raising risk?"],
            ["Scaling resets", "Do drawdown allowances shrink or reset as the account grows?"],
          ],
        },
        check: {
          q: "Your open trade dips to −5.2% intraday, then recovers to close the day +1%. Under floating-drawdown rules, your challenge is…",
          options: [
            "Passed for the day — it closed green",
            "Paused until the firm reviews it",
            "Failed — the floating loss crossed the daily cap, even though the trade recovered",
          ],
          answer: 2,
          explain: "Floating rules mark the worst moment of your day, not the end of it. Under them, position size must keep intraday swings inside the cap — not just closed results.",
        },
      },
      {
        h: "Prop versus your own capital — and how payouts actually work",
        paras: [
          "When does prop make sense? When three things are already true: you have a PROVEN process (the go-live gate from the last lesson, passed), your own capital is genuinely small (the funded-size arithmetic only helps if $100k versus $2k is your real situation), and your discipline is strong enough to trade inside someone else's drawdown rules — which are usually tighter than your own. When does your own capital win? When you value freedom: no time limits, no banned tactics, no consistency rules, no firm that can change terms, and 100% of profits instead of 80%. Many pros do both — own capital for freedom, funded accounts as cheap leverage on a proven edge.",
          "Payout mechanics deserve the same scrutiny as entry rules. Typical: profit splits of 70–90% in your favor, payouts on request after a minimum period (biweekly or monthly), often a minimum profit threshold per payout, and — read this line twice in any contract — some firms refund your challenge fee with the first payout while others don't. The professional habit: request payouts on schedule rather than compounding the funded account indefinitely. A funded account can be terminated by rule changes or a single drawdown breach; profits paid out are yours forever. Extracted money is real money — a theme the next lesson turns into a system.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "Two funded journeys, same edge: the disciplined curve stays above the max-drawdown floor and reaches payouts; the rushed one touches the floor once — and the account ends there.",
        },
      },
    ],
    terms: [
      { term: "prop firm", def: "A company that lets traders trade the firm's capital for a profit split — usually after passing a paid evaluation challenge." },
      { term: "challenge", def: "The evaluation phase: hit a profit target (often 8–10%) without breaching daily or maximum drawdown limits." },
      { term: "daily drawdown", def: "The most your account may lose in one day — often counting open-trade (floating) losses, not just closed ones." },
      { term: "max drawdown", def: "The total loss limit from the starting balance or high-water mark. Touch it once and the account is over." },
      { term: "profit split", def: "How funded profits divide between trader and firm — commonly 80/20 in the trader's favor." },
      { term: "payout", def: "The scheduled transfer of your profit share out of the funded account. Paid-out money can no longer be lost to a rule breach." },
    ],
    quiz: [
      {
        q: "The standard three-stage prop funnel is…",
        options: [
          "Interview → salary → bonus",
          "Challenge (hit target within drawdown rules) → verification → funded account with profit splits",
          "Deposit → leverage upgrade → withdrawal",
          "Demo → live → guaranteed funding after one profitable month",
        ],
        answer: 1,
        explain: "Each stage keeps the same loss rules and narrows the funnel. Only the funded stage pays — and one drawdown breach at any stage ends the run.",
      },
      {
        q: "Most prop firms primarily earn revenue from…",
        options: [
          "Their share of funded traders' profits",
          "Broker commissions on trades",
          "Challenge fees paid by the large majority who don't pass",
          "Selling trading courses",
        ],
        answer: 2,
        explain: "With pass rates roughly in the single digits to low teens, fees are the engine. Knowing whose product you are is the first step to reading the rules correctly.",
      },
      {
        q: "A 30-day time limit combined with a 5% daily drawdown cap is dangerous because…",
        options: [
          "It creates a vise: the deadline pressures you to raise risk, and raised risk is what breaks the drawdown floor",
          "Thirty days is too short to place any trades",
          "Daily caps only apply in the first week",
          "It forces you to trade during news events",
        ],
        answer: 0,
        explain: "The two rules pull in opposite directions on your risk per trade. Firms without deadlines remove one jaw of the vise — a rulebook detail worth paying extra for.",
      },
      {
        q: "Funded trading makes MORE sense than your own capital when…",
        options: [
          "You're still developing a strategy and want practice",
          "You want to trade without any drawdown rules",
          "You've never traded live but feel confident",
          "Your process is proven, your own capital is small, and you can operate inside tighter drawdown rules than your own",
        ],
        answer: 3,
        explain: "Prop is leverage on a PROVEN edge for the under-capitalized. For the unproven, the challenge fee just buys an expensive, deadline-pressured exam.",
      },
      {
        q: "Why request payouts on schedule instead of compounding a funded account indefinitely?",
        options: [
          "Payouts improve your challenge statistics",
          "The account can end via one drawdown breach or a rule change — paid-out profits are the only part that's permanently yours",
          "Firms pay bonuses for frequent withdrawals",
          "Compounding is banned by all prop firms",
        ],
        answer: 1,
        explain: "A funded balance is conditional money; a payout is real money. Extract on schedule — the same withdrawal discipline the next lesson applies to your own account.",
      },
    ],
  },

  {
    slug: "scale-survive-repeat",
    title: "Scale, survive, repeat",
    hook: "3% a month sounds boring — until you watch it triple an account in three years.",
    summary:
      "Compounding at honest rates with the real math table, withdrawal discipline that makes profits permanent, scaling rules tied to equity milestones, and the one-year hero plan into Hero Council.",
    sections: [
      {
        h: "The honest compounding table",
        paras: [
          "Social media sells 100%-a-month fantasies; the traders still standing in year five compound single digits monthly. So let's do the unfashionable math. $10,000 growing at 3% per month — a demanding but defensible target for a proven process — compounds because each month's 3% is earned on a slightly bigger base. Month one earns $300; by year three each month earns over $800 for the SAME performance. Run the table and the shape appears: roughly +43% after year one, doubled during year two, nearly tripled by the end of year three. No hot streaks, no leverage heroics — the same boring 3%, thirty-six times.",
          "Now the honesty clause that makes the table real: no strategy prints 3% every single month. Real equity arrives lumpy — +7%, −2%, +4%, −1% — and the table only holds if the losing months stay SMALL, which is the entire risk curriculum in one sentence. This is also your shield against every 'double your money monthly' pitch you will ever see: anyone who could genuinely compound 100% monthly would run $10,000 past the size of the world's largest funds within three years. The pitch isn't ambitious — it's arithmetically absurd, and now you can prove it on a napkin.",
        ],
        table: {
          caption: "$10,000 at 3% per month — the honest three-year table",
          head: ["Checkpoint", "Balance", "Growth so far"],
          rows: [
            ["Start", "$10,000", "—"],
            ["Month 6", "$11,941", "+19%"],
            ["Month 12", "$14,258", "+43%"],
            ["Month 18", "$17,024", "+70%"],
            ["Month 24", "$20,328", "+103%"],
            ["Month 30", "$24,273", "+143%"],
            ["Month 36", "$28,983", "+190%"],
          ],
        },
        figure: {
          kind: "compounding-curve",
          caption: "The curve bends upward late: the first year looks flat, the third accelerates. Quitters leave during the flat part — the bend only pays those still executing.",
        },
        check: {
          q: "At 3% monthly compounding, why does month 36 earn far more dollars than month 1 at the same 3%?",
          options: [
            "The strategy improves with age",
            "Each month's 3% is earned on a base grown by all previous months — month 36's base is nearly triple month 1's",
            "Brokers raise payouts for loyal accounts",
          ],
          answer: 1,
          explain: "Same percentage, bigger base. That's all compounding is — and why protecting the base (small losing months) matters more than stretching the percentage.",
        },
      },
      {
        h: "Withdrawal discipline: pay the hero",
        paras: [
          "Money that never leaves the account isn't income — it's a scoreboard that can still go down. Withdrawal discipline converts scoreboard into salary on a schedule you set in advance: a common rule is to withdraw a fixed fraction — say 30% of net profits — at each quarter's end, letting the rest compound. On the table above, that slows the curve slightly, and buys three things worth more than the difference: proof (money that reached your bank has settled the 'is this real?' question forever), pressure relief (a trader who has already been paid trades the next drawdown calmly), and ruin insurance (capital outside the account cannot be lost inside it).",
          "Write the rule before the first profitable quarter, because afterwards both temptations get loud at once: compound everything ('the curve!') or spend everything ('I earned it!'). The percentage matters less than the automaticity — 20% or 40% quarterly both work; deciding fresh each quarter under emotion doesn't. This is the same move you've made all academy long: replace an in-the-moment decision with a pre-made rule, then let the rule take the heat.",
        ],
        callout: {
          tone: "story",
          title: "The two traders, one year later",
          body: "Two traders, same edge, same year. One compounded everything and met a 15% drawdown with every dollar still on the table — and quit inside it. The other had withdrawn quarterly, met the same drawdown with a season of salary already banked, and traded straight through it. Same market. Different survival.",
        },
      },
      {
        h: "Scaling rules tied to equity, not emotion",
        paras: [
          "Here's the quiet elegance of percent-based risk: it already scales. Risking 1% of $10,000 is $100 per trade; after the account grows to $15,000, the same 1% is $150 — a 50% raise in position size with zero new decisions and zero new risk of ruin. Most traders need no scaling system beyond letting that arithmetic breathe. What DOES need rules is everything you might be tempted to change at milestones: raising the risk percentage itself, adding pairs, adding strategies. Tie those to equity milestones with review gates — for example: at each +25% equity milestone, run a full journal review, and only alter risk percent or scope if three months of process metrics are clean. The milestone triggers a REVIEW, never an automatic raise.",
          "Scaling down, by contrast, should be automatic and instant. Pick your drawdown steps in advance — a classic set: at −10% from equity peak, cut risk per trade in half; at −15%, halve again and drop to your single best setup; at −20%, stop and audit for a full week before another order. Notice the asymmetry, and notice it's deliberate: scaling up waits for calm review; scaling down happens the moment a threshold is touched, with Trade Guard enforcing the new caps so 'just one normal-size trade to get it back' is not an option. Drawdowns are when your judgment is worst — which is exactly when pre-made rules must be strongest.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "A survivable equity path isn't a straight line — it's shallow drawdowns met by automatic de-risking, so every dip stays small enough to compound back out of.",
        },
      },
      {
        h: "The one-year hero plan — and what graduation unlocks",
        paras: [
          "Assemble the whole academy into twelve months. Months 1–3: pass the go-live gate and trade live at minimum size — one setup, slippage log, weekly reviews; the only goal is clean process. Months 4–6: first size step after two clean process weeks tracking paper expectancy; write your withdrawal rule; if funded trading fits your situation, back-test your strategy against a specific firm's rulebook before paying any fee. Months 7–9: steady percent-risk compounding; first scheduled withdrawal — make some profit permanently real; run your first +25% milestone review if equity is there. Months 10–12: full annual audit against the plan you wrote at month zero; decide next year's scope — same edge at growing size beats new edges at random size, almost every time. Nothing in the plan is a profit promise; every line is a process commitment, which is the only kind of commitment a trader can actually keep.",
          "And you don't run the year alone. Every level you completed in this academy already unlocked that level's monthly live workshop — you've been collecting rooms as you climbed. Completing all ten levels unlocks the top one: Hero Council, the monthly live masterclass, free for your first 12 months as a graduate. From there, the ladder grows by lifting others: invite traders, and each invitee who completes Level 5 becomes a qualified referral — someone you helped carry through the entire risk curriculum, not a signup statistic. Five qualified referrals add 3 months of Hero Council; twenty-five add 12 months; one hundred make it lifetime. The graduation logic is the academy's thesis in miniature: the skill compounds, the account compounds, and if you teach what you learned, the access compounds too.",
        ],
        callout: {
          tone: "tip",
          title: "Qualified means Level 5, not signed up",
          body: "A referral counts when your invitee COMPLETES Level 5 — the full risk-management spine of the academy. The ladder rewards building traders who survive: 5 qualified referrals = +3 months of Hero Council, 25 = +12 months, 100 = lifetime access.",
        },
      },
    ],
    terms: [
      { term: "compounding", def: "Earning returns on previous returns — the same monthly percentage producing growing dollar amounts as the base expands." },
      { term: "withdrawal discipline", def: "A pre-written rule for moving a fixed share of profits out of the account on schedule — converting scoreboard into settled money." },
      { term: "equity milestone", def: "A pre-set account level (e.g. +25% from start) that triggers a structured review — never an automatic risk increase." },
      { term: "drawdown step", def: "A pre-set loss threshold from equity peak that automatically cuts risk — half size at −10%, and tighter from there." },
      { term: "qualified referral", def: "An invitee who completes Level 5 of the academy. The unit the Hero Council referral ladder counts — 5, 25, and 100 unlock growing access." },
      { term: "Hero Council", def: "The monthly live masterclass unlocked by completing all ten levels — free for 12 months at graduation, extendable through qualified referrals." },
    ],
    quiz: [
      {
        q: "$10,000 compounding at an honest 3% per month becomes roughly what after three years?",
        options: [
          "About $11,000 — barely ahead of a savings account",
          "About $29,000 — nearly tripled, from the same boring 3% repeated 36 times",
          "About $1,000,000 — compounding is explosive",
          "It can't be estimated without knowing the win rate",
        ],
        answer: 1,
        explain: "1.03 to the 36th power is about 2.9. Unfashionable monthly rates triple accounts over years — while '100% monthly' pitches fail on a napkin: they'd outgrow the largest funds on Earth within three years.",
      },
      {
        q: "The main purpose of a pre-written withdrawal rule is…",
        options: [
          "To reduce taxes on trading profits",
          "To make the account grow faster",
          "To make part of the profit permanently real and un-losable, on a schedule emotion can't renegotiate",
          "To satisfy broker requirements",
        ],
        answer: 2,
        explain: "Withdrawn money is settled proof and ruin insurance. It slows the curve slightly and buys the calm that keeps you executing through drawdowns — a trade worth making.",
      },
      {
        q: "Your account falls 10% from its equity peak. The scaling framework in this lesson says…",
        options: [
          "Raise risk to recover the drawdown faster",
          "Wait for the next quarterly review before changing anything",
          "Withdraw the remaining balance",
          "Cut risk per trade in half immediately — scaling down is automatic at pre-set thresholds, scaling up waits for calm review",
        ],
        answer: 3,
        explain: "The asymmetry is the design: de-risking triggers instantly at thresholds because drawdowns degrade judgment; risk increases only ever follow a clean milestone review.",
      },
      {
        q: "In the Hero Council referral ladder, a referral becomes 'qualified' when your invitee…",
        options: [
          "Creates an account with your link",
          "Completes their first lesson",
          "Completes Level 5 — the risk-management spine of the academy",
          "Makes their first live trade",
        ],
        answer: 2,
        explain: "The ladder counts traders you helped build, not clicks: invitees who finish Level 5. Then 5 qualified referrals add 3 months of Hero Council, 25 add 12 months, and 100 make it lifetime.",
      },
    ],
  },
] as const;
