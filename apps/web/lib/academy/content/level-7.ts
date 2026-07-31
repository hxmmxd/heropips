/* =========================================================================
 * Level 7 — Mind of a Hero. Tilt, streaks and the discipline system — the trader is the last risk
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_7: readonly LessonContent[] = [
  {
    slug: "psychology-of-streaks",
    title: "The psychology of streaks",
    hook: "Two losses in a row and your brain starts lying to you. Plan for it.",
    summary:
      "Why winning and losing streaks bend judgment, how to score decisions instead of outcomes, and the circuit breakers professionals use to stop one bad hour from erasing a good month.",
    interactive: { kind: "replay", scenario: "revenge-spiral" },
    sections: [
      {
        h: "Streaks bend judgment — in both directions",
        paras: [
          "Take a strategy that wins 50% of the time. Across 100 trades it will almost certainly produce a run of five losses in a row, and probably a run of five wins. That's not the strategy breaking — it's coin-flip math doing what coin-flip math does. The problem is what streaks do to the person watching them.",
          "After losses, the brain demands the money back — now. The urge has a name: revenge trading. You re-enter without a setup, at bigger size, because a bigger win would erase the feeling faster. Watch the replay above: one planned trade risking 1R spirals into −7R in three chased entries, each one 'necessary' to undo the last. After wins, the distortion flips — three greens in a row and you feel unstoppable, so size creeps up and setup standards creep down. Both states have one signature: your rules suddenly feel optional. That state is called tilt, and nobody is immune, because it isn't a knowledge problem. You can know everything in this academy and still tilt.",
        ],
        figure: {
          kind: "emotion-cycle",
          caption:
            "The tilt spiral: loss → urgency → bigger, worse trade → deeper loss — and the exit ramps that break it. Every ramp is a rule written before the spiral starts.",
        },
        callout: {
          tone: "warn",
          title: "Tilt doesn't announce itself",
          body: "Nobody thinks 'I am tilted.' They think 'this next one is obvious.' If you notice the urge to skip your checklist or double your size, that IS the announcement.",
        },
      },
      {
        h: "Score the decision, not the outcome",
        paras: [
          "In any single trade, luck decides the outcome. Over hundreds of trades, process decides it. So professionals grade every trade twice: was the decision right (valid setup, correct size, stop where planned), and separately, did it make money? Those are different questions with different answers, and the four combinations tell you exactly what to do next.",
          "The dangerous square isn't the deserved loss — it's the undeserved win. Breaking your rules and getting paid teaches your brain that rules are optional. One rewarded rule-break costs more, over a career, than a week of honest stop-outs.",
        ],
        table: {
          caption: "The process-vs-outcome scoreboard",
          head: ["", "Made money", "Lost money"],
          rows: [
            ["Followed the plan", "Deserved win. Repeat exactly this.", "Paid the odds. Change nothing."],
            ["Broke the plan", "Dumb luck — the most expensive square on the board.", "Deserved loss. Fix the process, not the mood."],
          ],
        },
        check: {
          q: "You skipped your checklist, entered on a hunch — and made 2R. Which square of the scoreboard is this?",
          options: [
            "Deserved win — profit proves the decision",
            "Paid the odds",
            "Dumb luck — the most expensive square on the board",
            "Deserved loss",
          ],
          answer: 2,
          explain:
            "Broke the plan + made money = a rewarded rule-break. It pays once, then charges interest by teaching your brain the rules are optional.",
        },
      },
      {
        h: "Circuit breakers: decide the limits before you need them",
        paras: [
          "You can't out-discipline tilt in the moment, so professionals don't try. They install circuit breakers — rules written while calm that remove the decision while tilted. Three do most of the work. A daily stop: down a fixed amount for the day (commonly −2% to −3% of the account), you're done trading until tomorrow — no exceptions, no 'one more.' A size lock: after two consecutive losses, size drops to half or trading pauses; whatever streaks do to your judgment, they can no longer do it at full size. A walk-away rule: after any stop-out, a fixed cooldown — say 30 minutes away from the screen — before the next entry is allowed, which is exactly the pause the revenge spiral never takes.",
          "The catch: a circuit breaker enforced by willpower fails precisely when it's needed, because the enforcer is the one who's tilted. That's why HeroPips builds each one into Trade Guard as software. The daily stop is the daily loss breaker (daily_stop: −3.0% equity — trading halts the moment realized plus open losses cross the line). The size lock is risk-% sizing (max_risk: 1.0% equity per trade — computed from your stop distance, so tilted size simply cannot be submitted). The walk-away rule is a cooldown timer that rejects new orders for a set window after a loss. The software isn't smarter than you — it's just never tilted.",
        ],
        callout: {
          tone: "tip",
          title: "Write your breakers today",
          body: "Daily stop, size lock, walk-away time — three numbers, written while calm. Decided in advance they're rules; decided during a losing streak they're negotiations, and tilt wins negotiations.",
        },
      },
    ],
    terms: [
      { term: "tilt", def: "An emotional state — after losses or wins — where rules feel optional and decisions serve feelings instead of the plan." },
      { term: "revenge trading", def: "Re-entering after a loss without a setup, usually at bigger size, to win the money back and erase the feeling." },
      { term: "process vs outcome", def: "Grading whether the decision followed the plan separately from whether the trade made money. Luck owns one trade; process owns a hundred." },
      { term: "circuit breaker", def: "A pre-committed rule that halts or restricts trading when a limit is hit, removing in-the-moment judgment." },
      { term: "daily stop", def: "A fixed daily loss limit — commonly −2% to −3% of equity — after which trading stops until the next day." },
    ],
    quiz: [
      {
        q: "A strategy that wins 50% of the time hits five losses in a row. What does that prove?",
        options: [
          "The strategy is broken and needs changing",
          "Nothing by itself — runs like that are normal coin-flip math",
          "The market has changed character",
          "The next trade is due to win",
        ],
        answer: 1,
        explain: "Streaks are guaranteed by probability, not evidence of anything. Judging a strategy needs hundreds of trades, not five.",
      },
      {
        q: "Revenge trading is dangerous mostly because…",
        options: [
          "It happens outside your best trading hours",
          "Brokers charge more after losses",
          "It combines no setup with bigger size — the worst trades get the most money",
          "It's illegal on funded accounts",
        ],
        answer: 2,
        explain: "The spiral's signature: quality drops while size rises. One planned −1R becomes −3R, then −7R, in trades that were never in the plan.",
      },
      {
        q: "You broke your rules, entered without a setup — and made money. In process-vs-outcome terms this is…",
        options: [
          "A deserved win: profit is the point",
          "A neutral result",
          "Proof your instincts beat your plan",
          "The most expensive square: a rewarded rule-break trains you to break rules again",
        ],
        answer: 3,
        explain: "Dumb luck pays once and then charges interest. Rewarded rule-breaks are how disciplined traders un-learn their discipline.",
      },
      {
        q: "Why do professionals automate circuit breakers instead of relying on willpower?",
        options: [
          "Willpower fails exactly when the breaker is needed — the enforcer is the tilted one",
          "Automation reacts faster to news",
          "Regulators require it",
          "It improves the strategy's win rate",
        ],
        answer: 0,
        explain: "A breaker enforced by the person it's meant to stop isn't a breaker — it's a suggestion. Software holds the line because it never tilts.",
      },
      {
        q: "Which Trade Guard rule encodes the classic 'down 3% today, done for the day'?",
        options: [
          "Symbol allowlist",
          "The daily loss breaker — trading halts when losses cross the daily limit",
          "Risk-% sizing",
          "The news filter",
        ],
        answer: 1,
        explain: "daily_stop: −3.0% equity is the daily stop as software: the halt happens the moment the line is crossed, with no one-more-trade negotiation.",
      },
    ],
  },
  {
    slug: "tilt-revenge-and-fomo",
    title: "Tilt, revenge and FOMO",
    hook: "Your body knows you're tilted minutes before your account does. Learn its signal.",
    summary:
      "The anatomy of the revenge spiral, why FOMO entries buy the worst price on the chart, how to catch tilt in your body before it reaches your account, and the hard-coded circuit breakers that end the spiral for you.",
    interactive: { kind: "replay", scenario: "revenge-spiral" },
    sections: [
      {
        h: "Anatomy of the revenge spiral",
        paras: [
          "The spiral has a fixed anatomy, and it's worth dissecting one turn at a time. Act one: a planned trade loses 1R — say $50 on a $5,000 account. Completely normal; the spec priced it in. Act two: the loss doesn't feel like $50, it feels like an insult, and the brain proposes a fix: get it back NOW. Act three: a new entry appears — no setup, because no setup is present — at double size, because winning $100 would erase the insult faster. Act four: the no-setup trade does what no-setup trades do, and now you're down 3R and the insult is louder. Act five: repeat, bigger. Run the replay above and watch one planned −1R become −7R in under an hour: three entries, zero setups, rising size.",
          "Notice what the spiral is actually made of. Not one bad decision — a feedback loop where each loss increases the urgency and lowers the quality of the next trade. Quality falling while size rises is the spiral's fingerprint, and it's why the damage is never linear. The first trade cost $50. The spiral cost $350 — seven boring, plan-following losses' worth — plus something more expensive: the week of confidence it takes to trust yourself again.",
        ],
        figure: {
          kind: "emotion-cycle",
          caption:
            "One lap of the spiral: loss → urgency → bigger, worse entry → deeper loss. The exit ramps are pre-written rules — the loop has no natural exit from the inside.",
        },
      },
      {
        h: "FOMO: the spiral's twin",
        paras: [
          "Revenge is tilt after a loss. FOMO — fear of missing out — is tilt after someone ELSE's win, including the market's. GBPUSD rips 40 pips while you watch, correctly flat because no setup fired. Each green candle whispers that everyone is getting rich except you, and eventually you buy — not because a rule fired, but to make the feeling stop.",
          "Look at what that purchase actually is: the worst entry on the chart, by construction. You bought AFTER the 40-pip move, at maximum price, exactly where early buyers are taking profit into your order. And where does the stop go? The move you chased left no structure nearby — the nearest sensible invalidation is 40 pips back where the move began, so you either take an oversized stop or a made-up one. Late entry, no stop logic, emotional trigger: FOMO manufactures the mirror image of everything Level 5 taught. The cure is a sentence: a move you missed is a trade that was never yours. The market prints setups every week; it never runs out. Missing one costs nothing — chasing it costs the spread, the retrace, and the discipline.",
        ],
        check: {
          q: "GBPUSD just ran 40 pips without you. Buying now means…",
          options: [
            "Catching the trend early",
            "Entering at maximum price, into profit-takers, with no sensible nearby stop — the mirror image of a planned entry",
            "A normal breakout trade",
            "Nothing — entries don't matter in a trend",
          ],
          answer: 1,
          explain:
            "You'd be paying the worst price of the move to make a feeling stop, with invalidation 40 pips away. A missed move costs nothing; a chased one costs three ways at once.",
        },
      },
      {
        h: "Your body files the report first",
        paras: [
          "Here's the practical secret of tilt: it's physical before it's financial. Minutes before the revenge entry, the body has already filed its report — heat in the face, a jaw you didn't notice clenching, leaning into the screen, clicking between timeframes every few seconds, checking P&L for the fourth time in a minute. The thought stream changes too: 'it OWES me,' 'this next one is obvious,' 'rules are for normal conditions.' None of this shows on the account yet. All of it shows in the chair.",
          "That gap — body signal now, account damage in ten minutes — is the only window where catching tilt yourself is realistic. So professionals treat the signals as data: many keep a tilt column in the journal from Level 6 and log the state (calm, edgy, tilted) with every trade. After 50 trades the pattern is undeniable — the 'edgy' rows lose money at triple the rate — and the body's signals stop being feelings and become a tape you've learned to read. The rule that follows is mechanical: notice two signals, stand up. Not 'trade more carefully' — stand up, walk, water, five minutes. Careful tilted trading is still tilted trading.",
        ],
        callout: {
          tone: "story",
          title: "The chair knows",
          body: "A funded trader put it this way: 'I don't catch my tilt in my P&L. I catch it in my posture. When my nose is a foot from the screen, I'm not analyzing — I'm hunting. And hunting costs me money.'",
        },
      },
      {
        h: "Circuit breakers: because you can't referee yourself",
        paras: [
          "Body awareness is the early-warning system, but no professional relies on it alone, because the referee and the offender are the same person. The spiral ends reliably only when the ending is hard-coded — decided while calm, enforced by something that can't tilt. Two breakers do the heavy lifting. The daily stop: down −3% for the day, trading is over until tomorrow — the spiral needs another trade to continue, and there isn't one. The walk-away rule: after ANY stop-out, a fixed cooldown — 30 minutes minimum, away from the screen, before the next order — which inserts the exact pause the spiral is built to skip. Written on paper these are policies; wired into software they're walls. Trade Guard enforces both: the daily loss breaker halts trading the moment the −3% line is crossed, and the cooldown timer rejects orders inside the window. The software isn't wiser than you — it just doesn't have a body to tilt with.",
          "One honest expectation before the quiz: breakers don't make tilt stop happening. Ten years in, a bad loss will still light the same fuse — professionals aren't calmer than you, they're better defended. The goal was never to feel nothing. It's to make sure the feeling has nowhere to spend your money.",
        ],
        figure: {
          kind: "equity-curve",
          caption:
            "Two accounts, same strategy: steady 1% risk versus the same trader with occasional tilted, oversized entries. The spiral doesn't dent a curve — it cliffs it.",
        },
        callout: {
          tone: "tip",
          title: "Two numbers, tonight",
          body: "Your daily stop (−2% to −3%) and your walk-away time (30+ minutes). Write them while calm, wire them into Trade Guard when you go live. Rules decided in advance are walls; rules decided mid-spiral are negotiations, and tilt wins negotiations.",
        },
      },
    ],
    terms: [
      { term: "revenge spiral", def: "The loop where each loss raises urgency and lowers trade quality: no-setup entries at rising size until a breaker — or the account — stops it." },
      { term: "FOMO", def: "Fear of missing out — entering late because a move ran without you, buying maximum price to make a feeling stop." },
      { term: "chasing", def: "Entering after a move has already run, far from any sensible invalidation. The signature FOMO trade." },
      { term: "tilt signals", def: "The body's early warnings — heat, clenched jaw, rapid clicking, obsessive P&L checks — arriving minutes before the account damage." },
      { term: "walk-away rule", def: "A fixed cooldown after any stop-out — commonly 30+ minutes off-screen — inserting the pause the spiral is built to skip." },
      { term: "cooldown timer", def: "The walk-away rule as software: new orders are rejected for a set window after a loss, no willpower required." },
    ],
    quiz: [
      {
        q: "The fingerprint of a revenge spiral is…",
        options: [
          "Many small planned losses in a row",
          "Trade quality falling while position size rises",
          "Trading a new instrument",
          "Winning too fast",
        ],
        answer: 1,
        explain:
          "Planned losses at planned size are just the odds being paid. The spiral's signature is the inverse correlation: worse setups getting more money, each turn of the loop.",
      },
      {
        q: "Why is a FOMO entry structurally — not just emotionally — a bad trade?",
        options: [
          "It happens outside London hours",
          "It buys after the move at maximum price, into profit-takers, with no sensible nearby stop",
          "Brokers widen spreads for late buyers",
          "It's only bad if it loses",
        ],
        answer: 1,
        explain:
          "Late price, sellers overhead, invalidation 40 pips away: FOMO manufactures the exact opposite of a planned entry, regardless of how the individual trade ends.",
      },
      {
        q: "Where does tilt usually show up FIRST?",
        options: [
          "In the account balance",
          "In the body — heat, clenched jaw, rapid clicking, obsessive P&L checks",
          "In the broker's margin warnings",
          "In the news feed",
        ],
        answer: 1,
        explain:
          "The body files its report minutes before the damage posts to the account. That gap is the only window where catching yourself is realistic — which is why pros journal the state.",
      },
      {
        q: "You notice two tilt signals mid-session. The rule this lesson gives is…",
        options: [
          "Trade more carefully until the feeling passes",
          "Halve your size and continue",
          "Stand up and leave the screen — careful tilted trading is still tilted trading",
          "Switch to a calmer instrument",
        ],
        answer: 2,
        explain:
          "Tilt isn't fixed by concentration — the judge is compromised. The mechanical response is physical: stand, walk, water, minutes away. The market will still be there.",
      },
      {
        q: "Why does the walk-away rule specifically defeat the revenge spiral?",
        options: [
          "It improves the next trade's win rate",
          "The spiral runs on immediate re-entry — a forced cooldown inserts the exact pause the loop is built to skip",
          "It reduces spread costs",
          "It resets the daily stop",
        ],
        answer: 1,
        explain:
          "Each turn of the spiral needs the next trade NOW. A hard-coded 30-minute gap starves the loop of its fuel — and software enforces it because the tilted trader won't.",
      },
    ],
  },

  {
    slug: "habits-of-consistent-traders",
    title: "Habits of consistent traders",
    hook: "Pros don't trade more than you. They repeat better than you.",
    summary:
      "The professional daily routine — prep, execution window, review — habit loops applied to trading, why environment beats willpower, and the arithmetic of why boring consistency compounds into an edge.",
    sections: [
      {
        h: "The routine: prep, window, review",
        paras: [
          "Watch a professional's day and the surprise is how little of it is trading. A workable retail version fits in under two hours. Prep, 15 minutes before the session: mark the levels that matter, check the news calendar for scheduled releases, read your own spec once, write down the ONE setup you're allowed to hunt today. Execution window, 90 minutes: your strategy's session — say London open, 07:00-08:30 UTC — where you either take the trades your rules fire or take nothing. Window closes, platform closes; a valid setup at minute 91 belongs to tomorrow. Review, 10 minutes after: journal every trade against the process-vs-outcome scoreboard, log your tilt state, one sentence on what you'd repeat.",
          "The shape matters more than the schedule. Prep means every in-session decision was actually made calm, in advance. The bounded window means the market gets 90 minutes of your sharpest attention instead of 12 hours of your worst — and overtrading, the spread toll from Level 0, gets structurally impossible. Review means every session feeds the loop you built in Level 6, win or lose. Amateurs trade whenever the phone buzzes. Professionals run the same loop at the same time until it's boring — and the boredom is the point.",
        ],
        figure: {
          kind: "strategy-loop",
          caption:
            "Idea → rules → backtest → forward test → live. The daily review is the return arrow: every session's journal feeds back into better rules. Skip the review and the loop goes open-circuit.",
        },
      },
      {
        h: "Habit loops: make the plan the easy path",
        paras: [
          "Habits run on a three-part loop: cue → routine → reward. The cue triggers the behavior, the routine is the behavior, the reward is why the brain files it for reuse. Trading's problem is that its worst behaviors have BUILT-IN loops. Cue: red P&L. Routine: revenge entry. Reward: the surge of hope — paid instantly, before the trade even resolves, which is exactly how slot machines train people. You can't out-argue a loop like that mid-session. You can only install a competing one and repeat it until it's the default.",
          "The trick professionals use: keep the cue, swap the routine, make the reward immediate. Cue: stop-out (unchanged). New routine: journal the trade against the scoreboard, then stand up for the walk-away timer. New reward: a green checkmark on the process streak — 'followed the plan 14 sessions straight' — which the brain learns to defend as fiercely as it once defended open trades. It sounds childish. It works BECAUSE it's childish: streaks and checkmarks pay the reward now, while 'long-term profitability' pays in months. Give the brain candy for the right routine and it stops begging for candy from the wrong one. Roughly two months of repetition, the research on habit formation suggests, before the new routine stops costing willpower — which is close to the honest timeline for everything else in trading too.",
        ],
        check: {
          q: "Why does rewarding a PROCESS streak (14 plan-following sessions) work better than waiting for profits to motivate discipline?",
          options: [
            "Profits are taxed, streaks aren't",
            "Habit loops need an immediate reward — the checkmark pays now, while profitability pays in months",
            "Streaks improve the win rate directly",
            "It doesn't — only money motivates traders",
          ],
          answer: 1,
          explain:
            "The revenge loop wins because its reward (hope) is instant. A competing habit needs equally instant candy — the streak — or the brain keeps choosing the loop that pays today.",
        },
      },
      {
        h: "Design the environment, not the willpower",
        paras: [
          "Level 7's recurring lesson: willpower fails exactly when needed. The final application is physical. Every discipline failure has an environmental accomplice — the phone that surfaced a hot take mid-trade, the second monitor with a 1-minute chart hypnotizing you into micromanaging a 1-hour trade, the platform left open at 9 p.m. 'just to look.' Instead of resolving to resist harder, remove the accomplice: phone in another room during the window; one chart, your strategy's timeframe only; platform closed outside the window with price ALERTS at your levels instead of eyes on the screen — the alert watches so you don't have to; the spec and your two breaker numbers printed where you can't avoid them.",
          "Each removal converts a decision you'd have to win every session into a decision you won once, while calm. That's the same move as the stop loss, the position-size formula, and Trade Guard's breakers — trading's entire discipline stack is one idea wearing different clothes: decide once, calm, in advance; then make the bad path physically longer than the good one.",
        ],
        callout: {
          tone: "tip",
          title: "One removal beats ten resolutions",
          body: "Tonight, remove ONE accomplice — phone out of the room is the classic. Environment changes hold on your worst day. Resolutions don't, and your worst day is the only day discipline is expensive.",
        },
      },
      {
        h: "Why consistency compounds",
        paras: [
          "Here's the arithmetic that makes the boring routine worth it. Take the Level 5 worked example: 40% winners at 2R, risking a fixed fraction per trade — about +2R of edge per 10 trades. Trader A follows it every session: roughly 20 trades a month, +4R, month after month, compounding quietly. Trader B follows it 80% of the time — same strategy, same skill — and spends the other 20% on tilted entries and FOMO chases averaging −2R apiece. Four undisciplined trades a month is −8R against +3R from the disciplined portion: Trader B runs a NEGATIVE month on a positive strategy. The edge didn't shrink by 20%. It inverted — because errors don't subtract from an edge, they compete with it at bigger size and worse quality.",
          "That's the real reason this level exists. Your edge after Level 6 will be small — real edges are — a few R per month that compounds into something meaningful over years, the honest compounding curve from Level 2, not the doubling schedules from the scam DMs. A small positive number compounds. A small positive number minus regular discipline leaks doesn't. Consistency isn't a personality trait you're born with; it's the routine, the loops, and the environment from this lesson, repeated until the boring path is the automatic one. That is the whole mind of a hero: not fearless — defended.",
        ],
        figure: {
          kind: "equity-curve",
          caption:
            "Steady small risk versus the same edge interrupted by oversized mistakes. The smooth curve isn't a better strategy — it's the same strategy actually followed.",
        },
      },
    ],
    terms: [
      { term: "execution window", def: "The bounded block — often 90 minutes in your strategy's session — that is the only time entries are allowed. Overtrading, structurally removed." },
      { term: "habit loop", def: "Cue → routine → reward. The brain's filing system for behavior — trainable in both directions." },
      { term: "process streak", def: "Consecutive sessions of following the plan, tracked and rewarded regardless of P&L. Instant candy for the right routine." },
      { term: "environment design", def: "Removing temptation's accomplices — phone, extra charts, open platform — so discipline is decided once instead of fought every session." },
      { term: "price alert", def: "A notification when price reaches your level, so the platform can stay closed. The alert watches so you don't have to." },
      { term: "discipline leak", def: "The off-plan trades that compete with your edge at bigger size and worse quality — capable of inverting a positive strategy." },
    ],
    quiz: [
      {
        q: "A valid setup appears five minutes after your execution window closed. The routine says…",
        options: [
          "Take it — valid setups are rare",
          "Take it at half size as a compromise",
          "It belongs to tomorrow — the window's edges are what make the routine a routine",
          "Extend the window by one hour",
        ],
        answer: 2,
        explain:
          "Flex the boundary for a 'clearly valid' setup and every future boundary becomes a negotiation. The window works because its edges are hard — the market prints setups every week.",
      },
      {
        q: "In habit-loop terms, revenge trading persists because…",
        options: [
          "Traders don't know it's harmful",
          "Its reward — the surge of hope — is paid instantly, the same schedule slot machines use",
          "Brokers encourage it",
          "It usually makes money",
        ],
        answer: 1,
        explain:
          "The loop pays NOW, before the trade even resolves. Knowledge doesn't beat that schedule — only a competing routine with an equally immediate reward does.",
      },
      {
        q: "Why does environment design beat willpower for discipline?",
        options: [
          "It's cheaper than a trading course",
          "Removing the accomplice converts a fight you'd face every session into a decision made once, while calm",
          "Willpower is a myth — effort never matters",
          "Because pros have better offices",
        ],
        answer: 1,
        explain:
          "Phone out of the room, platform closed, alerts at your levels: each removal makes the bad path physically longer than the good one. Environment holds on the worst day; resolutions don't.",
      },
      {
        q: "Trader B runs a +2R-per-10-trades strategy but goes off-plan 20% of the time at bigger size. The likely result is…",
        options: [
          "80% of the original profits",
          "The same profits with more excitement",
          "A negative month — off-plan trades compete with the edge at bigger size and worse quality, inverting it",
          "Slightly slower compounding",
        ],
        answer: 2,
        explain:
          "Four −2R leaks against +3R of disciplined edge is a losing month on a winning strategy. Errors don't shave the edge — they overpower it. Consistency IS the edge's delivery mechanism.",
      },
    ],
  },
] as const;
