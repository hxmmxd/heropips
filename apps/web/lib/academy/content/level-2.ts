/* =========================================================================
 * Level 2 — Protect Your Money. The level that decides whether a trader
 * survives long enough to get good: the 1% rule and streak math, stops as
 * invalidation, leverage as borrowed exposure, and the sizing formula
 * drilled until it's reflex. Legacy risk prose (and both compliance-
 * reviewed tables) ported verbatim where it earned its place.
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_2: readonly LessonContent[] = [
  {
    slug: "risk-1-percent",
    title: "Why pros risk 1%",
    hook: "Losing streaks aren't bad luck — they're scheduled. The 1% rule is how you survive the schedule.",
    summary:
      "Expectancy, the mathematics of losing streaks, and why drawdowns are so brutally expensive to reverse — the arithmetic that separates traders who last from traders who were briefly right.",
    sections: [
      {
        h: "Expectancy: the only edge that compounds",
        paras: [
          "First, one unit to rule them all: R is the amount you planned to risk on a trade. Risk $100 and a winner that pays $200 is a 2R win; the losing trades cost 1R each by design. Measuring in R instead of dollars lets you compare trades, weeks and strategies on one scale.",
          "A strategy's expectancy is what an average trade pays: (win rate × average win) − (loss rate × average loss). A system that wins 45% of the time, making 2R on winners and losing 1R on losers, has an expectancy of (0.45 × 2) − (0.55 × 1) = +0.35R per trade. Positive expectancy is necessary — but it is not sufficient. Expectancy tells you what happens on average; risk-per-trade decides whether you survive long enough for the average to arrive.",
        ],
        check: {
          q: "A system wins only 40% of the time, making +2R on winners and losing 1R on losers. Profitable on average?",
          options: [
            "No — losing more often than winning means losing money",
            "Yes — expectancy is (0.40 × 2R) − (0.60 × 1R) = +0.20R per trade",
            "Impossible to say until the win rate clears 50%",
          ],
          answer: 1,
          explain: "Win rate alone decides nothing. Expectancy weighs what winners pay against what losers cost — this system earns +0.20R per trade on average.",
        },
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
        callout: {
          tone: "warn",
          title: "Your best strategy will meet this streak",
          body: "The streak is not a possibility to fear — it's an appointment to prepare for. Sizing is the only preparation that works, because it's the only variable you control completely.",
        },
        figure: {
          kind: "equity-curve",
          caption: "The same scheduled losing streak on two accounts: at 1% risk it's a dent in the curve; at 10% it's a hole the recovery math itself fights you on climbing out of.",
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
        figure: {
          kind: "position-size-math",
          caption: "The sizing flow Trade Guard runs on every trade: equity → fixed risk percent → stop distance → position size. Confidence is not an input.",
        },
      },
    ],
    terms: [
      { term: "expectancy", def: "What an average trade pays: (win rate × avg win) − (loss rate × avg loss)." },
      { term: "R multiple", def: "Profit or loss measured in units of planned risk. Risk $100, make $200 = a 2R win." },
      { term: "drawdown", def: "The drop from an equity peak. Painful to take, exponentially harder to recover." },
      { term: "risk per trade", def: "The fixed fraction of equity a single trade can lose. Pros keep it near 1%." },
      { term: "losing streak", def: "Consecutive losses. A statistical certainty of every real system — plan for it, don't hope against it." },
    ],
    quiz: [
      {
        q: "A system wins 40% of the time; winners pay 2R and losers cost 1R. Its expectancy is…",
        options: [
          "−0.2R — a losing system",
          "+0.2R per trade: (0.40 × 2) − (0.60 × 1)",
          "+0.8R per trade",
          "Zero — anything below a 50% win rate must lose",
        ],
        answer: 1,
        explain: "0.8 − 0.6 = +0.2R per trade on average. A sub-50% win rate can absolutely be profitable when winners are bigger than losers.",
      },
      {
        q: "With a 50% win rate over 100 trades, a 7-loss streak is…",
        options: [
          "Nearly impossible",
          "Proof the strategy is broken",
          "Only possible if you're trading badly",
          "More likely than not — streaks are scheduled, not bad luck",
        ],
        answer: 3,
        explain: "Better-than-even odds within 100 trades. Streaks are a property of probability itself; sizing decides whether one is an annoyance or a funeral.",
      },
      {
        q: "Per the 10-loss table, risking 5% per trade leaves about…",
        options: [
          "90.4% of the account",
          "81.7% of the account",
          "59.9% of the account",
          "34.9% of the account",
        ],
        answer: 2,
        explain: "Ten compounding 5% losses leave 59.9% — a −40.1% drawdown that needs roughly +67% just to get back to even.",
      },
      {
        q: "You draw down 50%. What gain returns the account to break-even?",
        options: [
          "+100% — you must double what's left",
          "+50% — symmetry",
          "+55%",
          "+75%",
        ],
        answer: 0,
        explain: "Recovery is computed on the smaller base. Half the account is gone, so what remains must double. Losses charge compound interest.",
      },
      {
        q: "Why do professionals obsess over risk per trade more than win rate?",
        options: [
          "Win rate is impossible to measure",
          "Small risk guarantees profits",
          "Size decides whether you survive the inevitable streak long enough for expectancy to pay",
          "Brokers reward small positions with better spreads",
        ],
        answer: 2,
        explain: "Expectancy only pays if you're still trading when the average arrives. Sizing is the survival variable — and the only one fully in your control.",
      },
    ],
  },

  {
    slug: "stop-loss-take-profit",
    title: "Stops and targets",
    hook: "A stop loss isn't where the pain gets too big — it's the price where your idea is proven wrong.",
    summary:
      "Stops as invalidation instead of pain tolerance, placing them beyond the structure your trade depends on, targets measured in R — and the one direction a stop is ever allowed to move.",
    interactive: { kind: "replay", scenario: "stop-and-run" },
    sections: [
      {
        h: "A stop is where you're wrong",
        paras: [
          "Every trade is a claim about the market: “this support holds,” “this breakout continues.” A stop loss is the price at which that claim is disproven — the invalidation point. Placed there, being stopped out isn't a tragedy; it's the market answering your question with a clean no, at a cost you chose in advance.",
          "Beginners place stops by pain instead: “$50 is all I can stand to lose, so the stop goes 12 pips away” — on a setup whose invalidation sits 30 pips away. Now normal market breathing hits the stop before the idea is even tested, and the trade loses without ever being wrong. If the structural stop is wider than your risk budget allows, the answer is a smaller position — never a closer stop. Distance is dictated by the chart; dollars are dictated by your size.",
        ],
        callout: {
          tone: "warn",
          title: "“Mental stops” are a plan to negotiate",
          body: "A stop you'll “just execute manually” puts the exit decision in the hands of the same brain that's now hoping — and you aren't at the screen 24/5. Place the order. Every time.",
        },
        figure: {
          kind: "order-types",
          caption: "A stop loss is just a stop order resting at your invalidation price — placed together with the entry, it fires without asking how you feel at the time.",
        },
      },
      {
        h: "Place stops beyond structure",
        paras: [
          "Structure means the swings and levels your idea depends on: the swing low under your support bounce, the broken resistance under your breakout, the swing high above your lower-high short. The stop belongs a few pips beyond that structure — far enough that only a genuine failure of the idea reaches it, close enough that failure stays cheap. The wick lesson from Level 1 pays off here: levels get probed. A stop one pip behind an obvious low is an invitation; a stop beyond the level plus a small buffer forces the market to actually break structure to take your money.",
        ],
        table: {
          caption: "Where structural stops live (illustrative pip numbers, not advice)",
          head: ["Setup", "What proves it wrong", "Stop placement"],
          rows: [
            ["Buy the bounce off 1.0800 support; swing low 1.0788", "The swing low breaks — support failed", "1.0783, a few pips beyond the low (~17-pip stop)"],
            ["Buy the breakout above 1.2650 resistance", "Price falls back inside the old range", "1.2632, below the broken level (~18-pip stop)"],
            ["Sell the lower high at 155.80 in a downtrend; swing high 156.05", "A higher high prints — downtrend structure broken", "156.10, beyond the swing high (~30-pip stop)"],
          ],
        },
        check: {
          q: "Your bounce setup's invalidation sits 30 pips away, but your risk budget only stretches to a 12-pip stop. What do you do?",
          options: [
            "Use the 12-pip stop — protecting dollars comes first",
            "Keep the 30-pip structural stop and trade a smaller size",
            "Skip the stop and watch the trade closely instead",
          ],
          answer: 1,
          explain: "Distance is dictated by the chart, dollars by your size. A stop inside normal market breathing loses before the idea is ever tested — and a “watched” trade has no stop at all.",
        },
      },
      {
        h: "Targets in R — and stops move one way only",
        paras: [
          "With the stop set by structure, the target becomes arithmetic. Your stop distance is 1R; a take profit at twice that distance is a 2R target. A 30-pip stop with a 60-pip target means you're paid two for every one you risk — which is exactly what lets a 45% win rate produce the positive expectancy you met last lesson. Decide the target when you place the trade, while you're still a scientist and not yet a fan.",
          "One rule governs every adjustment afterward: a stop may only move in your favor. Tightening to break-even after price moves your way — reasonable. Trailing behind new swing structure — reasonable. Widening a stop as price approaches it is the single most reliable account-killer in retail trading, because it converts one planned 1R loss into an unplanned catastrophe. The stop was the answer you agreed to accept. Let it stand.",
        ],
        callout: {
          tone: "tip",
          title: "Write the exit before the entry",
          body: "Stop price, target price, R multiple — written down before the order goes in. If the numbers don't make the trade worth taking, no amount of conviction will.",
        },
        figure: {
          kind: "risk-reward",
          caption: "One trade measured in R: the stop distance is 1R of risk, the target sits at 2R — paid two for every one risked, decided before the order goes in.",
        },
      },
    ],
    terms: [
      { term: "stop loss", def: "A resting order that closes the trade at your invalidation price. The cost of being wrong, fixed in advance." },
      { term: "take profit", def: "A resting order that closes the trade at your target. Set in R, decided before entry." },
      { term: "invalidation", def: "The price at which your trade idea is disproven — where the stop belongs." },
      { term: "R multiple", def: "Distance measured in units of your stop. A target at twice the stop distance is 2R." },
      { term: "break-even", def: "Moving the stop to your entry price after the trade moves your way — the worst case becomes zero." },
    ],
    quiz: [
      {
        q: "A stop loss is best placed at…",
        options: [
          "A round dollar amount you're comfortable losing",
          "Exactly 20 pips away, on every trade",
          "The price where your trade idea is proven wrong",
          "As far away as possible, so it never gets hit",
        ],
        answer: 2,
        explain: "The stop marks invalidation. If the structural stop costs more than your risk budget, shrink the size — never drag the stop closer.",
      },
      {
        q: "You buy the bounce off 1.0800 support and the swing low sits at 1.0788. A structural stop goes…",
        options: [
          "A few pips beyond 1.0788 — behind the level that invalidates the idea, plus a buffer for probes",
          "At 1.0799, one pip under your entry",
          "At break-even immediately",
          "Nowhere — you'll watch it manually",
        ],
        answer: 0,
        explain: "Only a genuine break of the swing low disproves the bounce. The small buffer stops an ordinary wick from taking your money first.",
      },
      {
        q: "Your stop is 30 pips away. A 2R take profit sits…",
        options: [
          "15 pips away",
          "30 pips away",
          "45 pips away",
          "60 pips away",
        ],
        answer: 3,
        explain: "R is your stop distance. 2R = 2 × 30 = 60 pips — you're paid two for every one risked, which is what makes modest win rates profitable.",
      },
      {
        q: "Which stop adjustment is allowed under professional rules?",
        options: [
          "Widening the stop as price approaches it",
          "Moving it toward the trade — to break-even or better — after price moves your way",
          "Deleting it during news so you don't get wicked out",
          "Doubling position size instead of adjusting anything",
        ],
        answer: 1,
        explain: "Stops move in your favor only. Widening one converts a planned 1R loss into an unplanned disaster — the most reliable account-killer there is.",
      },
      {
        q: "The core problem with a “mental stop” is…",
        options: [
          "When price hits it, the brain that planned the exit is busy hoping — and you're not at the screen 24/5",
          "It's too disciplined for most traders",
          "Brokers charge extra for manual exits",
          "It executes faster than a real order",
        ],
        answer: 0,
        explain: "A mental stop is a plan to renegotiate with yourself at the worst moment. The resting order removes the negotiation entirely.",
      },
    ],
  },

  {
    slug: "leverage-and-margin",
    title: "Leverage and margin",
    hook: "Leverage doesn't change the market — it changes how much of the market can reach your account.",
    summary:
      "Leverage as borrowed exposure, margin mechanics with one fully worked example, and the arithmetic of why high leverage on a small account forces you out before your idea ever gets tested.",
    sections: [
      {
        h: "Borrowed exposure",
        paras: [
          "Leverage lets you control a position larger than your deposit. At 1:30, $1,000 of your money can open $30,000 of exposure — the broker fronts the rest while your deposit stands as collateral. The market doesn't know or care: a 1% move is a 1% move. What leverage changes is how much of that move lands on your account. A 1% move against a $30,000 position is $300 — which is 30% of the $1,000 that's actually yours.",
          "This is the honest way to think about it: leverage is not extra firepower, it's a magnifying glass held over both your wins and your losses. Regulators cap retail forex leverage at 1:30 in the EU and UK precisely because the magnification, not the market, is what empties most beginner accounts.",
        ],
        figure: {
          kind: "leverage-double-edge",
          caption: "The identical 1% market move at three leverage levels — magnified equally in both directions. The magnifying glass doesn't care which way you're facing.",
        },
      },
      {
        h: "Margin, free margin, margin call — one worked example",
        paras: [
          "Margin is the slice of your equity the broker locks up as collateral for an open position. Take a $1,000 account at 1:30 leverage. You buy one mini lot of EURUSD — $10,000 of exposure. Required margin: $10,000 ÷ 30 ≈ $333. Free margin — equity minus locked margin — is $667, and that's the buffer that absorbs losses. One pip on a mini lot is about $1.",
          "Now price moves 400 pips against you. Floating loss: $400. Equity: $600. Free margin: $267 and shrinking. At many brokers, when equity falls to the required margin — here $333, a 667-pip adverse move — the margin call escalates to a stop-out: the broker force-closes your position at market to protect the money it lent you. You didn't decide to exit. The arithmetic decided for you.",
          "Notice what the 1% rule from earlier in this level would have done instead: 1% of $1,000 is $10 — a 10-pip stop at this size, or a smaller size with a wider stop. Either way you'd have exited 657 pips before the broker ever got involved. Margin calls are what happens when position size is set by leverage available instead of risk chosen.",
        ],
        check: {
          q: "$1,000 account, 1:30 leverage, one mini lot of EURUSD open. Who exits a bad trade first — your 1% rule or the broker's stop-out?",
          options: [
            "The broker — margin math always triggers before small stops",
            "Your 1% rule, by hundreds of pips: a $10 stop exits around 10 pips, the stop-out needs ~667 pips against you",
            "They trigger at the same point by design",
          ],
          answer: 1,
          explain: "1% of $1,000 is $10 — about 10 pips at $1 per pip on a mini lot. The stop-out only arrives after ~667 adverse pips. Margin calls happen when size is set by leverage available instead of risk chosen.",
        },
      },
      {
        h: "Why high leverage forces you out early",
        paras: [
          "Here is the trap in one sentence: the higher your leverage, the smaller the adverse move that wipes your collateral — so normal market breathing becomes lethal. A trade idea might be perfectly sound on a two-week horizon, but if a routine 1% wiggle liquidates you on day one, the idea never gets to play out. You weren't wrong about the market; you were wrong about how long you could afford to stay in it. This table is simulated arithmetic, not a performance claim.",
        ],
        table: {
          caption: "Adverse move that erases 100% of margin at full utilization (simulated arithmetic)",
          head: ["Leverage", "Move that wipes the margin"],
          rows: [
            ["1:10", "10%"],
            ["1:30", "3.3%"],
            ["1:100", "1%"],
            ["1:500", "0.2%"],
          ],
        },
        callout: {
          tone: "warn",
          title: "Leverage available ≠ leverage used",
          body: "A 1:500 account doesn't force you to use 1:500. Size from your stop and your 1% risk — the leverage you actually use follows. Traders who size from maximum leverage are volunteering for the 0.2% row.",
        },
      },
    ],
    terms: [
      { term: "leverage", def: "Borrowed exposure: at 1:30, $1,000 controls $30,000. Magnifies wins and losses equally." },
      { term: "margin", def: "The slice of equity the broker locks as collateral for an open position." },
      { term: "free margin", def: "Equity minus locked margin — the buffer that absorbs floating losses." },
      { term: "margin call", def: "The broker's warning that equity is falling toward required margin: add funds or reduce positions." },
      { term: "liquidation", def: "The stop-out: the broker force-closes positions when equity can no longer cover margin." },
    ],
    quiz: [
      {
        q: "1:30 leverage means a $1,000 deposit can control…",
        options: [
          "$1,030 of exposure",
          "$30,000 of exposure",
          "$300,000 of exposure",
          "Unlimited exposure",
        ],
        answer: 1,
        explain: "Multiply deposit by the leverage ratio: 1,000 × 30 = $30,000. Your money is the collateral; the broker fronts the rest.",
      },
      {
        q: "You open a $10,000 position at 1:30 leverage. Required margin is about…",
        options: [
          "$10,000",
          "$3,000",
          "$333",
          "$30",
        ],
        answer: 2,
        explain: "Margin = exposure ÷ leverage: $10,000 ÷ 30 ≈ $333 locked as collateral. The rest of your equity is free margin.",
      },
      {
        q: "A margin call means…",
        options: [
          "Equity has fallen too close to required margin — add funds or reduce, or the broker starts force-closing",
          "You've been awarded a trading bonus",
          "Your leverage was automatically increased",
          "The market closed early",
        ],
        answer: 0,
        explain: "It's the broker protecting the money it lent you. Ignore it and the stop-out closes your positions at market — the arithmetic exits for you.",
      },
      {
        q: "At 1:100 leverage with margin fully used, the adverse move that wipes 100% of your margin is…",
        options: [
          "10%",
          "3.3%",
          "0.2%",
          "1%",
        ],
        answer: 3,
        explain: "The wipe-out move is 1 ÷ leverage. At 1:100 a routine 1% move — a quiet Tuesday on many pairs — erases the entire collateral.",
      },
      {
        q: "Why does high leverage kill accounts even when the trade idea was right?",
        options: [
          "Leverage changes the market's direction",
          "Normal wiggles become margin-threatening losses, forcing liquidation before the idea can play out",
          "Brokers hunt the stops of leveraged traders",
          "High leverage widens the spread",
        ],
        answer: 1,
        explain: "Being right eventually is worthless if the magnified drawdown ends the trade first. Survival horizon, not direction, is what leverage destroys.",
      },
    ],
  },

  {
    slug: "position-sizing-drill",
    title: "The position sizing drill",
    hook: "One formula turns everything in this level into a habit: risk dollars ÷ stop distance = size.",
    summary:
      "The single formula that connects the 1% rule, your stop distance and pip value into a position size — with two fully worked examples, then the drill that makes it reflex.",
    interactive: { kind: "risk-sizer" },
    sections: [
      {
        h: "The one formula",
        paras: [
          "Everything in this level compresses into two lines of arithmetic. Risk dollars = equity × risk percent. Position size = risk dollars ÷ (stop distance in pips × pip value per lot). That's it. Equity comes from your account, risk percent from your rules, stop distance from structure — and out falls the only position size consistent with all three. Notice what's not in the formula: how confident you feel, how good the setup looks, how much you'd like to make back from yesterday.",
        ],
        callout: {
          tone: "tip",
          title: "The formula IS the discipline",
          body: "You don't need willpower at the moment of entry if the size was never yours to negotiate. Run the formula, take its answer, every trade — that's the entire habit this level exists to install.",
        },
        figure: {
          kind: "position-size-math",
          caption: "The whole level in one flow: equity → risk percent → risk dollars → divided by stop distance → position size. Nothing else gets a vote.",
        },
      },
      {
        h: "Two worked examples",
        paras: [
          "EURUSD: a $10,000 account risking 1% puts $100 on the line. Structure demands a 40-pip stop. $100 ÷ 40 pips = $2.50 per pip. A mini lot pays about $1 per pip, so that's 2.5 mini lots — a quarter of a standard lot (0.25 lots). If the setup needed a 100-pip stop instead, the same $100 buys only $1 per pip: one mini lot. Wider stop, smaller size, identical risk.",
          "USDJPY at 155.00: a $5,000 account risking 1% puts $50 on the line, with a 25-pip stop. $50 ÷ 25 pips = $2 per pip. But yen pip values differ: one pip on a mini lot is 100 yen, worth about $0.65 at this rate. $2.00 ÷ $0.65 ≈ 3.1 mini lots — and since brokers deal in fixed increments, you round down to 3. Always down: rounding up means real risk quietly exceeds planned risk, and “quietly exceeds” is how 1% becomes 1.4% becomes blown rules.",
        ],
        check: {
          q: "$2,000 account, 1% risk, 20-pip stop on EURUSD. What size does the formula hand you?",
          options: [
            "$2 per pip — two mini lots",
            "$1 per pip — one mini lot",
            "$0.50 per pip — half a mini lot",
            "$4 per pip — the setup looks strong",
          ],
          answer: 1,
          explain: "1% of $2,000 is $20; $20 ÷ 20 pips = $1 per pip — one mini lot. “The setup looks strong” isn't in the formula, and never will be.",
        },
      },
    ],
    terms: [
      { term: "position size", def: "The lots you trade — the formula's output, never a feeling's." },
      { term: "pip value", def: "Cash per pip at a given size. ~$1 per mini lot on EURUSD; check it per pair, especially yen crosses." },
      { term: "risk percent", def: "The fixed fraction of equity one trade may lose. Set once in your rules, not per trade." },
    ],
    quiz: [
      {
        q: "$10,000 account, 1% risk, 40-pip stop on EURUSD. Your size is…",
        options: [
          "$10 per pip — one standard lot",
          "$1 per pip — one mini lot",
          "$2.50 per pip — 2.5 mini lots (0.25 standard lots)",
          "$4 per pip — 4 mini lots",
        ],
        answer: 2,
        explain: "$100 risk ÷ 40 pips = $2.50 per pip. At ~$1 per pip per mini lot, that's 2.5 mini lots — a quarter of a standard lot.",
      },
      {
        q: "The setup needs a wider stop than usual. Risk percent stays fixed, so…",
        options: [
          "Position size shrinks — the same dollars spread over more pips",
          "Position size grows to keep the pip value constant",
          "Dollar risk doubles to match the distance",
          "You skip the formula for this one trade",
        ],
        answer: 0,
        explain: "Stop distance is the divisor: wider stop, smaller size, identical dollar risk. The formula bends the size, never the risk.",
      },
      {
        q: "The formula says 3.1 mini lots but your broker only takes whole mini lots. You trade…",
        options: [
          "4 — round up so the winner pays more",
          "3 — round down, so real risk never exceeds planned risk",
          "3.5 as a fair compromise",
          "0 — abandon the trade entirely",
        ],
        answer: 1,
        explain: "Always round down. Rounding up makes actual risk quietly exceed the plan — and quiet exceptions are how the 1% rule dies.",
      },
    ],
  },
] as const;
