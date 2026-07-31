/* =========================================================================
 * Level 4 — Find the Trade. Sessions, confluence and a written plan — when to hunt and how to decide
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_4: readonly LessonContent[] = [
  {
    slug: "sessions-and-timing",
    title: "Sessions and timing",
    hook: "The market is open 24 hours. It is only alive for about eight of them.",
    summary:
      "The forex day decoded: how Sydney, Tokyo, London and New York hand the market around the globe, when volatility actually shows up, and the exact hours when spreads quietly get expensive.",
    interactive: { kind: "replay", scenario: "london-open" },
    sections: [
      {
        h: "One market, four time zones",
        paras: [
          "Forex never rings an opening bell. When New York's banks go home, Sydney's are arriving; when Sydney fades, Tokyo takes over, then London, then New York again. The market runs continuously from Monday morning in Asia to Friday evening in New York — but 'open' is not the same as 'active.' Volume follows bankers' working hours, and it moves around the planet like daylight.",
          "Each session has a personality. Sydney and Tokyo are usually the quiet shift: tighter ranges, slower moves, yen pairs most alive. London is the heavyweight — roughly a third of all forex volume — and its open often produces the day's first real burst of movement as European banks price the overnight news all at once. New York brings US data releases and the American banks.",
          "The loudest hours of the entire day are the London–New York overlap, roughly 12:00–16:00 UTC, when both giants trade simultaneously. More participants means more volume, tighter spreads, and moves that travel. Many professional day traders work ONLY the London open and the overlap, and close the laptop for the other eighteen hours.",
        ],
        figure: {
          kind: "session-clock",
          caption: "Four sessions handing the market around the clock — the London–New York overlap is the loudest window of the day.",
        },
        table: {
          caption: "The four sessions (hours shift ±1h with daylight saving)",
          head: ["Session", "Approx. UTC hours", "Personality"],
          rows: [
            ["Sydney", "21:00–06:00", "Quietest shift; the week's first prints; AUD and NZD pairs stir"],
            ["Tokyo", "00:00–09:00", "Calm ranges; JPY pairs most active; levels form for later"],
            ["London", "07:00–16:00", "Biggest volume share; the open often sets the day's direction"],
            ["New York", "12:00–21:00", "US data and banks; overlap with London 12:00–16:00 is peak liquidity"],
          ],
        },
        callout: {
          tone: "story",
          title: "The London open burst",
          body: "The replay above shows a typical one: Asia drifts in a tight range for hours, then within minutes of London's open the range breaks and the day's real move begins. Same chart, different hour, different market.",
        },
      },
      {
        h: "When the market gets expensive",
        paras: [
          "Trading costs are not constant. The spread — your toll booth from Level 0 — widens whenever liquidity thins, and it thins on a schedule. Around 21:00–22:00 UTC, between New York's close and Asia's warm-up, banks process rollover (the daily interest adjustment on open positions) and market makers step back; spreads on even major pairs can stretch to several times their normal width for a few minutes. A one-pip spread becoming a five-pip spread quietly multiplies the cost of any trade opened there.",
          "News windows are the other expensive hour. In the seconds around a high-impact release — US inflation, central-bank rate decisions, jobs reports — market makers widen spreads and pull quotes because they don't want to be picked off. Price can jump many pips between two ticks, straight over stops and pending orders. Then there's the weekend: forex closes Friday ~21:00 UTC and reopens Sunday ~21:00 UTC, and any news in between shows up as a gap — Monday's first price simply appears far from Friday's last, and no stop can execute inside a gap.",
          "One caveat for crypto traders: bitcoin and sol never close, so there is no rollover hour and no weekend gap — but there is also no session structure to lean on. Crypto liquidity still follows the sun loosely (it thins in the Asian small hours and on weekends), it just does so without a bell. The timing edge in crypto is weaker, not absent.",
        ],
        callout: {
          tone: "warn",
          title: "Timing is a cost control",
          body: "Nothing here predicts direction. Session knowledge controls WHEN you pay tolls and face gaps — a cost edge, not a crystal ball. (On the platform, Trade Guard's news filter and session windows enforce these hours automatically; here, your calendar has to do it.)",
        },
        check: {
          q: "It's 21:15 UTC and your pair's spread has suddenly tripled. The most likely explanation is…",
          options: [
            "London just opened and volatility is spiking",
            "The rollover hour — market makers step back between New York's close and Asia's warm-up",
            "Your broker is singling you out",
            "A weekend gap is forming",
          ],
          answer: 1,
          explain: "Between shifts, few banks are quoting while rollover is processed. Same trade, several times the toll — and it happens on a schedule.",
        },
      },
      {
        h: "Building your trading window",
        paras: [
          "The practical output of this lesson is a decision: which two or three hours are YOUR trading window? Pick hours when your chosen market is genuinely active — for most forex traders that means the London open or the London–NY overlap — and when your own life allows full attention. A tired trader at a dead hour is paying maximum spread for minimum opportunity.",
          "Everything outside the window is off-limits by rule, not by willpower. That single constraint kills an entire species of mistake: the bored 2 a.m. trade in a dead market, the revenge trade squeezed in before the weekend gap, the position opened thirty seconds before a rate decision. In the lessons ahead this window becomes a line on your confluence checklist and then a written rule in your trading plan — the first if-then rule of many.",
        ],
      },
    ],
    terms: [
      { term: "session", def: "The hours a financial center's banks are at their desks: Sydney, Tokyo, London, New York." },
      { term: "overlap", def: "Hours when two sessions run at once. London–New York (≈12:00–16:00 UTC) has the day's deepest liquidity." },
      { term: "rollover", def: "The daily interest adjustment on positions held past ~21:00–22:00 UTC — a thin-liquidity hour when spreads widen." },
      { term: "gap", def: "A jump between one price and the next with no trading in between — most commonly across the weekend close." },
      { term: "news window", def: "The minutes around a scheduled high-impact release, when spreads widen and price can leap over stops." },
    ],
    quiz: [
      {
        q: "The deepest liquidity of the forex day is usually found during…",
        options: [
          "The Sydney open",
          "The London–New York overlap",
          "The hour after New York closes",
          "Saturday afternoon",
        ],
        answer: 1,
        explain: "Roughly 12:00–16:00 UTC both giants trade at once — more participants, tighter spreads, moves that travel.",
      },
      {
        q: "Why do spreads widen around 21:00–22:00 UTC?",
        options: [
          "London is opening and volatility spikes",
          "Regulators mandate wider spreads overnight",
          "It's the rollover hour between New York and Asia — liquidity thins as market makers step back",
          "Spreads are constant; only prices change",
        ],
        answer: 2,
        explain: "Between shifts, few banks are quoting and rollover is processed. Same trade, several times the toll.",
      },
      {
        q: "A weekend gap is dangerous because…",
        options: [
          "Your stop cannot execute inside the gap — price simply reopens beyond it",
          "Brokers cancel all orders every Friday",
          "Gaps only ever move against retail traders",
          "The spread is zero inside a gap",
        ],
        answer: 0,
        explain: "No trades happen between Friday's close and Sunday's open. A stop fills at the next available price, which can be far past your level.",
      },
      {
        q: "The London open matters because…",
        options: [
          "It's the only hour forex is legally open in Europe",
          "Spreads are widest then, so moves are bigger",
          "Tokyo traders all close positions at that minute",
          "European banks price the overnight news at once, often producing the day's first real move",
        ],
        answer: 3,
        explain: "Hours of Asian range-building meet a flood of fresh orders. That collision is the burst you saw in the replay.",
      },
      {
        q: "How do sessions apply to crypto markets like BTCUSDT?",
        options: [
          "Identically — crypto closes every evening too",
          "Loosely — liquidity still follows the sun, but there's no close, no rollover hour and no weekend gap",
          "Not at all — crypto liquidity is constant around the clock",
          "Crypto only trades during the New York session",
        ],
        answer: 1,
        explain: "No clock, but still humans: crypto thins in the Asian small hours and on weekends. The timing edge is weaker, not absent.",
      },
    ],
  },

  {
    slug: "confluence-and-checklists",
    title: "Confluence and checklists",
    hook: "One good reason to trade is a coin flip. Four independent reasons is a setup.",
    summary:
      "Why any single signal is barely better than random, how independent reasons — structure, level, session, risk shape — stack into a real setup, and the printed pre-trade checklist that counts them so your adrenaline doesn't have to.",
    sections: [
      {
        h: "One signal is a coin flip",
        paras: [
          "Take any single signal — a bounce off a level, a moving-average cross, a pretty candle — and test it alone across a hundred trades. It wins somewhere near half the time. You already know why from Level 3: levels break constantly, sweeps punish the obvious entry, and every 'signal' has a mirror-image failure mode. One reason to trade is a coin flip, and after the spread takes its toll on every flip, a coin-flip trader loses slowly and surely.",
          "Edge starts when reasons stack — but only reasons that are independent, each true for its own cause. The higher-timeframe trend points up for structural reasons. A remembered level sits below price for order-flow reasons. It's the loud hour for scheduling reasons. Each filter alone removes some bad trades; run a trade idea through all of them and only the rare candidate survives. Traders call that survivor confluence: separate lines of evidence agreeing on the same trade.",
        ],
        figure: {
          kind: "confluence-stack",
          caption: "Independent reasons stacking on one trade idea: structure, level, session and risk shape each filter out a different kind of bad trade.",
        },
      },
      {
        h: "Four ingredients that actually stack",
        paras: [
          "Everything you need is already in your kit. Structure: the higher timeframe prints the trend your way (Level 3, lesson one). Level: price is at a remembered zone — a flipped level, a range edge, a prior day's high or low (lesson two). Session: it's inside your trading window, not the dead hours (last lesson). Risk shape: the geometry pays — your stop fits beyond the invalidation and the target offers at least 1.5 times the risk (Level 2's math, pointed forward).",
          "A worked example. H1 EURUSD prints higher highs and higher lows — structure says longs. Price pulls back into 1.0880, a broken ceiling now retested as a floor — level. The clock reads 08:30 UTC, inside the London window — session. A stop below the sweep's extreme at 1.0865 risks 15 pips; the nearest ceiling at 1.0925 offers 45 — three times the risk. Four yeses, four different sources. That is a setup, not a hunch.",
          "Notice the fourth ingredient is different in kind: risk shape is a veto, not a vote. Structure, level and session perfect but only 0.7R of room to the next ceiling? No trade — geometry cannot be negotiated with. A beautiful setup that doesn't pay enough for its risk is not a beautiful setup.",
        ],
        figure: {
          kind: "risk-reward",
          caption: "Risk shape is the fourth ingredient: 15 pips of risk against 45 of room is 3R — geometry you verify before entry, never after.",
        },
        check: {
          q: "Which pair of reasons is genuinely independent?",
          options: [
            "RSI oversold and Stochastic oversold",
            "H1 higher highs plus the London-open window",
            "Two moving averages both pointing up",
            "The same support level drawn on two timeframes",
          ],
          answer: 1,
          explain: "Structure and schedule come from different sources. RSI and Stochastic are the same candles run through different arithmetic — one reason in two costumes.",
        },
      },
      {
        h: "Print the checklist",
        paras: [
          "Never count reasons in your head with the buy button glowing — adrenaline rounds every 'maybe' up to a yes. Put the count on paper. Four lines, printed, taped where you can't avoid it, read top to bottom before every entry. For a beginner the rule is strict: all four pass or there is no trade. No 'three out of four but this one feels special.'",
          "That strictness has a consequence you should expect in advance: most days, the checklist says no. That is the point. Confluence is a rejection machine — its job is to throw away the coin flips so that the few trades you do take carry every edge you know how to stack. A day with zero trades costs zero. In the next lesson this checklist gets absorbed into your full written plan, with entry triggers and a daily stop wrapped around it.",
        ],
        table: {
          caption: "The four-line confluence checklist (line four is a veto)",
          head: ["Line", "Question", "Pass looks like"],
          rows: [
            ["Structure", "Is the higher timeframe trending my way?", "H1 higher highs and higher lows for a long"],
            ["Level", "Is price at a remembered zone?", "Flipped level, range edge, or a prior day's high/low"],
            ["Session", "Is this inside my window?", "Within the 2-3 hours my plan names — not the dead hours"],
            ["Risk shape", "Does the geometry pay?", "Stop beyond invalidation; target at least 1.5x the risk"],
          ],
        },
        callout: {
          tone: "tip",
          title: "Tape it to the monitor",
          body: "Physically printed, physically visible. The checklist's power is moving the decision OUT of your head at the exact moment your head is least trustworthy.",
        },
      },
      {
        h: "Confluence traps",
        paras: [
          "Trap one: costumes. Adding RSI, MACD and Stochastic to a chart feels like three more reasons — it is one reason (recent price movement) wearing three costumes, because all three are computed from the same candles. Independence means different sources: structure, place, time, geometry. If two 'reasons' would always agree or fail together, count them once.",
          "Trap two: reason-shopping. It goes like this — you WANT the trade first, then you go hunting for evidence to justify it, and the chart, generous as ever, provides. Confluence found after the decision is decoration, not analysis. The defense is order of operations: the checklist runs before the urge gets a vote — price reaches a level on your map, you open the list, and the list decides. You are the clerk, not the judge.",
        ],
        callout: {
          tone: "warn",
          title: "Stacked costumes still flip coins",
          body: "Five indicators agreeing feels overwhelming and proves almost nothing — same candles, same information, same coin. One reason from each SOURCE beats five from one.",
        },
      },
    ],
    terms: [
      { term: "confluence", def: "Several independent reasons agreeing on the same trade. The stack is the setup — no single reason is." },
      { term: "independence", def: "Reasons count separately only when they come from different sources — structure, place, time, geometry — not the same math twice." },
      { term: "risk shape", def: "The geometry of a trade: stop beyond invalidation, target at least 1.5x the risk. A veto, not a vote." },
      { term: "A-setup", def: "A trade where every checklist line passes. The only kind a beginner's rules should allow." },
      { term: "reason-shopping", def: "Hunting for justifications after you already want the trade. Confluence in reverse, and worth exactly nothing." },
    ],
    quiz: [
      {
        q: "Why does this lesson call a single trading signal 'a coin flip'?",
        options: [
          "Because signals literally alternate wins and losses",
          "Tested alone, most signals win near half the time — and the spread turns that into a slow loss",
          "Because brokers randomize fills",
          "Because signals only work on Mondays",
        ],
        answer: 1,
        explain: "Every signal has a mirror-image failure mode, so alone it hovers near 50/50. Edge appears when independent filters stack and throw the weak flips away.",
      },
      {
        q: "H1 uptrend, price at a flipped level, inside the London window. The missing INDEPENDENT ingredient is…",
        options: [
          "A second indicator to confirm the trend",
          "A forum post agreeing with the idea",
          "Risk shape — a stop beyond invalidation with at least 1.5x the risk available to the target",
          "A bigger position size",
        ],
        answer: 2,
        explain: "Structure, level and session are covered; geometry is the fourth source. An indicator or an opinion adds a costume, not an ingredient.",
      },
      {
        q: "Structure, level and session all pass — but the nearest sensible target offers only 0.7x your risk. The checklist says…",
        options: [
          "Take it — three out of four is passing",
          "Take it with a wider target placed beyond the ceiling",
          "Take it at double size to compensate",
          "No trade — risk shape is a veto, and geometry can't be negotiated with",
        ],
        answer: 3,
        explain: "A setup that doesn't pay for its risk isn't a setup. Stretching the target past real structure to force the math is reason-shopping with extra steps.",
      },
      {
        q: "You already want in, and now you're scanning the chart for evidence that agrees. That is…",
        options: [
          "Reason-shopping — confluence found after the decision is decoration",
          "Exactly how confluence is supposed to work",
          "Fine, as long as you find at least four reasons",
          "A sign of strong trading intuition",
        ],
        answer: 0,
        explain: "The chart will always supply justifications if you ask it nicely. Order of operations is the defense: the checklist runs before the urge gets a vote.",
      },
    ],
  },

  {
    slug: "build-a-trading-plan",
    title: "Build a trading plan",
    hook: "If a stranger can't execute your plan, you don't have one.",
    summary:
      "The five blocks of a written trading plan — market, setup, trigger, exits, risk — plus one complete worked example and the pre-trade checklist that turns the document into a habit.",
    sections: [
      {
        h: "A plan is if-then rules, written down",
        paras: [
          "Everything you've learned so far — levels, sessions, stops, sizing — is raw material. A trading plan is the machine that assembles it: a short written document of if-then rules so specific that a stranger could sit at your desk and take exactly your trades. 'Buy when it looks strong' is a feeling. 'IF price sweeps a prior day's low during London and closes back above it within two candles, THEN buy the close' is a rule. Plans are made of the second kind of sentence only.",
          "The test is transferability. Hand your plan to someone who has never met you: if they'd hesitate anywhere — which market? which timeframe? how big? where's the stop? — the plan has a hole, and holes get filled by emotion at the worst possible moment. Vague plans aren't beginner plans; they're not plans.",
        ],
      },
      {
        h: "The five blocks",
        paras: [
          "Every workable plan answers five questions. Block one: market and timeframe — which instrument(s), which chart, which session window (your answer from the sessions lesson goes here). Block two: setup definition — the exact market condition you're waiting for, in objective terms a camera could verify. Block three: entry trigger — the specific event that converts 'watching' into 'in': a candle close, a level retest, a break of a marked high. Block four: exit rules — where the stop goes and where the target goes, decided before entry, every time. Block five: risk — the fixed percent per trade and the daily stop that ends your session after a set loss.",
          "Block five is where Level 2 becomes law. One percent risk per trade, sized from the stop distance, and a daily stop around minus three percent — after which you are done for the day, no exceptions, no 'one more to get it back.' These are the same two rules the platform's Trade Guard enforces in software — risk-percent sizing and a daily loss breaker — because they are the two rules traders most reliably break by hand when it matters most.",
          "Here is a complete example for one simple setup. It is not a recommendation — it exists so you can see what 'complete' looks like. Yours will differ in every detail and match in every structure.",
        ],
        table: {
          caption: "A complete one-setup plan (example, not advice)",
          head: ["Block", "The rule"],
          rows: [
            ["Market & timeframe", "EURUSD only, M15 chart, London open window 07:00–10:00 UTC"],
            ["Setup", "Overnight Asian range is marked; price sweeps the range low by ≤10 pips"],
            ["Entry trigger", "First M15 candle that closes back INSIDE the range after the sweep — buy that close"],
            ["Stop & target", "Stop 2 pips below the sweep's lowest point; target the opposite side of the range; skip if reward < 1.5× risk"],
            ["Risk", "1% of equity per trade, sized from stop distance; daily stop −3%: two losses = done for the day"],
          ],
        },
        figure: {
          kind: "risk-reward",
          caption: "Block four in one picture: stop and target placed before entry — and if the reward is under 1.5x the risk, the plan says skip.",
        },
        callout: {
          tone: "story",
          title: "Two traders, one entry, two outcomes",
          body: "Two traders bought the same sweep at the same price. The market dipped 12 pips against them, then rallied. Trader A's plan said 'stop below the sweep low' — she was never in danger and took the full move. Trader B had no written exit, panicked at −10 pips, sold the bottom tick, then watched the rally leave without him. Identical entries. The plan was the entire difference.",
        },
      },
      {
        h: "The checklist habit",
        paras: [
          "A plan on paper still loses to adrenaline in the moment — unless you put a checklist between yourself and the buy button. Before every single trade, read five lines out loud or on screen: Is this my market and my window? Does the setup match the written definition? Did the exact trigger fire? Are stop and target placed, with reward at least my minimum multiple of risk? Is the size right and am I under my daily stop? Five yeses, take the trade. One no, stand down. Pilots with ten thousand hours still run the pre-flight list; the list isn't for beginners, it's for humans.",
          "One timing rule makes all of it work: the plan is written and frozen BEFORE the session, when you're calm and nothing is flashing. During the session you are not an author — you are an operator executing a document your calmer self signed. Every mid-session 'improvement' is a mistake wearing a clever disguise; if the plan needs changing, change it tonight, in writing, for tomorrow. Next level, you'll learn how to test whether the plan actually has an edge — before real money ever finds out.",
        ],
        callout: {
          tone: "tip",
          title: "One setup is plenty",
          body: "A beginner's plan should contain exactly one setup. Mastering one if-then loop teaches more than juggling five — you can add setups after the journal (Level 6) proves you can follow the first.",
        },
        check: {
          q: "You run the pre-trade checklist and get four yeses and one no. What does the plan allow?",
          options: [
            "Take the trade — four out of five is passing",
            "Take it at half size as a compromise",
            "Nothing — one no means stand down; the checklist is a gate, not a scorecard",
            "Rewrite the failing line mid-session so it passes",
          ],
          answer: 2,
          explain: "Partial credit is how emotion negotiates its way into trades. The list either clears the trade or it doesn't — and rule changes happen tonight, in writing, for tomorrow.",
        },
      },
    ],
    terms: [
      { term: "trading plan", def: "A written set of if-then rules covering market, setup, trigger, exits and risk — executable by a stranger." },
      { term: "setup", def: "The exact, objectively-defined market condition you wait for before considering a trade." },
      { term: "trigger", def: "The specific event — a close, a retest, a break — that converts watching into entering." },
      { term: "checklist", def: "The short pre-trade list you run before every entry. Five yeses or no trade." },
      { term: "daily stop", def: "A fixed daily loss (e.g. −3% of equity) that ends your trading day the moment it's hit." },
    ],
    quiz: [
      {
        q: "The test of a real trading plan is…",
        options: [
          "It predicts the market correctly most days",
          "It's long and covers many setups",
          "A stranger could execute your exact trades from it without asking a question",
          "It was written by a profitable trader",
        ],
        answer: 2,
        explain: "Transferability exposes every hole. Wherever a stranger would hesitate, your emotions will improvise.",
      },
      {
        q: "Which of these is a valid TRIGGER, as this lesson defines it?",
        options: [
          "'The market feels strong today'",
          "'First M15 candle closing back inside the range after a sweep'",
          "'EURUSD on the 15-minute chart'",
          "'Risk 1% per trade'",
        ],
        answer: 1,
        explain: "A trigger is one observable event that fires or doesn't. The others are a feeling, a market/timeframe block and a risk block.",
      },
      {
        q: "Why must the plan be written BEFORE the session rather than during it?",
        options: [
          "Markets are closed before the session, so there's more time",
          "Regulators require pre-session documentation",
          "Plans written during sessions are illegal at most brokers",
          "Calm-you writes the rules; in-the-moment-you will bend any rule that isn't already frozen",
        ],
        answer: 3,
        explain: "Mid-session 'improvements' are almost always emotion in disguise. Change the plan tonight, in writing, for tomorrow.",
      },
      {
        q: "Your plan says: 1% risk per trade, daily stop −3%. You've lost two trades (−2%) and a third setup appears. What does the plan allow?",
        options: [
          "Take it at normal 1% size — the daily stop isn't hit yet",
          "Take it at 3% size to win the day back",
          "Nothing — two losses always end the day",
          "Take it without a stop loss to avoid a third stop-out",
        ],
        answer: 0,
        explain: "At −2% you're inside your limits, so the plan trades normally. Sizing up to 'get it back' is exactly what the daily stop exists to prevent.",
      },
      {
        q: "In the two-traders story, both bought the same price. Trader A won and Trader B lost because…",
        options: [
          "Trader A had a faster broker",
          "Trader A predicted the dip in advance",
          "Trader B's position was too small to profit",
          "Only Trader A had a written exit rule, so the 12-pip dip couldn't shake her out",
        ],
        answer: 3,
        explain: "Same entry, same market. A pre-written stop location versus in-the-moment panic was the entire difference.",
      },
    ],
  },
] as const;
