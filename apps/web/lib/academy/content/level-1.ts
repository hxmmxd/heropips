/* =========================================================================
 * Level 1 — Read the Market. Price stops being noise: pips as the unit
 * of every rule, candles as compressed stories, and timeframes as zoom
 * levels of the same auction. Ported prose from the legacy lessons kept
 * nearly verbatim where it already earned its place.
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_1: readonly LessonContent[] = [
  {
    slug: "what-is-a-pip",
    title: "What a pip actually is",
    hook: "0.0001 looks tiny — until you realize every rule you'll ever write is measured in it.",
    summary:
      "The unit every forex price move is measured in — and why it matters far more for sizing your trades than for bragging about them.",
    interactive: { kind: "replay", scenario: "pip-count" },
    sections: [
      {
        h: "The smallest step a price takes",
        paras: [
          "A pip — “percentage in point” — is the standard unit of price movement in foreign exchange. For most currency pairs it is the fourth decimal place: 0.0001. If EURUSD moves from 1.0842 to 1.0850, it moved 8 pips. If it falls from 1.0842 to 1.0742, that is 100 pips. Yen pairs are the classic exception: because one yen is worth so much less than one euro or dollar, the pip sits at the second decimal, 0.01. USDJPY going from 155.20 to 155.65 is a 45-pip move.",
          "Most brokers today quote one extra digit — a fifth decimal on EURUSD, a third on USDJPY. That last digit is a pipette, one tenth of a pip. When your platform shows 1.08425, read it as 1.0842 and a half. Pipettes matter for spreads; pips are the language of moves, stops and targets.",
        ],
        callout: {
          tone: "tip",
          title: "Read prices out loud",
          body: "1.08425 = “one-oh-eight-forty-two and a half.” Narrating quotes this way for a week makes pip counting automatic — and automatic counting is what lets you think about the trade instead of the arithmetic.",
        },
        figure: {
          kind: "pip-scale",
          caption: "1.08425 under the microscope: the fourth decimal is the pip, and the fifth is the pipette — one tenth of a pip, the digit spreads are quoted in.",
        },
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
          "This is the quiet lesson hiding inside a definition: position size, not prediction, decides what a move costs or pays you. If your stop is 25 pips away and you can only afford to lose $50, arithmetic — not confidence — sets your size: $50 ÷ 25 pips = $2 per pip, which is two mini lots. Level 2 turns that arithmetic into the 1% rule professionals actually use. Learn to see every trade as pips first and money second, and sizing stops being an emotion.",
        ],
        callout: {
          tone: "story",
          title: "Same move, three outcomes",
          body: "Three traders catch the identical 30-pip move. One makes $3, one makes $30, one loses sleep over $300 of swing the other way. The market treated them equally — their size decisions didn't.",
        },
        check: {
          q: "Your stop sits 20 pips away and the most you're willing to lose is $20. What per-pip value can you trade?",
          options: [
            "$0.50 per pip",
            "$1 per pip — about one mini lot on EURUSD",
            "$2 per pip",
            "$20 per pip",
          ],
          answer: 1,
          explain: "$20 ÷ 20 pips = $1 per pip, roughly one mini lot on EURUSD. Arithmetic sets the size — confidence was never in the equation.",
        },
      },
    ],
    terms: [
      { term: "pip", def: "The standard unit of forex movement: 0.0001 on most pairs, 0.01 on yen pairs." },
      { term: "pipette", def: "One tenth of a pip — the extra fifth (or third) decimal most brokers quote." },
      { term: "pip value", def: "What one pip is worth in cash. Scales with position size: ~$10 per standard lot on EURUSD." },
      { term: "standard lot", def: "100,000 units of the base currency. One pip ≈ $10 on EURUSD." },
      { term: "mini lot", def: "10,000 units — one pip ≈ $1 on EURUSD." },
      { term: "micro lot", def: "1,000 units — one pip ≈ $0.10 on EURUSD. Where sensible practice starts." },
    ],
    quiz: [
      {
        q: "USDJPY moves from 155.20 to 155.65. How many pips is that?",
        options: [
          "4.5 pips",
          "0.45 pips",
          "45 pips",
          "450 pips",
        ],
        answer: 2,
        explain: "Yen pairs put the pip at the second decimal (0.01). From 155.20 to 155.65 is 45 hundredths — 45 pips.",
      },
      {
        q: "Your platform quotes EURUSD as 1.08425. That final 5 is…",
        options: [
          "A pipette — one tenth of a pip",
          "A full pip",
          "A rounding error brokers add",
          "The spread",
        ],
        answer: 0,
        explain: "The fifth decimal is a pipette. Read 1.08425 as 1.0842 and a half — pipettes matter for spreads, pips for moves.",
      },
      {
        q: "The same 30-pip move on EURUSD is worth…",
        options: [
          "$300, always",
          "$30, always",
          "$3, always",
          "It depends entirely on your size: ~$3 micro, ~$30 mini, ~$300 standard lot",
        ],
        answer: 3,
        explain: "Pip value scales with position size. The market's move was identical — what it pays or costs is your sizing decision.",
      },
      {
        q: "You can afford to lose $50 and your stop is 25 pips away. What size does the arithmetic allow?",
        options: [
          "$5 per pip — half a standard lot",
          "$2 per pip — two mini lots",
          "$0.50 per pip — half a micro lot",
          "Whatever size feels confident today",
        ],
        answer: 1,
        explain: "$50 ÷ 25 pips = $2 per pip. On EURUSD a mini lot pays about $1 per pip, so two mini lots. Arithmetic sets size, not confidence.",
      },
      {
        q: "Why do traders write their rules in pips instead of dollars?",
        options: [
          "Pips sound more professional",
          "Dollar amounts are impossible to calculate",
          "Pips normalize market distance, so one rule transfers across pairs and account sizes",
          "Brokers only accept orders measured in pips",
        ],
        answer: 2,
        explain: "A 40-pip stop describes the same market distance on any account. Dollars are the output; pips are the input your rules control.",
      },
    ],
  },

  {
    slug: "read-a-candle",
    title: "Read a candlestick like a hero",
    hook: "Four prices, one picture — and one misread that costs beginners more than any indicator ever saved them.",
    summary:
      "OHLC anatomy, what wicks really record, and the green-candle misread that costs beginners the most — plus the one-timeframe-up habit that catches it.",
    interactive: { kind: "candle-anatomy" },
    sections: [
      {
        h: "Four prices, one picture",
        paras: [
          "A candlestick compresses everything that happened in a time window into four prices: Open, High, Low, Close — OHLC. The thick part, the body, spans open to close. The thin lines above and below, the wicks (or shadows), stretch to the highest and lowest prices traded. A candle that closed above its open prints green; one that closed below prints red.",
          "That is the whole anatomy. A 1-hour candle with open 1.0850, high 1.0878, low 1.0846, close 1.0871 tells you: buyers finished 21 pips ahead, price probed 7 pips higher than the close at some point, and sellers only managed 4 pips below the open all hour.",
        ],
        figure: {
          kind: "candle-anatomy",
          caption: "Open, high, low, close on a labeled pair: the body spans open to close, the wicks stretch to the extremes — four prices, one picture.",
        },
      },
      {
        h: "Wicks are rejection records",
        paras: [
          "The body says who won; the wicks say what was attempted and refused. A long upper wick means price visited higher levels and was sold back down — buyers tried, sellers answered. A long lower wick means a dip was bought back up. Wicks at significant levels (yesterday's high, a round number, a session open) are more informative than wicks in the middle of nowhere: they show where resting interest actually defended a price, which is exactly the kind of level a rule-based stop or entry can anchor to.",
        ],
        callout: {
          tone: "story",
          title: "A wick is an argument you can replay",
          body: "Every long wick records the same short story: one side pushed, the other side pushed back harder. Where that argument happens matters more than that it happened.",
        },
      },
      {
        h: "The misread that costs beginners most",
        paras: [
          "The classic error: seeing a big green candle and concluding “buyers are in control — buy.” A candle is a summary, not a signal. That green body may have closed in the bottom third of its range after a violent rejection at the high — bullish body, bearish finish. Always read the close relative to the full range: a close near the high is conviction; a close in the middle after a round trip is indecision wearing a green shirt.",
          "Second error: reading one candle without its timeframe. A dramatic engulfing candle on the 5-minute chart is often noise inside a single 1-hour bar. Before acting on any candle, ask: what does this look like one timeframe up? On paper, practice narrating candles — “probed high, rejected, closed weak” — until the description comes before the emotion. That narration is precisely what you will later encode as rules.",
        ],
        callout: {
          tone: "warn",
          title: "Color is not a verdict",
          body: "Green means “closed above open” — nothing more. Where the close sits inside the candle's full range tells you who actually finished in control.",
        },
        check: {
          q: "A big green H1 candle closed in the bottom third of its range after a sharp rejection at the high. The honest read?",
          options: [
            "Buyers are in control — the candle is green",
            "Indecision at best: the close inside the range, not the color, says who finished in control",
            "Sellers won the hour outright — red or green doesn't matter at all",
          ],
          answer: 1,
          explain: "Green only means “closed above open.” A close near the bottom of the range after a round trip is indecision wearing a green shirt — read the close against the full range.",
        },
      },
    ],
    terms: [
      { term: "OHLC", def: "Open, High, Low, Close — the four prices a candle records for its time window." },
      { term: "body", def: "The thick part of a candle, spanning open to close. Shows who finished ahead." },
      { term: "wick (shadow)", def: "The thin line beyond the body, reaching the highest or lowest price traded." },
      { term: "rejection", def: "Price visiting a level and being pushed back — recorded as a long wick." },
      { term: "timeframe", def: "The time window each candle summarizes: M5, M15, H1, D1 and so on." },
    ],
    quiz: [
      {
        q: "The body of a candlestick spans…",
        options: [
          "The high to the low",
          "The open to the close",
          "Yesterday's close to today's open",
          "The bid to the ask",
        ],
        answer: 1,
        explain: "Body = open to close, the score of who finished ahead. The wicks cover the full traded range beyond that.",
      },
      {
        q: "A long upper wick most directly records…",
        options: [
          "Strong, sustained buying",
          "A calm, balanced market",
          "The spread widening",
          "Price pushed higher and sold back down — an attempt that was refused",
        ],
        answer: 3,
        explain: "Wicks are rejection records. An upper wick says buyers visited those prices and sellers answered hard enough to push them back.",
      },
      {
        q: "A big green candle closes in the bottom third of its range. Best reading?",
        options: [
          "Buyers tried, got rejected at the highs, and finished weak — indecision at best",
          "Full bullish control — buy immediately",
          "The candle data is broken",
          "Sellers are guaranteed to win the next candle",
        ],
        answer: 0,
        explain: "Read the close against the full range. A green body with a weak finish is bullish paint over a bearish ending — not a buy signal.",
      },
      {
        q: "An H1 candle prints open 1.0850, high 1.0878, low 1.0846, close 1.0871. Which is true?",
        options: [
          "Sellers finished 21 pips ahead",
          "Price never traded above 1.0871",
          "Buyers finished 21 pips ahead and sellers managed only 4 pips below the open",
          "The candle prints red",
        ],
        answer: 2,
        explain: "Close minus open: 1.0871 − 1.0850 = +21 pips, so green. The low at 1.0846 is just 4 pips under the open — sellers barely showed up.",
      },
      {
        q: "Before acting on a dramatic 5-minute candle, you should…",
        options: [
          "Act fast before the move disappears",
          "Check what it looks like one timeframe up — it may be noise inside a single H1 bar",
          "Wait for a news article to explain it",
          "Double your size to make up for the hesitation",
        ],
        answer: 1,
        explain: "One timeframe up is the reality check. Most dramatic M5 candles vanish into an ordinary H1 bar — narrate first, act second.",
      },
    ],
  },

  {
    slug: "timeframes-and-trends",
    title: "Timeframes and trends",
    hook: "It's the same market at every zoom level — the trend just depends on how far you stand back.",
    summary:
      "How timeframes nest inside each other, how swing structure — higher highs and higher lows — defines a trend, and the trade-with-the-tide habit that keeps you on the right side of it.",
    interactive: { kind: "replay", scenario: "trend-hh-hl" },
    sections: [
      {
        h: "Same market, different zoom",
        paras: [
          "A timeframe is nothing more than how much time each candle summarizes. Four M15 candles melt into one H1 candle; twenty-four H1 candles melt into one D1 candle. Nothing new is added at any zoom level — it is the same stream of deals, bucketed differently. That means an “uptrend” on M15 can be a single ordinary pullback inside a D1 downtrend, the way a staircase going up can exist inside a building that is sinking.",
          "This is why two honest traders can disagree about the same chart: they are standing at different distances. Neither is wrong — but the one who knows which zoom level their rule lives on has a rule, and the one who doesn't has a mood.",
        ],
        table: {
          caption: "Common timeframes at a glance",
          head: ["Timeframe", "One candle spans", "Typically home to"],
          rows: [
            ["M5", "5 minutes", "Scalpers making dozens of decisions a day"],
            ["M15", "15 minutes", "Day traders timing entries"],
            ["H1", "1 hour", "Day and swing traders reading structure"],
            ["H4", "4 hours", "Swing traders holding for days"],
            ["D1", "1 day", "Position traders — and everyone's trend check"],
          ],
        },
        check: {
          q: "M15 shows a clean uptrend while D1 is in a downtrend. Which one is right?",
          options: [
            "M15 — the fresher candles win",
            "D1 — the bigger timeframe is always the truth",
            "Both — it's the same market at different zoom levels, and your rule decides which one it lives on",
          ],
          answer: 2,
          explain: "Nothing new is added at any zoom: an M15 uptrend can be one ordinary pullback inside a D1 downtrend. A rule that names its timeframe is a rule; one that doesn't is a mood.",
        },
      },
      {
        h: "Trends are drawn by swings, not feelings",
        paras: [
          "Zoom into any chart and price breathes: it pushes, pulls back, pushes again. Each local peak is a swing high; each local dip is a swing low. Trend has a precise definition built from those swings. Uptrend: each swing high tops the last (higher highs) and each pullback bottoms above the last dip (higher lows). Downtrend: the mirror — lower highs and lower lows. When swings overlap with no fresh highs or lows, price is ranging between a ceiling and a floor.",
          "The definition also tells you exactly when a trend ends: an uptrend is structurally broken the moment price prints a lower high and then takes out the last higher low. No indicator needed — the swings themselves are the verdict. Learning to mark swing highs and lows by hand, on a clean chart, is the single highest-value drill in this level.",
        ],
        figure: {
          kind: "trend-structure",
          caption: "Higher highs and higher lows draw an uptrend; lower highs and lower lows draw the mirror. The swings themselves are the definition — no indicator required.",
        },
      },
      {
        h: "Trade with the tide",
        paras: [
          "The multi-timeframe habit professionals drill: read the trend one timeframe above the one you execute on, then only take setups in that direction. If you enter on M15, let H1 structure decide whether you are hunting longs or shorts. Trading with the higher-timeframe tide doesn't guarantee any single trade — nothing does — but it stops you from fighting the market's larger current with its smallest waves.",
          "Make it mechanical: before any entry, write one sentence — “H1 is making higher highs and higher lows, so I only look for longs on M15.” If you can't write the sentence, you don't have a read; you have a hope.",
        ],
        callout: {
          tone: "tip",
          title: "One sentence before every trade",
          body: "“Higher timeframe is doing X, so I only look for Y.” If the sentence won't come out clean, the setup isn't clean either.",
        },
      },
    ],
    terms: [
      { term: "timeframe", def: "How much time one candle summarizes. Higher timeframes contain the lower ones exactly." },
      { term: "swing high / swing low", def: "A local peak or dip where price turned — the building blocks of structure." },
      { term: "higher high", def: "A swing high above the previous swing high. The signature of an uptrend's pushes." },
      { term: "higher low", def: "A pullback that bottoms above the previous dip — buyers stepping in earlier each time." },
      { term: "range", def: "Overlapping swings between a ceiling and floor, with no fresh highs or lows." },
    ],
    quiz: [
      {
        q: "How many M15 candles fit inside one H1 candle?",
        options: [
          "Four",
          "Fifteen",
          "Sixty",
          "One — they are the same candle",
        ],
        answer: 0,
        explain: "Four 15-minute windows make one hour. Nothing is added or lost — higher timeframes are the same deals, bucketed wider.",
      },
      {
        q: "An uptrend is defined by…",
        options: [
          "More green candles than red ones",
          "Price sitting above a moving average",
          "A sequence of higher highs and higher lows",
          "Positive news headlines",
        ],
        answer: 2,
        explain: "Trend is swing structure: pushes that top the last push, pullbacks that hold above the last dip. Everything else is decoration.",
      },
      {
        q: "Price keeps bouncing between a ceiling and a floor, swings overlap, no fresh highs or lows print. That is…",
        options: [
          "An uptrend",
          "A range",
          "A downtrend",
          "A broken data feed",
        ],
        answer: 1,
        explain: "Overlapping swings with a defended ceiling and floor define a range — the market's third state, and its most common one.",
      },
      {
        q: "The “trade with the tide” habit means…",
        options: [
          "Only trading during ocean-adjacent sessions",
          "Taking setups on every timeframe simultaneously",
          "Ignoring higher timeframes because they move too slowly",
          "Reading the trend one timeframe up, then only taking setups in its direction",
        ],
        answer: 3,
        explain: "Execute on your timeframe, but let the one above decide direction. You stop fighting the larger current with the smallest waves.",
      },
      {
        q: "GBPUSD prints a lower high, then breaks below the last higher low. The uptrend is…",
        options: [
          "Still fully intact",
          "Actually getting stronger",
          "Structurally broken — the higher-high, higher-low sequence has failed",
          "Impossible to judge without an indicator",
        ],
        answer: 2,
        explain: "The definition contains its own ending: lower high plus a broken higher low means the swing structure that defined the uptrend is gone.",
      },
    ],
  },
] as const;
