/* =========================================================================
 * Level 0 — First Steps. The absolute-beginner on-ramp: a smart
 * twelve-year-old should finish these three lessons and explain trading
 * to their family at dinner. Story first, mechanics second, zero hype.
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_0: readonly LessonContent[] = [
  {
    slug: "what-is-trading",
    title: "What trading actually is",
    hook: "Markets are auctions. See the auction and prices stop looking random.",
    summary:
      "Trading explained from zero: what a market is, why prices move, and what traders actually do all day — told through an auction everyone already understands.",
    interactive: { kind: "replay", scenario: "first-auction" },
    sections: [
      {
        h: "Start at the orange stand",
        paras: [
          "Picture a market stall selling oranges. The seller asks $1.20 a kilo. A buyer offers $1.00. Nobody budges, no oranges move. Then the sun gets hotter, more buyers arrive, and someone finally pays the $1.20. A deal happened — and that deal price is what everyone now calls “the price of oranges.”",
          "Every market you will ever trade — currencies, gold, bitcoin — works exactly like that stall. The price you see on a chart is simply the last deal two strangers agreed on. Nothing more mystical than that. When people say “EURUSD is 1.0850,” they mean: the most recent buyer and seller shook hands at 1.0850.",
        ],
        callout: {
          tone: "story",
          title: "The price is a handshake",
          body: "A chart is a diary of handshakes. Each candle records thousands of tiny deals between real people and machines, each one nudging the agreed price up or down.",
        },
        figure: {
          kind: "spread-anatomy",
          caption: "The orange stand as a price ladder: buyers bidding below, sellers asking above — and the gap between them is where every deal waits to happen.",
        },
      },
      {
        h: "Why prices move",
        paras: [
          "Prices move for one reason only: imbalance. If more money wants to buy than sell at the current price, buyers must offer more to get filled — price rises until enough sellers show up. If more money wants out than in, sellers must accept less — price falls until buyers return. News, interest rates, fear, excitement: all of it matters only because it changes who wants in and who wants out.",
          "This is why nobody — not banks, not AI, not your favorite influencer — knows for certain where price goes next. The future depends on decisions millions of participants haven't made yet. Professional traders don't claim to know. They bet small on situations where the odds lean their way, and they protect themselves when they're wrong. That mindset shift — from predicting to managing odds — is the entire journey of this academy.",
        ],
        check: {
          q: "Suddenly far more money wants to buy EURUSD than sell it at the current price. What must happen?",
          options: [
            "Price rises until enough sellers are tempted to take the other side",
            "Price stays put — the exchange sets prices, not traders",
            "Price falls, because too many buyers is a warning sign",
          ],
          answer: 0,
          explain: "Prices move for one reason: imbalance. When more money wants in than out, buyers must offer more until sellers show up — that bidding-up IS the price rising.",
        },
      },
      {
        h: "What a trader actually does",
        paras: [
          "A trader buys something hoping to sell it later at a higher price — or sells first (called going short, borrowing to sell, then buying back cheaper) hoping price falls. Long profits when price rises; short profits when it falls. That's the whole toolkit: two buttons.",
          "The difference between a gambler and a trader isn't the buttons — it's the routine around them. A trader has rules for when to press, how much to risk on each press, and when to admit a press was wrong. A gambler has feelings. Over the next levels you'll build the rules piece by piece: reading price (Level 1), protecting money (Level 2), finding setups (Level 3), and proving your edge on a practice account before a single real dollar is at risk (Level 4).",
          "One honest number before you continue: most new traders lose money, and they lose it in the first months, before rules exist. That's not a reason to quit — it's the reason this curriculum puts risk control before entries. Heroes are built in the boring lessons.",
        ],
        callout: {
          tone: "warn",
          title: "No promises, ever",
          body: "Trading involves substantial risk. Nothing in this academy is financial advice or a profit promise — it's education, drilled until the discipline is automatic.",
        },
      },
    ],
    terms: [
      { term: "market", def: "Any place — physical or digital — where buyers and sellers agree on prices." },
      { term: "price", def: "The last deal buyers and sellers agreed on. Updated with every new deal." },
      { term: "long", def: "Buying first, hoping to sell higher later. Profits when price rises." },
      { term: "short", def: "Selling borrowed units first, hoping to buy back cheaper. Profits when price falls." },
      { term: "volatility", def: "How fast and far a price tends to move. High volatility = bigger swings, both ways." },
    ],
    quiz: [
      {
        q: "The price you see on a chart is…",
        options: [
          "What the government says the asset is worth",
          "The last deal a buyer and seller agreed on",
          "The average of everyone's opinions",
          "Set by the broker each morning",
        ],
        answer: 1,
        explain: "Price is simply the most recent handshake — the last trade two participants actually made.",
      },
      {
        q: "Prices rise when…",
        options: [
          "A company or currency is objectively good",
          "The news is positive",
          "More money wants to buy than sell at the current price",
          "The market has been open long enough",
        ],
        answer: 2,
        explain: "Only imbalance moves price. News matters exactly as much as it changes who wants in versus out.",
      },
      {
        q: "Going short means…",
        options: [
          "Trading with a small account",
          "Holding a trade for only a few minutes",
          "Selling first to profit if price falls",
          "Trading without a stop loss",
        ],
        answer: 2,
        explain: "Short = sell borrowed units now, buy them back cheaper later (you hope). It's the mirror image of going long.",
      },
      {
        q: "What separates a trader from a gambler?",
        options: [
          "Traders use bigger screens",
          "Rules for entries, risk and exits — followed every time",
          "Traders only bet on sure things",
          "Gamblers lose, traders always win",
        ],
        answer: 1,
        explain: "Same two buttons, different routine. Rules around pressing them are the entire difference — and they can be learned.",
      },
    ],
  },

  {
    slug: "markets-and-pairs",
    title: "Markets and currency pairs",
    hook: "EURUSD is not a thing — it's a tug-of-war between two currencies.",
    summary:
      "Currency pairs decoded: base and quote, what 1.0850 actually says, and a guided tour of the seven instruments you'll practice on — from calm euro to wild sol.",
    sections: [
      {
        h: "One price, two currencies",
        paras: [
          "A currency pair is a tug-of-war. EURUSD = euro versus US dollar. The first currency (EUR) is the base — the thing being priced. The second (USD) is the quote — the currency doing the pricing. EURUSD at 1.0850 reads: one euro costs 1.0850 dollars.",
          "When EURUSD rises to 1.0950, the euro got stronger, the dollar weaker, or both — the rope moved toward the euro side. Buying EURUSD is betting on the euro side of the rope; shorting it is betting on the dollar side. You're never buying a “thing” — you're always trading the relationship between two economies.",
        ],
        callout: {
          tone: "tip",
          title: "Read any pair in one breath",
          body: "BASE/QUOTE at PRICE = one unit of BASE costs PRICE units of QUOTE. GBPUSD 1.2700: one pound costs $1.27. USDJPY 155.20: one dollar costs ¥155.20.",
        },
        figure: {
          kind: "pip-scale",
          caption: "1.0850 digit by digit: the whole number and decimals are just units of the quote currency — and the fourth decimal is the step you'll soon count every move in.",
        },
      },
      {
        h: "Meet the seven instruments",
        paras: [
          "You'll practice on seven instruments, chosen because together they cover the personality range you'll meet everywhere: three major forex pairs, gold, and three crypto pairs. Majors move in measured steps; gold swings harder around news; crypto trades around the clock and can move in a day what a forex pair moves in a month.",
          "Annual volatility below is the yardstick: roughly how far the instrument tends to range over a year. It's not a quality score — calm pairs suit beginners because mistakes cost less while you learn.",
        ],
        table: {
          caption: "The practice universe, calmest to wildest (approximate annual volatility)",
          head: ["Instrument", "Market", "Personality"],
          rows: [
            ["EURUSD", "Forex", "The steady one — deepest market on earth, ~8% a year"],
            ["GBPUSD", "Forex", "A touch feistier than the euro, ~9%"],
            ["USDJPY", "Forex", "Calm for months, then policy news wakes it, ~9%"],
            ["XAUUSD (gold)", "Metal", "Fear barometer — jumps on uncertainty, ~15%"],
            ["BTCUSDT", "Crypto", "The 24/7 heavyweight, ~55%"],
            ["ETHUSDT", "Crypto", "Bitcoin's louder sibling, ~65%"],
            ["SOLUSDT", "Crypto", "The wildest of the set, ~85%"],
          ],
        },
      },
      {
        h: "Why start on the calm ones",
        paras: [
          "Every skill in this academy — counting pips, sizing positions, placing stops — works identically on all seven. But the cost of a beginner mistake scales with volatility. A sloppy stop on EURUSD stings; the same sloppiness on SOLUSDT amputates. So the curriculum drills everything on majors first, and volatility becomes something you choose deliberately, like a difficulty setting, not something that happens to you.",
          "There's a second reason: session rhythm. Forex majors have famous daily rhythms — quiet Asian hours, a London burst, a New York overlap — which you'll exploit in Level 3. Crypto never sleeps, which sounds exciting until you realize markets that never sleep also never let YOU sleep. Rhythm is a feature. Learn on instruments that have one.",
        ],
        check: {
          q: "You've learned to read quotes on EURUSD. Why does the curriculum still keep you off SOLUSDT for now?",
          options: [
            "The skills change completely on crypto pairs",
            "The skills are identical — but a beginner mistake costs roughly ten times more on the wildest instrument",
            "Crypto charts use a different kind of candle",
          ],
          answer: 1,
          explain: "Every skill in this academy works the same on all seven instruments. What scales with volatility is the price of sloppiness — so you learn where mistakes are cheap.",
        },
      },
    ],
    terms: [
      { term: "currency pair", def: "Two currencies priced against each other, like EURUSD — euro priced in dollars." },
      { term: "base currency", def: "The FIRST currency in a pair. The thing being priced (EUR in EURUSD)." },
      { term: "quote currency", def: "The SECOND currency in a pair. The currency doing the pricing (USD in EURUSD)." },
      { term: "majors", def: "The most-traded dollar pairs — EURUSD, GBPUSD, USDJPY and friends. Deep, liquid, calm-ish." },
      { term: "annual volatility", def: "Roughly how far an instrument tends to range in a year. A personality scale, not a quality score." },
    ],
    quiz: [
      {
        q: "EURUSD at 1.0850 means…",
        options: [
          "One dollar costs 1.0850 euros",
          "One euro costs 1.0850 dollars",
          "The euro gained 8.5% this year",
          "You need $10,850 to open a trade",
        ],
        answer: 1,
        explain: "BASE/QUOTE at PRICE: one unit of the base (euro) costs PRICE units of the quote (dollar).",
      },
      {
        q: "If GBPUSD falls from 1.2750 to 1.2650, what happened in the tug-of-war?",
        options: [
          "The pound side gained strength",
          "The dollar side gained strength",
          "Both currencies got stronger",
          "The market closed",
        ],
        answer: 1,
        explain: "A falling pair means the base (pound) weakened against the quote (dollar) — the rope moved to the dollar side.",
      },
      {
        q: "Why does this academy start you on EURUSD rather than SOLUSDT?",
        options: [
          "Crypto is not a real market",
          "EURUSD is more profitable",
          "Mistakes cost less on calm instruments while you learn",
          "SOLUSDT requires a bigger account",
        ],
        answer: 2,
        explain: "Every skill transfers across instruments — but tuition for errors is priced in volatility. Learn where lessons are cheap.",
      },
      {
        q: "Which statement about volatility is TRUE?",
        options: [
          "High volatility means an instrument is bad",
          "Volatility measures how far and fast price tends to swing — both ways",
          "Low volatility guarantees safety",
          "Volatility only matters for crypto",
        ],
        answer: 1,
        explain: "Volatility is a personality scale. Bigger swings mean bigger opportunity AND bigger risk — you'll size positions for it in Level 2.",
      },
    ],
  },

  {
    slug: "brokers-orders-spread",
    title: "Brokers, orders and the spread",
    hook: "Two prices, three order types, one toll booth. That's the whole machine.",
    summary:
      "How trades actually happen: what a broker does, why there are always two prices, the three order types that do 99% of the work, and what the spread really costs you.",
    interactive: { kind: "replay", scenario: "spread-cost" },
    sections: [
      {
        h: "The broker is your doorway",
        paras: [
          "You can't walk onto the interbank currency market with $500 — the minimum ticket is measured in millions. A broker is the doorway: it aggregates prices from big banks and exchanges, lets you trade in small slices, and holds your margin while you do. In return it charges you — mostly through something called the spread.",
          "Open any trading platform and you'll see the toll immediately: every instrument shows TWO prices. The bid — what buyers will pay you if you sell right now. The ask — what sellers demand if you buy right now. The ask is always a little higher. EURUSD might show 1.08423 bid / 1.08431 ask: eight-tenths of a pip apart.",
        ],
        figure: {
          kind: "spread-anatomy",
          caption: "Bid below, ask above: the two prices every instrument always shows. The gap between them — the spread — is the toll you pay to cross.",
        },
      },
      {
        h: "Three orders do 99% of the work",
        paras: [
          "Every platform buries you in order types, but three cover almost everything a disciplined trader does. Learn these cold and you can drive any platform on earth.",
        ],
        table: {
          caption: "The only three orders you need for years",
          head: ["Order", "What it says", "When you use it"],
          rows: [
            ["Market", "“Fill me NOW at the best available price.”", "Entering or exiting immediately — you pay the spread for speed"],
            ["Limit", "“Fill me only at this price or better.”", "Patient entries at levels you chose in advance; taking profit"],
            ["Stop", "“The moment price touches this level, fire a market order.”", "Cutting losses automatically (stop loss) or entering on breakouts"],
          ],
        },
        callout: {
          tone: "tip",
          title: "The pro habit, from day one",
          body: "Amateurs decide the exit after they're in the trade and scared. Professionals attach the stop with the entry — one decision, made while calm. Every practice trade in this academy requires a stop. No exceptions, ever.",
        },
        figure: {
          kind: "order-types",
          caption: "Where the three orders live around current price: market fills now, limits wait at a price you chose, stops fire the instant price touches their level.",
        },
      },
      {
        h: "The spread is a toll — price it like one",
        paras: [
          "The spread is paid on every round trip. Buy EURUSD at the 1.08431 ask, and price must climb to 1.08431 just for the BID to reach your entry — you start every trade slightly behind. Eight-tenths of a pip on a mini lot (about $1 per pip) is roughly 80 cents per round trip. Sounds like nothing. It isn't.",
          "Take one trade a day and the toll is around $17 a month on mini lots — a rounding error. Take thirty impulsive trades a day and it's over $500 a month before you've been right or wrong ONCE. The spread quietly taxes overtrading, which is exactly why calm, selective traders keep an edge that frantic ones hand back. Fewer, better trades isn't just psychology — it's arithmetic.",
        ],
        callout: {
          tone: "warn",
          title: "Beginner protection: spotting a bad actor",
          body: "Real brokers are regulated, publish their spreads, and never message you first. Anyone DMing you “guaranteed 10% weekly,” asking for crypto deposits to a personal wallet, or promising to trade your account for you is running a script that ends with your money gone. No legitimate firm operates that way.",
        },
        check: {
          q: "The spread costs you about $1 per round trip on a mini lot. What decides how much it costs you per month?",
          options: [
            "How many trades you take — the toll is charged on every single round trip",
            "How volatile the market happens to be that month",
            "Whether your trades win or lose",
          ],
          answer: 0,
          explain: "The spread is paid win or lose, on every trade. One selective trade a day is pocket change; thirty impulsive ones is over $500 a month before you've been right once.",
        },
      },
    ],
    terms: [
      { term: "broker", def: "The regulated middleman that gives you market access in small sizes and holds your funds." },
      { term: "bid", def: "The price buyers will pay you right now — what you get when you sell." },
      { term: "ask", def: "The price sellers demand right now — what you pay when you buy. Always ≥ bid." },
      { term: "spread", def: "Ask minus bid — the toll paid on every round trip. The main cost of trading." },
      { term: "market order", def: "Fill me now at the best available price. Speed over precision." },
      { term: "limit order", def: "Fill me at my price or better. Precision over speed." },
      { term: "stop order", def: "When price touches my level, fire a market order. Powers stop losses and breakout entries." },
    ],
    quiz: [
      {
        q: "Why are there always two prices on your platform?",
        options: [
          "One is yesterday's close",
          "Bid is what you sell at, ask is what you buy at — the gap is the broker's toll",
          "One price is for big accounts",
          "It's a display bug on most platforms",
        ],
        answer: 1,
        explain: "Bid = sell-now price, ask = buy-now price. The gap between them — the spread — is how the doorway charges rent.",
      },
      {
        q: "You want to buy EURUSD, but only if it dips to 1.0800 first. Which order?",
        options: ["Market order", "Buy limit at 1.0800", "Buy stop at 1.0800", "No order can do this"],
        answer: 1,
        explain: "A limit says “my price or better.” Set a buy limit at 1.0800 and walk away — patience, automated.",
      },
      {
        q: "A stop loss is really a…",
        options: [
          "Limit order with a scary name",
          "Stop order that fires a market exit when price touches your level",
          "Request your broker can ignore",
          "Tool only professionals need",
        ],
        answer: 1,
        explain: "Stop = tripwire. Price touches your level → market order fires → the loss is cut without you touching anything.",
      },
      {
        q: "Trader A takes 2 planned trades a day; trader B takes 30 impulsive ones at the same size. Who pays more spread?",
        options: [
          "They pay the same — same instrument, same size",
          "Trader A, because patience is expensive",
          "Trader B pays roughly 15× more in tolls before being right or wrong once",
          "Neither — spreads only apply to losing trades",
        ],
        answer: 2,
        explain: "The toll is per round trip. Thirty trips cost 15× two trips — overtrading is taxed automatically.",
      },
      {
        q: "Someone DMs you: “guaranteed 10% weekly, just send USDT to this wallet.” What is it?",
        options: [
          "A rare opportunity worth a small test",
          "Standard broker marketing",
          "A scam script — real firms are regulated, publish spreads, and never message first",
          "Fine if they have many followers",
        ],
        answer: 2,
        explain: "Guaranteed returns + unsolicited contact + personal wallet = the oldest script in the book. Block, report, move on.",
      },
    ],
  },
] as const;
