/* =========================================================================
 * Level 8 — Trade With the Machine. Decision intelligence, automation and guardrails — let machines hold the line
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_8: readonly LessonContent[] = [
  {
    slug: "automation-and-guardrails",
    title: "Automation and guardrails",
    hook: "Your plan is only as strong as whatever enforces it at 2am.",
    summary:
      "How to turn a written trading plan into enforced rules: what belongs to software, what stays with judgment, the guard set that protects every trade, and how to go live without blowing up.",
    sections: [
      {
        h: "A plan on paper is a wish. A plan in software is a rule.",
        paras: [
          "Level 2 taught you to write the plan: risk per trade, stop placement, daily limits. Here's the uncomfortable truth from the last lesson — the plan's weakest component is its enforcer. On a calm Tuesday you follow it perfectly. Two losses into a fast market, the same plan becomes a negotiation, and you already know who wins those.",
          "The fix is to move enforcement out of your head. Automation, in this context, doesn't mean a robot that finds trades for you — it means your own written rules, executed by software that cannot be argued with. A guardrail is any rule that runs before an order reaches the market: if the order violates the rule, it never exists. You still drive; the guardrails just make certain classes of crash impossible.",
        ],
        check: {
          q: "When does a guardrail do its job?",
          options: [
            "After a losing trade closes, by analyzing what went wrong",
            "Before the order reaches the market — a rule-breaking order never exists",
            "Once a month, during the strategy review",
          ],
          answer: 1,
          explain: "Guardrails are pre-trade checks. Anything that only complains after the damage is a report, not a guardrail.",
        },
      },
      {
        h: "What to automate, what to keep as judgment",
        paras: [
          "The split is clean once you see it: anything that is arithmetic belongs to software; anything that is pattern-reading stays with you. Position sizing is arithmetic — equity × risk% ÷ stop distance has exactly one correct answer, so a human recomputing it per trade adds only error and temptation. Stop placement relative to your entry is arithmetic once the structure is chosen. Breaker halts — daily stop, drawdown lock — are pure threshold checks, the exact decisions tilt corrupts first.",
          "Setup quality is the opposite. Is this pullback a higher low or a rollover? Is the range worth fading today? That judgment is the skill you've built across five levels, and it's the part that should consume 100% of your attention — because it's the only part software can't do for you. The division of labor: you decide IF and WHERE. The machine decides HOW MUCH and enforces WHEN TO STOP.",
        ],
        table: {
          caption: "The guard set, as it runs in HeroPips Trade Guard",
          head: ["Guardrail", "Parameter", "What it prevents"],
          rows: [
            ["Risk-% sizing", "max_risk: 1.0% equity / trade", "Oversized positions — size is computed from stop distance, so no single trade can lose more than the fraction you set"],
            ["Daily loss breaker", "daily_stop: −3.0% equity", "The revenge spiral — trading halts for the day when realized plus open losses cross the line"],
            ["Concurrent positions", "max_open: 3 trades", "Stacked correlated risk — three open EUR trades are closer to one triple-size trade than three ideas"],
            ["Cooldown after loss", "walk-away window", "The instant re-entry — new orders are rejected until the pause your tilted self would never take"],
          ],
        },
        figure: {
          kind: "automation-pipeline",
          caption: "Every order walks the same corridor: data feeds a signal, the guardrail inspects it, only then does an order exist — and the journal records all of it.",
        },
      },
      {
        h: "Going live: gradually is the only speed",
        paras: [
          "You've proven a positive expectancy on paper in Level 4. Going live changes one variable — real money makes every emotion in the last lesson louder — so change nothing else. Start at the smallest size your broker allows, even if the guard set permits more: the first weeks of live trading are for verifying that YOU still execute the process when it's real, not for earning. Trade one setup, the single pattern your journal says you read best, and let every other lesson in this academy wait on the sidelines.",
          "Review weekly, not nightly. A week is enough trades to see process; a night is just outcome noise wearing a lesson's costume. Each week ask two questions: did every trade follow the plan (process), and is expectancy still tracking your paper results (evidence)? Only after several clean weeks of both does size step up — one notch.",
          "Here is the hero's definition of edge, and it's deliberately boring: a small statistical advantage, executed the same way hundreds of times, protected by guardrails from the one bad hour that would otherwise erase it. Not a secret indicator. Not a hot streak. Boring consistency, compounded. The traders who last are almost never the most brilliant — they're the most repeatable.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "Two accounts, same strategy: the guarded one dips and recovers; the unguarded one meets its one bad hour. The breaker is the difference between the curves.",
        },
        callout: {
          tone: "warn",
          title: "What automation is — and is not",
          body: "Automation enforces discipline; it does not create profits. Guardrails cap what a bad day can cost — they cannot make a strategy without an edge profitable, and no honest tool will claim otherwise. Trading involves substantial risk of loss.",
        },
      },
    ],
    terms: [
      { term: "automation", def: "Your own written rules executed by software — sizing, halts, order checks — rather than by in-the-moment willpower." },
      { term: "guardrail", def: "A rule that runs before an order reaches the market and blocks it if a limit would be violated." },
      { term: "cooldown", def: "A forced pause after a loss during which new orders are rejected — the walk-away rule as software." },
      { term: "going live", def: "The switch from paper to real money — done at minimum size, one setup, with weekly process reviews." },
      { term: "consistency", def: "Executing the same edge the same way, trade after trade. The boring property that actually compounds." },
    ],
    quiz: [
      {
        q: "In a well-built trading operation, position sizing is handled by software because…",
        options: [
          "Sizing math is too hard for humans",
          "It's arithmetic with one correct answer — a human recomputing it adds only error and temptation",
          "Brokers require automated sizing",
          "It makes entries execute faster",
        ],
        answer: 1,
        explain: "Equity × risk% ÷ stop distance has exactly one right answer. The value of automating it is that a tilted human can no longer 'adjust' it.",
      },
      {
        q: "Which of these should stay with human judgment rather than automation?",
        options: [
          "Position size for a given stop distance",
          "Halting after the daily loss limit",
          "Judging whether a setup is actually worth taking",
          "Rejecting a fourth concurrent position",
        ],
        answer: 2,
        explain: "Setup quality is pattern-reading — the skill you trained. Everything arithmetic around it (size, halts, caps) belongs to the machine.",
      },
      {
        q: "Why cap concurrent open positions at all?",
        options: [
          "Exchanges limit simultaneous orders",
          "More positions cost more spread",
          "Watching many trades is stressful",
          "Correlated positions stack into one oversized bet — three EUR longs act like one triple-size trade",
        ],
        answer: 3,
        explain: "max_open exists because correlation quietly multiplies risk: several 1% trades in the same direction can behave like a single 3% trade.",
      },
      {
        q: "The right way to go live after a successful paper capstone is…",
        options: [
          "Smallest size, one setup, weekly process reviews — size steps up only after clean weeks",
          "Full planned size immediately — paper results proved the edge",
          "Live only during high-volatility news for faster feedback",
          "Skip live and stay on paper until the win rate reaches 80%",
        ],
        answer: 0,
        explain: "Live trading changes one variable: emotion. Minimum size isolates it — you're verifying the operator first, the P&L later.",
      },
      {
        q: "Which claim about automation is honest?",
        options: [
          "It turns losing strategies profitable",
          "It removes the risk of loss",
          "It enforces discipline — caps what a bad day costs — but creates no profits by itself",
          "It replaces the need to learn to read price",
        ],
        answer: 2,
        explain: "Guardrails are brakes, not an engine. They protect an edge from your worst hour; they cannot manufacture an edge that isn't there.",
      },
    ],
  },

  {
    slug: "decision-intelligence-not-tips",
    title: "Decision intelligence, not tips",
    hook: "An arrow says buy. A brief says why, where, how much — and what would prove it wrong.",
    summary:
      "Why bare buy/sell signals are gambling with extra steps, what a complete decision brief contains, how to disagree with a signal profitably, and an honest checklist for judging any signal source.",
    sections: [
      {
        h: "The tip economy runs on hope",
        paras: [
          "Somewhere right now a chat group is posting a green arrow: BUY GOLD NOW. No entry zone, no stop, no size, no reasoning. Followers pile in, and here's the trap you can now see that they can't: without a stop there is no stop distance, and without a stop distance the position-size formula from Level 2 has nothing to divide by. A tip doesn't just hide the reasoning — it makes risk management mathematically impossible. Whatever follows isn't trading; it's betting with someone else's confidence.",
          "The tip economy survives on two tricks. First, unfalsifiability: 'buy gold' with no stop and no timeframe can always be declared right eventually — price will touch almost any level if you wait long enough. Second, survivorship: winners get screenshotted and pinned, losers get quietly deleted. After seven levels of keeping an honest journal, you know exactly why a feed of only winners is a red flag, not a résumé.",
        ],
        check: {
          q: "A signal with no stop loss attached is unusable mainly because…",
          options: [
            "It might still be a losing trade",
            "Without a stop distance you cannot compute position size — risk control is impossible from the start",
            "Stops are legally required",
          ],
          answer: 1,
          explain: "Size = equity × risk% ÷ stop distance. No stop, no denominator, no risk math. Everything else about the tip is secondary to that.",
        },
      },
      {
        h: "Anatomy of a real decision brief",
        paras: [
          "Decision intelligence is the opposite of a tip: a full argument you can inspect, size, and disagree with. A complete brief — the format HeroPips briefs use, and the format you should demand from any source including your own journal entries — carries seven parts: direction, entry zone, stop, R-multiple targets, a confidence score, the reasoning, and the model version that produced it.",
          "A concrete one: EURUSD long, entry zone 1.0845–1.0855, stop 1.0820 (30 pips below entry midpoint), targets at 1R = 1.0880 and 2R = 1.0910, confidence 62%, reasoning: higher low held at the daily demand zone, London session momentum aligned, no red-calendar news for six hours. Model v4.2. Every claim in that brief is checkable, and every number feeds directly into the risk math you already know. Confidence of 62% is not a promise — it says roughly 4 of 10 of these setups are expected to fail, which is exactly why the stop and the R-targets exist.",
          "The model version matters more than beginners think. A source that says 'model v4.2, changelog attached' is telling you its reasoning can be audited and its history can't be quietly rewritten. A source with no versioning can swap methods after every losing streak and pretend it was one strategy all along.",
        ],
        figure: {
          kind: "confluence-stack",
          caption: "The reasoning section of a brief is a confluence stack: independent reasons — structure, zone, session, calendar — each adding weight to one decision.",
        },
        check: {
          q: "A brief shows confidence 62%. The honest reading is…",
          options: [
            "This trade will win",
            "Take double size — it's above 50%",
            "Roughly 4 in 10 such setups are expected to fail — which is why the stop and targets are part of the brief",
          ],
          answer: 2,
          explain: "Confidence is a base rate, not a promise. It helps you compare setups; the stop is still what protects you when this one lands in the losing 38%.",
        },
      },
      {
        h: "How to disagree with a signal — profitably",
        paras: [
          "A brief is an input, not an order. You are the trader; the machine is the analyst handing you a well-argued memo. Sometimes you'll read the reasoning and see something the model can't weigh — a central-bank speech in an hour, a level your own analysis marks as stronger than the model's zone. Skipping the trade is a legitimate position, and a good journal entry records skips with reasons, so you can later check whether your vetoes added or subtracted value. That last part is the honest bit most traders skip: disagreement is only skill if you audit it.",
          "This is why serious automation is consent-gated instead of all-or-nothing. In notify mode, briefs arrive and you do everything manually — full judgment, machine as researcher. In confirm mode, the machine prepares the sized, guarded order and waits for your explicit yes — judgment stays, arithmetic and execution are handled. In full-auto, rules you approved in advance execute within Trade Guard limits — used only for strategies you've already proven you don't need to second-guess. Most traders should live in confirm mode for a long time: it keeps the human veto exactly where human judgment still beats the machine.",
        ],
        figure: {
          kind: "automation-pipeline",
          caption: "The consent gate sits between signal and order: notify stops the pipeline at your screen, confirm waits for your yes, full-auto runs it under guardrails.",
        },
        callout: {
          tone: "tip",
          title: "Your veto is a strategy — measure it",
          body: "Log every brief you skip and why. After 30 skips, compare: did the skipped trades perform worse than the ones you took? If yes, your judgment is adding edge. If no, your 'intuition' is costing money — also worth knowing.",
        },
      },
      {
        h: "The honest checklist for any signal source",
        paras: [
          "Whether it's an AI platform, a paid group, or a friend's spreadsheet, run the same audit. Does every signal include a stop and an entry zone — can you even size it? Is the full history public, losers included, before you subscribed? Does the R math hold — do published results survive being restated in R-multiples instead of dollar screenshots? Does the source define in advance what would make each signal wrong? Is there a versioned method with a changelog, or does the strategy quietly mutate after drawdowns?",
          "A source that fails the checklist isn't necessarily fraudulent — but it is unauditable, and unauditable means you'd be trading on faith. You spent seven levels replacing faith with process. Don't hand the process back at the last step. And note the checklist doesn't exempt anyone: HeroPips briefs are built to pass it precisely because 'trust us' is not a reason a trained trader should ever accept.",
        ],
        callout: {
          tone: "warn",
          title: "No signal source removes risk",
          body: "The best possible brief is a well-reasoned probability, not a prediction. Any source claiming near-certain wins is describing a fantasy, whatever technology it says is under the hood. Education, not financial advice — always.",
        },
      },
    ],
    terms: [
      { term: "decision brief", def: "A complete trade argument: direction, entry zone, stop, R-targets, confidence, reasoning, and model version — everything needed to size, take, or reject the trade." },
      { term: "confidence score", def: "The model's estimated base rate for a setup — a probability to compare setups with, never a promise about one trade." },
      { term: "model version", def: "The audited identity of the method that produced a signal. Versioning means history can't be quietly rewritten after losses." },
      { term: "consent gate", def: "The setting that decides how far automation may go without you: notify (research only), confirm (waits for your yes), full-auto (pre-approved rules under guardrails)." },
      { term: "survivorship bias", def: "Judging a source by the winners it shows while the losers get deleted — the tip economy's favorite trick." },
    ],
    quiz: [
      {
        q: "The deepest problem with a bare 'BUY NOW' arrow is that…",
        options: [
          "It might be wrong about direction",
          "It arrives too slowly to act on",
          "With no stop there's no stop distance, so position sizing and risk control are impossible",
          "It doesn't say which broker to use",
        ],
        answer: 2,
        explain: "Being wrong is normal — the risk math handles that. A tip without a stop breaks the risk math itself, which no win rate can fix.",
      },
      {
        q: "Which set of parts makes a signal a complete decision brief?",
        options: [
          "Direction, a motivational quote, and a screenshot of past wins",
          "Direction, entry zone, stop, R-targets, confidence, reasoning, model version",
          "Direction, leverage recommendation, and a countdown timer",
          "Entry price and a promised profit figure",
        ],
        answer: 1,
        explain: "Seven parts, all checkable, all feeding the risk math. Anything less is a tip wearing a suit.",
      },
      {
        q: "In confirm mode, consent-gated automation…",
        options: [
          "Executes any signal instantly to avoid slippage",
          "Only sends you research reports with no order preparation",
          "Trades on its own but emails you afterwards",
          "Prepares the sized, guarded order and waits for your explicit yes",
        ],
        answer: 3,
        explain: "Confirm mode splits the labor exactly along the line from the last lesson: machine does arithmetic and preparation, human keeps the final judgment.",
      },
      {
        q: "You skip a brief because of a news event the model didn't weigh. The professional follow-up is…",
        options: [
          "Log the skip and its reason, then periodically audit whether your vetoes outperform",
          "Nothing — skipped trades don't matter",
          "Unsubscribe from the signal source",
          "Take the trade anyway at half size to hedge your doubt",
        ],
        answer: 0,
        explain: "Disagreement is only skill if it's measured. A skip journal tells you whether your judgment adds edge or subtracts it — both answers are valuable.",
      },
      {
        q: "A signal seller shows a feed of screenshots — every single one a winner. Your trained reaction is…",
        options: [
          "Impressive consistency — worth paying for",
          "Survivorship red flag: losers were likely deleted, and an unauditable history means trading on faith",
          "Winners are all that matters in trading",
          "Ask for the same signals at a discount",
        ],
        answer: 1,
        explain: "Every real strategy has losers — you've journaled your own. A history with none isn't evidence of skill; it's evidence of curation.",
      },
    ],
  },

  {
    slug: "from-rules-to-robots",
    title: "From rules to robots",
    hook: "A robot is your discipline, photocopied — including the flaws.",
    summary:
      "The pipeline from written strategy to guarded live robot: what machines genuinely do better, where they fail, and the monitoring that keeps an automated strategy from quietly amplifying a mistake.",
    sections: [
      {
        h: "The pipeline: strategy → code → paper → guarded live",
        paras: [
          "Every legitimate robot starts life as the written strategy you built in Level 4 — and the first step exposes most strategies as unfinished. The ambiguity test: if two programmers would code your rule differently, it isn't a rule yet. 'Buy the pullback in an uptrend' fails the test. 'Enter long when price closes above the previous candle's high after touching the zone between the 20-period average and the last higher low, during London hours' passes — a machine can execute it, which also means YOU could have executed it identically every time. Writing rules for a machine is secretly the best strategy audit there is.",
          "Then the pipeline runs in one direction only: coded rules → paper robot → guarded live robot. The paper robot phase is non-negotiable and longer than feels necessary — you're not testing whether the strategy wins (the backtest suggested that), you're testing whether the code does what the sentences meant. Off-by-one candle indexing, sessions in the wrong timezone, sizing that rounds the wrong way: paper is where those bugs cost nothing. Only after the paper robot's results track the backtest does it graduate to live — at minimum size, inside the full Trade Guard set, in confirm mode before it ever earns full-auto.",
        ],
        figure: {
          kind: "automation-pipeline",
          caption: "One-way pipeline: data → signal → guardrail → order → journal. A robot that skips the guardrail stage isn't automation — it's an unsupervised intern with your account keys.",
        },
        check: {
          q: "The 'two programmers' test says a strategy rule is ready to automate when…",
          options: [
            "It has been profitable for a month",
            "Any two programmers would code it identically — zero interpretation left",
            "It uses at least three indicators",
          ],
          answer: 1,
          explain: "Ambiguity is where discretion hides. If humans could interpret the rule differently, the robot is executing one interpretation — maybe not the one you backtested.",
        },
      },
      {
        h: "What machines do better — and what they do worse",
        paras: [
          "Be precise about the trade you're making. Machines are better at consistency: the robot takes the 4am setup with exactly the same size and stop as the 2pm one, no fatigue, no tilt, no revenge spiral — the whole emotion cycle from Level 7 simply doesn't apply. They're better at speed and coverage: a rule can watch seven pairs across every session without blinking. And they never 'just this once' the risk limits.",
          "Machines are worse at exactly what you'd guess after seven levels: context. A rule tuned on two years of ranging EURUSD will keep firing its range-fade entries when a central-bank surprise turns the market into a one-way trend — a regime shift — and it will do so with perfect discipline, which is the problem. Black-swan days, broken data feeds, a spread that blows out to 20 pips at a flash crash: the robot doesn't know anything is strange unless a rule told it what strange looks like. Humans notice weird. Robots execute confidently into it.",
        ],
        table: {
          caption: "The honest division of strengths",
          head: ["Dimension", "Machine", "Human"],
          rows: [
            ["Consistency", "Identical execution, trade 1 and trade 1,000", "Degrades with fatigue, tilt, boredom"],
            ["Speed and coverage", "Every pair, every session, instantly", "One chart at a time, awake hours only"],
            ["Emotions", "None — no fear, no revenge, no FOMO", "The entire Level 7 curriculum"],
            ["Regime shifts", "Executes old rules confidently into a new market", "Can notice 'this feels different' and stand aside"],
            ["Broken inputs", "Trades bad data as if it were true", "Spots a frozen feed or absurd spread at a glance"],
          ],
        },
      },
      {
        h: "Monitoring: the robot is a junior employee, not a retirement plan",
        paras: [
          "'Set and forget' is how automated accounts die. A live robot needs the same supervision you'd give a junior trader handling your money: a kill switch you can hit from your phone that flattens all positions and halts trading in one action; a daily loss cap in Trade Guard that halts it even when you're asleep — for a robot this matters double, because an unsupervised bug can lose at machine speed; and position caps, so a logic error that tries to fire twelve orders gets stopped at the third. Add a weekly review of the robot's journal against the backtest: when live expectancy drifts well below paper expectancy for weeks, the market may have shifted regimes — the robot gets benched, not 'one more week'.",
          "Now the sentence that makes this whole level honest: automation amplifies discipline AND indiscipline. Automate a tested strategy with guardrails, and you've photocopied your best self a thousand times. Automate an untested idea without caps, and you've built a machine that repeats your worst mistake faster than you ever could by hand — at 3am, on seven pairs at once. The robot has no judgment; it inherits yours, whichever version you gave it.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "Two robots, same strategy: with a daily cap the bug costs one bad day; without it, one bug at machine speed writes the cliff on the right.",
        },
        callout: {
          tone: "warn",
          title: "Amplifier, not oracle",
          body: "A robot multiplies whatever you feed it. Tested rules plus guardrails compound; untested rules minus guardrails detonate. No robot converts a losing strategy into a winning one — it just delivers the verdict faster. Trading involves substantial risk of loss.",
        },
      },
    ],
    terms: [
      { term: "trading robot", def: "Software that executes your coded rules automatically — entries, sizing, exits — within the limits you set." },
      { term: "paper robot", def: "The mandatory rehearsal stage: the coded strategy runs on simulated money to prove the code does what the written rules meant." },
      { term: "kill switch", def: "A single action that flattens all positions and halts the robot immediately — reachable from anywhere, tested before going live." },
      { term: "regime shift", def: "A structural change in market behavior (trend to range, calm to crisis) that silently invalidates rules tuned on the old regime." },
      { term: "loss cap", def: "A hard daily or total limit that halts automated trading when crossed — the guardrail that matters most at machine speed." },
    ],
    quiz: [
      {
        q: "The correct pipeline for taking a strategy to automated live trading is…",
        options: [
          "Coded rules → live at full size → adjust when losses appear",
          "Written strategy → coded rules → paper robot → guarded live robot at minimum size",
          "Backtest → full-auto immediately — the backtest is the proof",
          "Paper robot → written strategy → live — write the rules after seeing what works",
        ],
        answer: 1,
        explain: "One direction, no skipped stages. Paper proves the code matches the sentences; guardrails and minimum size protect the graduation.",
      },
      {
        q: "Which failure is a robot MORE likely to make than a disciplined human?",
        options: [
          "Revenge-trading after two losses",
          "Taking an oversized position out of FOMO",
          "Confidently executing range rules into a violent new trend after a regime shift",
          "Skipping the 4am setup out of fatigue",
        ],
        answer: 2,
        explain: "Tilt, FOMO and fatigue are human failures the robot deletes. Context blindness is the machine failure it adds: old rules, new market, perfect obedience.",
      },
      {
        q: "Why does a daily loss cap matter even MORE for a robot than for a manual trader?",
        options: [
          "Robots pay higher commissions",
          "Regulators require caps only for automation",
          "Caps improve the robot's win rate",
          "An unsupervised bug or shifted market loses at machine speed, on every pair, while you sleep",
        ],
        answer: 3,
        explain: "A human's worst hour is limited by human speed. A robot's worst hour isn't — the cap is what turns a catastrophic bug into one bad, survivable day.",
      },
      {
        q: "'Automation amplifies discipline AND indiscipline' means…",
        options: [
          "The robot repeats whatever you gave it — tested rules compound, untested mistakes repeat faster than any human could",
          "Robots become more disciplined over time",
          "Automation eventually removes the need for rules",
          "Disciplined traders shouldn't automate",
        ],
        answer: 0,
        explain: "A robot is a photocopier for process. It has no judgment of its own — it inherits yours, at scale and at speed, whichever version you handed it.",
      },
    ],
  },
] as const;
