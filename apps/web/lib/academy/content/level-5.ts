/* =========================================================================
 * Level 5 — Strategy Lab. Indicators as context, entry archetypes, and a
 * first strategy specified precisely enough to test.
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_5: readonly LessonContent[] = [
  {
    slug: "indicators-without-superstition",
    title: "Indicators without superstition",
    hook: "An indicator is price, squashed. Useful lens — terrible oracle.",
    summary:
      "What moving averages, RSI and ATR actually measure, how professionals use them as context instead of signals, and why stacking five more indicators makes a chart dumber, not smarter.",
    sections: [
      {
        h: "Indicators are just price, squashed",
        paras: [
          "Every indicator on every platform is built the same way: take prices you can already see, run them through arithmetic, draw the result. A 20-period moving average is literally the last 20 closes added up and divided by 20 — nothing arrives from outside the chart. That means an indicator can never know something price doesn't. What it CAN do is compress: turn 20 candles of noise into one smooth line your eye reads in half a second.",
          "That compression is the honest job. A rising 20-period average on EURUSD says “the last 20 closes have been drifting up” — a fact, summarized. It does not say “buy now.” The superstition starts the moment a summary of the past gets promoted to a promise about the future. Professionals use indicators the way a pilot uses instruments: to describe conditions, never to fly the plane alone.",
        ],
        figure: {
          kind: "trend-structure",
          caption:
            "Higher highs and higher lows are the trend. A moving average only smooths what this structure already shows — when the two agree, the summary is trustworthy.",
        },
        callout: {
          tone: "story",
          title: "The rear-view mirror",
          body: "Every indicator is computed from candles that already closed. It's a rear-view mirror: genuinely useful for knowing where you've been, dangerous the moment you steer by it alone.",
        },
      },
      {
        h: "Three lenses that earn their place",
        paras: [
          "You could install a hundred indicators today. Three cover almost everything a rules-based trader needs, because each one compresses a different question about the market. Learn what each actually measures, and — just as important — the superstition each one attracts.",
        ],
        table: {
          caption: "The three workhorses: what they compress, how pros read them",
          head: ["Indicator", "Honest use", "The superstition"],
          rows: [
            [
              "Moving average (MA)",
              "Trend context: is price holding above or below its recent average? Which way is the average sloping?",
              "“Price crossed the MA — buy!” Crosses fire constantly in ranges and lag badly in trends.",
            ],
            [
              "RSI",
              "Momentum context: how one-sided has recent movement been? Readings near the extremes mean “stretched,” not “finished.”",
              "“RSI is over 70, it must fall.” In strong trends RSI can sit above 70 for weeks while price doubles.",
            ],
            [
              "ATR",
              "Volatility ruler: how far does this market typically travel per candle? Sizes stops and targets to the market's actual stride.",
              "Almost none — which is exactly why ATR is the least famous and the most useful of the three.",
            ],
          ],
        },
        check: {
          q: "RSI on GBPUSD reads 78. What do you actually know?",
          options: [
            "Price will reverse within a few candles",
            "Recent movement has been strongly one-sided — and that's all",
            "Smart money is selling",
            "The uptrend is confirmed safe to buy",
          ],
          answer: 1,
          explain:
            "RSI compresses recent momentum into a number. 78 means the recent push was lopsided — stretched, not finished. Strong trends stay 'overbought' for weeks.",
        },
      },
      {
        h: "The indicator-soup trap",
        paras: [
          "Here's the trap every beginner walks into: a losing week feels like missing information, so you add an indicator. Another losing week, another indicator. Six months later the chart has seven overlays, the candles are barely visible, and every trade requires five agreeing signals — which happens so rarely that when it does, you bet too big out of sheer relief. The soup didn't add information. It added lag, contradiction, and an excuse for every outcome.",
          "The math explains why. Every one of those seven indicators is computed from the same closing prices, so they mostly move together — seven rephrasings of one sentence. Agreement between them isn't confirmation; it's an echo. Worse, with enough dials to turn, you can tune any combination until it perfectly explains the past. That's called curve-fitting, and it produces strategies that ace history and faceplant on Monday. When you meet backtesting in Level 6, the rule will be blunt: every added indicator is a cost that must prove it earns its place.",
          "The professional pattern is the opposite of soup: at most one lens per question. One trend lens (an MA, or just structure from Level 3), one volatility ruler (ATR), and price itself for the trigger. If two indicators answer the same question, delete one. A chart you can read in five seconds beats a chart that needs a legend.",
        ],
        callout: {
          tone: "warn",
          title: "Agreement is not evidence",
          body: "Five indicators built from the same closes agreeing with each other is one opinion wearing five costumes. Real confluence — from Level 3 — stacks INDEPENDENT reasons: structure, level, session. Not echoes.",
        },
      },
      {
        h: "ATR: the honest ruler for stops",
        paras: [
          "One indicator deserves a section of its own, because it fixes the most expensive beginner habit: placing stops by feel. ATR — average true range — measures how far a market typically travels per candle. If ATR(14) on 1-hour EURUSD reads 12 pips, the market's normal breathing is about 12 pips an hour. A 5-pip stop in that market isn't cautious — it's a donation, stopped out by ordinary noise before the idea is even tested.",
          "The fix is to measure the stop in breaths, not vibes. A common rule: stop distance = 1.5 × ATR beyond your invalidation level. With ATR at 12 pips, that's an 18-pip buffer — wide enough that random wiggle doesn't tag it, tight enough that a genuine reversal does. Then position sizing from Level 2 takes over: risking 1% of a $5,000 account is $50; $50 across an 18-pip stop means about $2.70 per pip, so roughly 0.27 mini lots. Notice the order — the market's volatility set the stop, the stop set the size. Never the reverse.",
        ],
        figure: {
          kind: "position-size-math",
          caption:
            "Account → risk % → stop distance → size. ATR feeds the third box: the stop is measured in the market's own stride, and size is whatever makes that stop cost exactly your planned risk.",
        },
        check: {
          q: "ATR(14) on your chart is 12 pips and your rule is a 1.5 × ATR stop. Price wiggles 10 pips against you after entry. What happens?",
          options: [
            "You're stopped out — the trade failed",
            "Nothing — 10 pips is inside the 18-pip buffer, which was sized to survive normal noise",
            "You should move the stop closer to lock in safety",
            "You should double the position since price is cheaper",
          ],
          answer: 1,
          explain:
            "1.5 × 12 = 18 pips. A 10-pip wiggle is ordinary breathing, and the ATR-sized stop was built to hold through exactly that. Moving or averaging in would be feel overriding the ruler.",
        },
      },
    ],
    terms: [
      { term: "indicator", def: "Arithmetic run on past prices and drawn on the chart. A summary of what already happened — never outside information." },
      { term: "moving average", def: "The average of the last N closes, redrawn each candle. Smooths noise into a trend-context line." },
      { term: "RSI", def: "Relative Strength Index — compresses recent momentum into 0-100. Extremes mean 'stretched,' not 'about to reverse.'" },
      { term: "ATR", def: "Average True Range — how far the market typically travels per candle. The honest ruler for stop distances." },
      { term: "indicator soup", def: "Stacking overlapping indicators until the chart is unreadable and every outcome has an excuse. Echo, not evidence." },
      { term: "curve-fitting", def: "Tuning settings until a strategy perfectly explains the past — and reliably fails on the future." },
    ],
    quiz: [
      {
        q: "Where does the information inside an indicator come from?",
        options: [
          "The broker's private data feed",
          "The same past prices already visible on your chart",
          "Order flow from big banks",
          "A prediction model of future prices",
        ],
        answer: 1,
        explain:
          "Every indicator is arithmetic on candles that already closed. It compresses what you can already see — it cannot know what price doesn't.",
      },
      {
        q: "The professional use of a moving average is…",
        options: [
          "Buying every time price crosses above it",
          "Context — a one-glance summary of whether recent closes drift up or down",
          "Predicting exact reversal points",
          "Replacing a stop loss",
        ],
        answer: 1,
        explain:
          "An MA describes conditions like a pilot's instrument. Trading its crosses as signals fires constantly in ranges — summary, not oracle.",
      },
      {
        q: "Why is seven indicators agreeing NOT strong confirmation?",
        options: [
          "Because seven is an unlucky number of indicators",
          "Because indicators only work on daily charts",
          "Because they're all computed from the same closes — one opinion in seven costumes",
          "Because agreement only counts on forex pairs",
        ],
        answer: 2,
        explain:
          "Derived from the same prices, they mostly move together. Agreement between echoes isn't evidence — real confluence stacks independent reasons.",
      },
      {
        q: "ATR(14) reads 12 pips on 1-hour EURUSD. A 5-pip stop is…",
        options: [
          "Smart — smaller stops mean smaller losses",
          "Inside the market's normal hourly breathing — noise will tag it before the idea is tested",
          "Required by most brokers",
          "Fine as long as the trend is up",
        ],
        answer: 1,
        explain:
          "The market's typical stride is 12 pips an hour. A 5-pip stop gets hit by ordinary wiggle, not by being wrong. Measure stops in breaths, not vibes.",
      },
      {
        q: "You tune a 3-indicator combo until it wins 80% of trades in last year's data. Most likely you have…",
        options: [
          "A strategy ready for real money",
          "A curve-fit — settings that memorized the past and will faceplant on new data",
          "Proof that indicators beat price action",
          "A signal worth selling to others",
        ],
        answer: 1,
        explain:
          "With enough dials, any past can be explained perfectly. That's memorization, not edge — which is why Level 6 makes every rule earn its place on unseen data.",
      },
    ],
  },

  {
    slug: "breakout-or-pullback",
    title: "Breakout or pullback",
    hook: "Every entry ever taken is one of two doors. Pick yours on purpose.",
    summary:
      "The two entry archetypes behind every strategy — breakout and pullback — when each one wins, when each one bleeds, and why a failed breakout is some of the best information a chart ever gives you.",
    interactive: { kind: "replay", scenario: "stop-and-run" },
    sections: [
      {
        h: "Two doors into every trend",
        paras: [
          "Strip the branding off any strategy ever sold and you find one of two entries. Door one, the breakout: price has been compressed in a range — say EURUSD stuck between 1.0800 and 1.0840 for two days — and you enter the moment it escapes, buying the push through 1.0840 because compression tends to resolve into expansion. Door two, the pullback: a trend is already running — higher highs, higher lows from Level 3 — and instead of chasing, you wait for the routine dip back toward support or the average, buying the retreat around 1.0820 after a push to 1.0860.",
          "Same market, opposite temperaments. The breakout trader pays a worse price for confirmation that the move is already happening. The pullback trader gets a better price and a tighter stop, but pays in a different currency: waiting, and sometimes watching the train leave without them. Neither door is 'the good one.' Each wins in a different market mood — and each has a failure mode that funds the other side.",
        ],
        figure: {
          kind: "chart-patterns",
          caption:
            "The three shapes that matter: a range (compression), a flag (a trend catching its breath), and a false break (the trap). Breakouts trade the escape from the first two; the third is the breakout's tuition bill.",
        },
      },
      {
        h: "When each door wins — and when it bleeds",
        paras: [
          "Breakouts win when compression genuinely resolves: after long quiet ranges, into session opens with fresh volume — the London open from Level 3 is the classic — and around scheduled news that brings real repricing. They bleed in sleepy conditions, where the market pokes a pip above the range, finds no follow-through, and slides back — the false break. A breakout trader in a ranging market can be stopped out four times in a row at the same level, one polite 1R donation per attempt.",
          "Pullbacks win when a trend is established and orderly — each dip to the rising average finds buyers, and the trader who waited gets trend-direction entries at discount prices with stops tucked under a real swing low. They bleed at the worst possible moment: the trend's end. The dip that doesn't stop dipping looks, for its first few candles, exactly like every dip that paid. That's why pullback traders live and die by the invalidation level: below the last higher low, the trend story is dead and so is the trade — a rule decided before entry, not during it.",
        ],
        table: {
          caption: "The two archetypes, side by side",
          head: ["", "Breakout", "Pullback"],
          rows: [
            ["You enter when", "Price escapes a range or pattern", "A trend dips back to support or the average"],
            ["Best conditions", "Compression ending: session opens, post-news expansion", "Established, orderly trends with clean structure"],
            ["Worst conditions", "Quiet ranges — false breaks farm you", "Trend exhaustion — the dip that never stops"],
            ["Price you pay", "Worse entry, in exchange for confirmation", "Waiting, and sometimes missing the move entirely"],
            ["Stop lives", "Back inside the range", "Below the swing low (or above, for shorts)"],
          ],
        },
        check: {
          q: "EURUSD has ranged 40 pips wide for three quiet days. Which entry archetype is currently in its BLEEDING conditions?",
          options: [
            "Pullback — trends hate quiet markets",
            "Breakout — sleepy ranges produce false breaks that stop traders out repeatedly",
            "Both bleed equally in every market",
            "Neither — quiet markets are free money",
          ],
          answer: 1,
          explain:
            "Quiet, rangey conditions are exactly where pokes above the boundary die and reverse. Breakout entries in that mood pay 1R tuition per attempt until real expansion arrives.",
        },
      },
      {
        h: "The failed break is information, not just a loss",
        paras: [
          "Watch the replay above closely, because it shows the market's oldest trick. Price grinds toward an obvious level — a range high everyone can see — pokes through it, triggers the breakout buyers and the stops of the shorts, then reverses hard. The stop-and-run. If you were the breakout buyer, you paid 1R to learn something. The question is whether you actually collect the lesson.",
          "Here's what the failed break tells anyone willing to listen: real money just showed its hand. Enough sellers were waiting above that level to absorb every breakout buyer AND the fuel from triggered stops — and price still fell. That is a measurable fact about who's stronger up there, and it's information a candle chart rarely states more plainly. Professionals trade the failure itself: the false break above resistance that snaps back into the range is a short setup with a stop just above the failed poke — often tighter and better-informed than the breakout trade that just died.",
          "This is the deepest lesson of the level: entries aren't just bets, they're experiments. A breakout attempt that fails didn't only cost 1R — it produced evidence about where the real supply and demand sits. Traders who read failures get paid twice on the same level: once by skipping the trap, once by trading the snap-back.",
        ],
        figure: {
          kind: "support-resistance",
          caption:
            "One level, three acts: the bounce, the break, the retest. A break that fails the retest and falls back through is the market announcing the level still holds — tradable information.",
        },
        callout: {
          tone: "tip",
          title: "Ask what the loss proved",
          body: "After any stopped breakout, ask one question before re-entering anything: what did that failure just prove about the level? If the answer is 'the other side is strong there,' fading the failure beats re-trying the break.",
        },
      },
      {
        h: "Pick one door and drill it",
        paras: [
          "You'll eventually be fluent in both archetypes. You should NOT start with both. A beginner running breakout and pullback rules at once can't tell which one is losing money in which conditions — the journal turns to mud. Pick the door that fits your temperament: if waiting through a dip while the trade goes briefly against you makes your skin crawl, drill breakouts. If chasing a moving price feels like paying full retail out of panic, drill pullbacks.",
          "Whichever you choose, the next lesson turns it into something no archetype is on its own: a complete, testable strategy — market, session, setup, trigger, stop, target and risk, written so precisely a stranger could trade it. The door is one line of that spec. Time to write the rest.",
        ],
      },
    ],
    terms: [
      { term: "breakout entry", def: "Entering as price escapes a range or pattern, betting compression resolves into expansion. Pays a worse price for confirmation." },
      { term: "pullback entry", def: "Entering a running trend on its routine dip back to support or the average. Better price, but risks the dip that never stops." },
      { term: "false break", def: "A poke through an obvious level that finds no follow-through and reverses. The breakout trader's tuition bill." },
      { term: "stop-and-run", def: "A push through a level that exists mainly to trigger stops and trap breakout traders before price reverses." },
      { term: "retest", def: "Price returning to a broken level to check whether it now holds from the other side. The market's own confirmation step." },
      { term: "invalidation level", def: "The price at which your trade's story is provably wrong — where the stop lives, decided before entry." },
    ],
    quiz: [
      {
        q: "The core trade-off of a breakout entry is…",
        options: [
          "Better price, but you must wait longer",
          "Worse price, in exchange for confirmation the move is already underway",
          "No stop loss is needed",
          "It only works on crypto",
        ],
        answer: 1,
        explain:
          "Breakout traders buy the escape — after it starts. Confirmation costs you entry price; pullback traders make the opposite trade of that same bargain.",
      },
      {
        q: "Pullback entries are MOST dangerous when…",
        options: [
          "The trend is orderly with clean higher lows",
          "The spread is tight",
          "The trend is ending — the dip that doesn't stop looks exactly like every dip that paid",
          "The session is London",
        ],
        answer: 2,
        explain:
          "Every pullback looks routine for its first candles. The defense isn't prediction — it's the invalidation level below the last higher low, set before entry.",
      },
      {
        q: "Price pokes 3 pips above a two-day range high, stalls, and falls back inside within two candles. The most useful reading is…",
        options: [
          "The breakout is merely delayed — buy the next poke bigger",
          "Sellers just absorbed the breakout buyers AND the triggered stops — the upside is weaker than it looked",
          "The level no longer matters",
          "The chart is broken",
        ],
        answer: 1,
        explain:
          "A failed break is a measurement: enough real supply sat above the level to soak up all that buying and still push price back. That's information, not just a loss.",
      },
      {
        q: "Why do professionals sometimes SHORT a failed breakout above resistance?",
        options: [
          "Revenge for their stopped long",
          "The failure proved strong sellers at the level, and the stop above the failed poke is tight and well-informed",
          "Shorting is always safer than buying",
          "To cancel the spread cost",
        ],
        answer: 1,
        explain:
          "The failure itself is the setup: proven supply overhead, a snap-back in motion, and a clear invalidation just above the poke that failed.",
      },
      {
        q: "Why drill ONE archetype first instead of trading both from day one?",
        options: [
          "Brokers limit accounts to one strategy",
          "Running both muddies the journal — you can't tell which rules lose money in which conditions",
          "Pullbacks are illegal on funded accounts",
          "Breakouts and pullbacks can't exist in the same market",
        ],
        answer: 1,
        explain:
          "One door, drilled and journaled, produces clean evidence about what works. Two doors at once produce mud — and Level 6 runs on clean evidence.",
      },
    ],
  },

  {
    slug: "build-your-first-strategy",
    title: "Build your first strategy",
    hook: "If two strangers can't take the same trades from your rules, you don't have rules.",
    summary:
      "Turning an entry archetype into a falsifiable rule set — market, session, setup, trigger, stop, target, risk — with a complete worked example written out line by line, ready for testing.",
    sections: [
      {
        h: "From taste to rules",
        paras: [
          "Everything so far — structure, levels, sessions, archetypes, indicators — is taste. Taste picks good ingredients; it doesn't cook dinner. A strategy is the recipe: a written rule set so precise that the question 'do I take this trade?' has a yes/no answer a machine could check. The test is brutal and simple: hand your rules to two strangers, give them the same chart for a month, and they should take the SAME trades. Every place their trades differ is a place your 'rule' is actually a mood.",
          "Precision buys you something bigger than tidiness: falsifiability. Vague rules can never be wrong — 'buy strong pullbacks in good trends' survives any losing streak, because you can always decide that dip wasn't 'strong.' Written rules can be wrong, which sounds bad and is actually the prize. Only a rule set that CAN fail can be tested, trusted, improved — or honestly thrown away. Vague trading isn't just untestable; it's unfalsifiable, and unfalsifiable means unfixable.",
        ],
        check: {
          q: "Why is 'buy strong pullbacks in good trends' NOT a strategy?",
          options: [
            "Pullbacks don't work in trends",
            "It never says what counts as 'strong' or 'good' — two strangers would take different trades, so it can't be tested or proven wrong",
            "It's missing an indicator",
            "Strategies must be about breakouts",
          ],
          answer: 1,
          explain:
            "A rule set earns the name only when it's falsifiable — precise enough to fail. 'Strong' and 'good' are moods wearing a rule costume.",
        },
      },
      {
        h: "The seven questions every strategy must answer",
        paras: [
          "A complete spec answers seven questions in writing. Miss one and the gap gets filled in-the-moment by feelings — which is exactly the hole tilt crawls through. Here they are, in the order a trade actually meets them.",
        ],
        table: {
          caption: "The strategy spec: seven questions, seven written answers",
          head: ["Question", "It defines", "Example of a real answer"],
          rows: [
            ["Market", "Exactly which instrument(s)", "EURUSD only"],
            ["Session", "When you're allowed to trade at all", "London, 07:00-11:00 UTC"],
            ["Setup", "What the chart must show before you care", "Uptrend: price above rising 20-MA with a higher low in the last 24h"],
            ["Trigger", "The precise event that fires the entry", "Pullback touches the 20-MA, then a 1-hour candle closes back above it"],
            ["Stop", "Where the idea is provably dead", "1.5 × ATR(14) below the pullback low"],
            ["Target", "Where and how you take profit", "Fixed 2R limit order, placed with the entry"],
            ["Risk %", "What one loss costs the account", "0.5% of equity per trade, sized from the stop distance"],
          ],
        },
        callout: {
          tone: "warn",
          title: "The gap is where tilt gets in",
          body: "Any question you leave unwritten gets answered later — by you, mid-trade, with money on the line and adrenaline voting. Level 7 is entirely about what happens then. Cheaper to write the answer now.",
        },
      },
      {
        h: "A worked example, written out in full",
        paras: [
          "Here is one complete strategy — the pullback door from last lesson, specified end to end. Not a recommendation; a demonstration of what 'done' looks like. Market: EURUSD, nothing else. Session: London only, 07:00-11:00 UTC; no positions opened outside the window. Setup: on the 1-hour chart, price above a rising 20-period MA, with at least one higher low printed in the last 24 hours — no setup, no further interest. Trigger: price pulls back to touch the 20-MA, then a 1-hour candle closes back above it; the entry is a buy on that close. Stop: 1.5 × ATR(14) below the low of the pullback. Target: a limit order at 2R, placed at entry, untouched afterward. Risk: 0.5% of equity per trade — on a $5,000 account that's $25; with an 18-pip stop, about $1.40 per pip, roughly 0.14 mini lots. Management: none. No moving stops, no early exits, no adding. The trade ends at the stop or the target.",
          "Read the spec again and notice what it makes possible. Every trade costs a known amount ($25). Every trade needs the same five facts to line up, so 'do I enter?' takes ten seconds, not ten minutes of vibes. And because a 2R target with 0.5% risk means each winner pays for two losers, the strategy doesn't need to be right most of the time — at 40% winners it still comes out ahead over a big sample. Whether THIS spec actually wins on EURUSD is exactly what you don't know yet — and for once, that's a question with a procedure instead of an opinion.",
        ],
        figure: {
          kind: "risk-reward",
          caption:
            "One trade from the spec: 1R of risk to the stop, 2R to the target. At this shape, 4 winners out of 10 still leaves the account ahead — the win rate stops being the whole story.",
        },
      },
      {
        h: "Your strategy is a hypothesis, not an identity",
        paras: [
          "The spec you just read is a scientific object: a claim about the market, written precisely enough to be wrong. That's the correct relationship to have with it. Traders who treat their strategy as an identity defend it against evidence; traders who treat it as a hypothesis feed it evidence and let the results talk. Same rules, opposite careers.",
          "The loop ahead: first the spec meets history — backtesting, where you replay old charts and take every trade the rules demand, honestly. Survivors meet the present — forward testing on a practice account, where spreads are real and hindsight is gone. Only then does anything meet real money, at the smallest size that still stings. Level 6 walks the first two stages, and the paper-trading capstone is exactly the forward-test in miniature. Bring the spec; the lab is next door.",
        ],
        figure: {
          kind: "strategy-loop",
          caption:
            "Idea → rules → backtest → forward test → live. Your spec has just cleared the second box. Most ideas die in the third — which is the loop working, not failing.",
        },
        callout: {
          tone: "tip",
          title: "Write yours before Level 6",
          body: "Copy the seven questions, answer them for YOUR archetype and instrument, and save the spec. Level 6 will test that document — arriving without one is arriving at the lab with no experiment.",
        },
      },
    ],
    terms: [
      { term: "strategy", def: "A written rule set answering market, session, setup, trigger, stop, target and risk — precise enough that two strangers take the same trades." },
      { term: "falsifiable", def: "Capable of being proven wrong. The property that makes a rule set testable, improvable, or honestly discardable." },
      { term: "setup", def: "The chart conditions that must exist before a trade is even considered. No setup, no interest." },
      { term: "trigger", def: "The single precise event that converts a valid setup into an entry order." },
      { term: "2R target", def: "A profit target placed at twice the stop distance, so each winner pays for two losers." },
      { term: "trade management", def: "Everything you're allowed to do after entry. In a first strategy: nothing — stop or target ends the trade." },
    ],
    quiz: [
      {
        q: "The 'two strangers' test checks whether…",
        options: [
          "Your strategy is profitable",
          "Your rules are precise enough that different people take identical trades from them",
          "You can explain trading at dinner",
          "Two accounts can share one login",
        ],
        answer: 1,
        explain:
          "Same rules, same chart, same trades — or your rules have gaps that moods are filling. The test measures precision, which is what makes testing possible at all.",
      },
      {
        q: "Why is a strategy that CAN fail better than one that can't?",
        options: [
          "Failure builds character",
          "Only falsifiable rules can be tested, trusted, improved, or honestly thrown away — vague rules are unfixable",
          "Losing trades reduce taxes",
          "It isn't — never-wrong rules are the goal",
        ],
        answer: 1,
        explain:
          "'Buy strong pullbacks' survives every losing streak by redefining 'strong.' A written rule that can be wrong is the only kind evidence can improve.",
      },
      {
        q: "In the worked example, what does trade management allow after entry?",
        options: [
          "Moving the stop to breakeven once ahead",
          "Adding to winners",
          "Nothing — the trade ends at the stop or the target, decided before entry",
          "Closing early whenever the trade feels wrong",
        ],
        answer: 2,
        explain:
          "A first strategy bans mid-trade decisions on purpose: every one is a gap for feelings to crawl through, and the point is producing clean, testable evidence.",
      },
      {
        q: "The worked example risks 0.5% with a 2R target. At only 40% winners over 200 trades, the account…",
        options: [
          "Must lose — you need to win more than half your trades",
          "Comes out ahead — each winner pays for two losers, so 40% wins clears the bar",
          "Breaks exactly even",
          "Depends entirely on leverage",
        ],
        answer: 1,
        explain:
          "Per 10 trades: 4 winners × 2R = +8R against 6 losers × 1R = −6R, a +2R edge. Reward shape can carry a sub-50% win rate — the math from Level 2, now inside a spec.",
      },
    ],
  },
] as const;
