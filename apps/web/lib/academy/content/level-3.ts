/* =========================================================================
 * Level 3 — Chart Structure. Highs, lows, levels and the patterns that repeat — the map layer every setup sits on
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_3: readonly LessonContent[] = [
  {
    slug: "market-structure-basics",
    title: "Market structure basics",
    hook: "Strip every indicator off the chart. What's left is the thing they were all measuring.",
    summary:
      "How to read a bare chart like a map: marking swing highs and lows objectively, spotting higher highs and higher lows, catching the break of structure that ends a trend — and why this beats any indicator while you're learning.",
    interactive: { kind: "replay", scenario: "trend-hh-hl" },
    sections: [
      {
        h: "Three states, drawn by swings",
        paras: [
          "In Level 1 you met the definition; this lesson turns it into a working tool. Every chart, on every timeframe, is only ever doing one of three things. Uptrend: each push tops the last one and each pullback bottoms above the last dip — higher highs, higher lows. Downtrend: the mirror — lower highs, lower lows. Range: swings overlap between a defended ceiling and floor, with nothing fresh printing on either side.",
          "Put numbers on it. EURUSD pushes from 1.0850 to 1.0910, pulls back to 1.0875, then pushes to 1.0940. That's a higher high (1.0940 over 1.0910) and a higher low (1.0875 over 1.0850) — an uptrend, by definition, no opinion required. The running sequence of those swing points is called market structure, and reading it is like reading a sentence: the swings are the words, and the chart never stops writing.",
          "Everything else in this level sits on top of this skill. Levels (next lesson) are old swing points the market remembers. Patterns (the lesson after) are structure wearing costumes. Learn to see the swings and the rest of the map draws itself.",
        ],
        figure: {
          kind: "trend-structure",
          caption: "Uptrend and downtrend side by side: pushes that top the last push, versus pullbacks that fail lower every time.",
        },
      },
      {
        h: "Marking swings without fooling yourself",
        paras: [
          "A swing high is a high with lower highs on both sides of it — a peak the market approached, touched and left. A swing low is the mirror: a dip flanked by higher lows. That two-sided rule matters because it stops you from marking every wiggle: a candle only becomes a swing point once price has actually turned away from it, which means the newest bar on your chart can never be one yet.",
          "The classic beginner error is marking twenty 'swings' on a five-minute chart and drowning in noise. Two fixes: mark structure one timeframe above the one you trade (H1 swings if you execute on M15), and only count swings that had real follow-through — a push of dozens of pips, not a three-pip twitch. When in doubt, zoom out; the swings that matter are the ones you can see from across the room.",
          "Then drill it. Pull up a clean chart with nothing on it, scroll back three months, and mark every swing high and low by hand, left to right, covering the future with your palm. Twenty minutes of this teaches more than a weekend of indicator videos, because you're training the exact skill every later lesson assumes.",
        ],
        check: {
          q: "On a clean chart, a valid swing high is…",
          options: [
            "Any candle that closed red",
            "A high with lower highs on both sides of it",
            "Wherever two moving averages cross",
            "Only the highest price of the whole year",
          ],
          answer: 1,
          explain: "A swing point needs price to turn away on both sides — which is also why the newest candle can never be one yet.",
        },
      },
      {
        h: "Break of structure — the moment the story changes",
        paras: [
          "The definition of a trend contains its own obituary. An uptrend is higher highs and higher lows; it is structurally broken the moment price prints a lower high and then CLOSES below the last higher low. Not wicks below — closes below. A close is the market's committed answer at the end of the auction; a wick is a question someone asked and withdrew.",
          "That distinction is worth money. Price stabbing 5 pips under the last higher low and closing back above it is a sweep — the stop-run you'll dissect in the next lesson — and it often means the level held. Price closing below and staying there is a break of structure: the buyers who defended every pullback for days finally stepped aside. A break of structure doesn't predict a crash; it reports a fact. The old story is over.",
          "What comes after a break is usually not an instant reversal but an audition. Either sellers print their own sequence — a lower high, then another lower low — and a downtrend is confirmed, or price goes quiet and builds a range. The professional move after a break is patience: wait for the new structure to introduce itself before you trade it.",
        ],
        figure: {
          kind: "market-structure",
          caption: "Swing points, the close that breaks structure, and the wick-through sweep that doesn't.",
        },
        callout: {
          tone: "warn",
          title: "A wick is not a break",
          body: "Wick through the level, close back inside: sweep. Close beyond the level: break of structure. Traders who can't tell these apart pay for the confusion at the worst spots on the chart.",
        },
      },
      {
        h: "Why structure beats indicators (for beginners)",
        paras: [
          "Every indicator ever invented — RSI, MACD, moving averages, all of them — is arithmetic performed on the same candles you're looking at. An average of closes, the speed of closes, a smoothed version of the swings you can already see. That makes every one of them lag by construction: the math needs closed candles as input, so it describes what price already did. Structure IS the price. Nothing computed from the chart can beat the chart to the news.",
          "Structure also hands you the one thing an indicator never will: an address for being wrong. If your idea is 'buyers defend the higher low at 1.0875,' then a close below that swing is your invalidation — and Level 2 taught you exactly what lives there: your stop, placed beyond the structure, with size computed from the distance. 'The RSI crossed back down' is a mood; '1.0871 traded and closed' is a fact.",
          "This is not an anti-indicator lesson forever — Level 5 puts indicators back in your hands as honest measurements instead of magic lights. But a beginner who needs five overlays to have an opinion doesn't have a read; they have a mood dashboard. Learn the bare chart first. The indicators will still be there, and you'll finally know what they're pointing at.",
        ],
        callout: {
          tone: "story",
          title: "The blank-chart month",
          body: "An old desk-training trick: new traders spend their first month with every indicator banned — nothing on the screen but candles and hand-marked swings. Most hate it for a week. Almost all of them later call it the month they learned to see.",
        },
        check: {
          q: "Your idea is 'buy the higher low at 1.0875.' Where does structure say the idea is invalid?",
          options: [
            "There's no way to know until the trade is closed",
            "When the trade is down more pips than feels comfortable",
            "On a close below the swing low that defined the higher low",
            "When an indicator turns red",
          ],
          answer: 2,
          explain: "Structure gives your idea an address for being wrong — and your stop from Level 2 lives just beyond that address.",
        },
      },
    ],
    terms: [
      { term: "market structure", def: "The running sequence of swing highs and swing lows — the market's sentence, readable on any timeframe." },
      { term: "swing point", def: "A high flanked by lower highs, or a low flanked by higher lows. Confirmed only after price turns away from it." },
      { term: "break of structure", def: "A candle close beyond the swing that defined the trend — the structural end of the old story." },
      { term: "pullback", def: "The counter-move inside a trend that sets the next higher low (or lower high)." },
      { term: "invalidation", def: "The price at which a trade idea is objectively wrong. Structure hands it to you; your stop lives just beyond it." },
      { term: "lag", def: "The delay built into every indicator — arithmetic on closed candles can only describe what price already did." },
    ],
    quiz: [
      {
        q: "Market structure is…",
        options: [
          "The running sequence of swing highs and swing lows on a chart",
          "A premium indicator package",
          "The broker's internal order book",
          "Another name for the news calendar",
        ],
        answer: 0,
        explain: "Structure is just the swings in order — the map layer everything else in this level is built on.",
      },
      {
        q: "An uptrend's structure is broken when…",
        options: [
          "Any single red candle prints",
          "Price wicks briefly below the last higher low",
          "Price prints a lower high and then closes below the last higher low",
          "Volume drops for an afternoon",
        ],
        answer: 2,
        explain: "The definition contains its own ending: lower high plus a CLOSE through the last higher low. Wicks ask; closes answer.",
      },
      {
        q: "Price stabs 5 pips below the last higher low, then closes back above it the same candle. Structurally, that is…",
        options: [
          "A confirmed break of structure",
          "A sweep — on a closing basis, the level held",
          "An automatic buy signal",
          "Proof the data feed is broken",
        ],
        answer: 1,
        explain: "A wick through with a close back inside means the market visited the level and rejected it — the stop-run anatomy the next lesson dissects.",
      },
      {
        q: "Why does this course teach structure before indicators?",
        options: [
          "Indicators are banned at most brokers",
          "Indicators are lagging arithmetic on the same candles, and structure also gives your stop a precise invalidation point",
          "Structure predicts the future and indicators don't",
          "Charts load faster without indicators",
        ],
        answer: 1,
        explain: "Nothing computed FROM price can beat price, and 'a close below the swing' is an address for being wrong that no indicator provides. Neither one predicts anything.",
      },
      {
        q: "An uptrend just broke — price closed below the last higher low. The patient next step is…",
        options: [
          "Short immediately at double size",
          "Buy immediately because it's cheaper now",
          "Wait for the new sequence — a lower high and lower low — before treating it as a downtrend",
          "Switch to a smaller timeframe until it looks like an uptrend again",
        ],
        answer: 2,
        explain: "A break reports that the old story ended, not what the new one is. Let the next swings introduce themselves — the alternative after a break is often a range, not a reversal.",
      },
    ],
  },

  {
    slug: "support-resistance-liquidity",
    title: "Support, resistance and liquidity",
    hook: "Levels aren't lines on a chart — they're piles of other people's orders.",
    summary:
      "Why price respects some levels and bulldozes others: how markets remember prior highs and lows, where stop-loss orders cluster, and why the sweep-then-reverse move keeps fooling beginners.",
    interactive: { kind: "replay", scenario: "liquidity-sweep" },
    sections: [
      {
        h: "Markets have memory",
        paras: [
          "Watch any chart long enough and you'll see price stall at the same numbers again and again. That's not magic — it's memory. A prior high is where sellers overwhelmed buyers last time, and everyone who watched it happen remembers. A prior low is where buyers stepped in. Round numbers like 1.1000 on EURUSD or $100,000 on bitcoin stick in millions of heads simply because humans anchor to round things. Session opens matter because that's where the day's first wave of orders landed.",
          "A level where price previously stopped falling is called support — a floor where buying interest showed up. A level where price previously stopped rising is resistance — a ceiling of selling interest. Neither is a wall. Both are just prices where, historically, enough orders sat to turn the tide. The more times a level has turned price, and the more violently, the more traders are watching it now.",
          "One behavior is worth memorizing: levels flip. When price finally breaks through resistance and holds above it, that old ceiling often becomes the new floor. The traders who sold there are trapped and buy back at breakeven; the traders who missed the breakout buy the retest. Old resistance becomes support, old support becomes resistance — the flip is one of the most repeated patterns in markets.",
        ],
        figure: {
          kind: "support-resistance",
          caption: "One level, three moments: the bounce that names it, the break that retires it, and the retest where the old ceiling turns floor.",
        },
        callout: {
          tone: "story",
          title: "The level is the crowd",
          body: "A level has no power of its own. Its power is the crowd of orders resting there — and crowds can defend a level or get run over, which is the next section.",
        },
      },
      {
        h: "Where the stops sleep",
        paras: [
          "Here is the part most beginners never get told. Every trader who buys near support places a stop-loss just BELOW it. Every trader who sells near resistance places a stop just ABOVE it. Multiply by thousands of traders all reading the same obvious level, and you get a dense cluster of stop orders parked a few pips past every well-known high and low. Traders call these clusters liquidity pools — pools, because a stop is an order waiting to be filled, and orders are liquidity.",
          "Now think like a bank that needs to buy an enormous position. Buying that size at the current price would push the market against itself with every fill. But just below support sits a pool of sell-stops — thousands of people who will sell automatically the moment price ticks there. If price dips into that pool, all those triggered sells become the exact counterparty the big buyer needs. Price pokes below the level, the stops fire, the large player absorbs them, and price snaps back the other way. That is a stop hunt, or a liquidity sweep — and it's why price so often breaks a level by a hair, then reverses hard.",
          "This isn't a conspiracy; it's mechanics. Large orders need liquidity, and liquidity clusters past obvious levels. The replay above shows a textbook sweep: support holds twice, price dips through it just far enough to trigger the stops, then reverses into a rally. The traders who were 'right' about the level lost anyway — because their stop sat exactly where everyone else's did.",
        ],
        check: {
          q: "Price pokes 3 pips under well-watched support, fires the stops clustered there, then rallies hard. What just happened?",
          options: [
            "A liquidity sweep — the triggered stops handed a large buyer its fills",
            "A confirmed break of structure to the downside",
            "The support level stopped existing",
            "A broker error that will be reversed",
          ],
          answer: 0,
          explain: "The pool below the level was the point. Once those automatic sells are absorbed, the pressure that pushed price through is gone.",
        },
      },
      {
        h: "Trading around the pools, not inside them",
        paras: [
          "Professionals don't stop using levels — they place orders where the crowd doesn't. Instead of buying exactly at support with a stop one pip under it, a patient trader often waits for the sweep: let price flush through the level, watch the reversal begin, and enter after the stops have already been cleared. Their stop then sits beyond the sweep's extreme — past the point the market already visited and rejected — rather than inside the next obvious pool.",
          "The general rule: assume the obvious pool gets tapped. If your stop must live near a well-watched level, give it room past the likely sweep distance and size the position smaller to keep risk at your fixed percent — the risk-percent sizing you drilled in Level 2 (and the same math Trade Guard automates on the platform: wider stop, smaller size, identical dollar risk). A stop is only protection if it survives the noise it was placed inside.",
          "None of this makes levels predictive. Sometimes a break is real and price never comes back; sometimes support simply fails. Levels tell you where the crowd's orders are — nothing more. Your edge, if you build one, comes from combining that map with the patterns of the next lesson, the timing and confluence of Level 4, and the written plan that ties them all together.",
        ],
        table: {
          caption: "Level types and why the market remembers them",
          head: ["Level type", "Why it matters", "Example"],
          rows: [
            ["Prior high / low", "Where one side overwhelmed the other last time; stops cluster just past it", "Yesterday's high on GBPUSD"],
            ["Round number", "Millions of humans anchor orders to clean figures", "EURUSD 1.1000, gold $2,500"],
            ["Session open", "The day's first wave of orders lands there; often retested", "London open price on EURUSD"],
            ["Flipped level", "Old resistance turned support (or the reverse) after a real break", "Broken ceiling retested as a floor"],
          ],
        },
        callout: {
          tone: "warn",
          title: "A level is a map, not a signal",
          body: "Knowing where stops cluster doesn't tell you which sweep reverses and which break runs. Levels locate risk; they never remove it.",
        },
      },
    ],
    terms: [
      { term: "support", def: "A price where falling markets previously found buyers — a remembered floor, not a wall." },
      { term: "resistance", def: "A price where rising markets previously found sellers — a remembered ceiling." },
      { term: "round number", def: "A psychologically clean price like 1.1000 where humans anchor orders." },
      { term: "liquidity", def: "Resting orders waiting to be filled. Stops clustered past a level form a liquidity pool." },
      { term: "stop hunt", def: "A push just past an obvious level that triggers clustered stops, then often reverses. Also called a liquidity sweep." },
      { term: "level flip", def: "Broken resistance acting as new support (or broken support as resistance) on the retest." },
    ],
    quiz: [
      {
        q: "Why do stop-loss orders cluster just below obvious support?",
        options: [
          "Brokers require stops to be placed there",
          "Traders who bought at support all protect the trade the same obvious way",
          "Exchanges move stops there automatically",
          "Below support is where spreads are tightest",
        ],
        answer: 1,
        explain: "Thousands of traders read the same level and park stops a few pips under it. Same idea, same spot — that's the pool.",
      },
      {
        q: "A liquidity sweep happens when price…",
        options: [
          "Breaks a level and keeps trending for days",
          "Refuses to touch a level at all",
          "Moves sideways with no volume",
          "Pokes just past a level, triggers the stops there, then reverses",
        ],
        answer: 3,
        explain: "Triggered stops hand large players the fills they need. Once the pool is drained, the pressure that pushed price through is gone.",
      },
      {
        q: "Why would a large institution WANT price to dip into a pool of sell-stops?",
        options: [
          "Triggered stops are automatic sellers — the counterparty a big buyer needs",
          "It makes the chart look bearish to retail traders",
          "Regulators reward institutions for volatility",
          "Stops below support are cheaper to execute than market orders",
        ],
        answer: 0,
        explain: "Huge orders move the market against themselves unless someone is selling in size. A fired stop cluster is exactly that seller.",
      },
      {
        q: "Price breaks decisively above a resistance level and holds. On the retest of that level, traders often expect…",
        options: [
          "The level to now act as support — the flip",
          "The level to be twice as strong a ceiling",
          "Price to go sideways forever",
          "The level to stop mattering entirely",
        ],
        answer: 0,
        explain: "Trapped sellers exit at breakeven and breakout-missers buy the retest. Old ceiling, new floor.",
      },
      {
        q: "The professional response to knowing where stop pools sit is to…",
        options: [
          "Stop using stop losses entirely",
          "Place stops exactly at the level, since it's proven",
          "Place stops beyond the likely sweep and size smaller to keep risk fixed",
          "Only trade markets without levels",
        ],
        answer: 2,
        explain: "Room past the sweep plus a smaller size keeps dollar risk identical. Never trade without a stop — relocate it, don't remove it.",
      },
    ],
  },

  {
    slug: "chart-patterns-that-matter",
    title: "Chart patterns that matter",
    hook: "You don't need a zoo of a hundred patterns. You need three — and the reason each one works.",
    summary:
      "The only three chart patterns with a structural engine behind them — the range, the flag and the false break — plus the one question that retires the rest of the pattern zoo: whose orders make this work?",
    sections: [
      {
        h: "Close the pattern zoo",
        paras: [
          "Open any old trading book and you'll find a zoo: head and shoulders, cup and handle, three black crows, dead cat bounce — over a hundred named shapes. Naming shapes is easy; humans are shape-finding machines, which is why we also see faces in clouds and dragons in wallpaper. A shape deserves your money only if you can answer one question about it: whose orders make this pattern work? No orders, no pattern — just a coincidence with a nickname.",
          "Run every zoo animal through that filter and three survivors walk out, each one a structure story from the previous two lessons wearing a costume. The range is balance — both sides defending. The flag is a trend catching its breath. The false break is a trap — and traps run on the most reliable fuel in markets: other people's forced exits. Learn the engine inside each one and you'll recognize it in any costume, on any timeframe, without memorizing a single silhouette.",
        ],
        figure: {
          kind: "chart-patterns",
          caption: "The three survivors: a range with defended edges, a flag drifting against the trend, and a false break snapping back inside.",
        },
        callout: {
          tone: "story",
          title: "Shapes in the clouds",
          body: "Show people charts generated from pure coin flips and they will confidently find 'patterns' in them — researchers have done exactly this. The habit is called pareidolia. The cure is the question: whose orders? Random wiggles have no one behind them.",
        },
      },
      {
        h: "The range: balance with defended edges",
        paras: [
          "A range is the market saying 'this price is roughly fair.' Buyers step in every time price reaches the floor; sellers lean on it every time it reaches the ceiling; swings overlap in between. It is the market's most common state — many pairs spend well over half their hours ranging — which means the trend tools from lesson one are silent most of the day, and that silence is information too.",
          "The edges are where the range earns your attention, for two reasons you already know. First, each edge is a remembered level being actively defended — support and resistance rebuilding their reputation with every touch. Second, just past each edge sleeps a stop pool: the longs' stops under the floor, the shorts' stops above the ceiling. A range is really two liquidity pools with a waiting room in between.",
          "One upgrade from the diagrams: stop drawing edges as single lines. Orders cluster in bands — one trader's floor is 1.0850, another's is 1.0846, a third set theirs at the round 1.0840 — so a real edge is a zone a few pips deep. Expect price to poke into the zone, not kiss a line, and you'll stop calling clean behavior 'fake-outs.'",
        ],
        figure: {
          kind: "supply-demand",
          caption: "Levels are areas, not lines: orders cluster in bands, so a real edge is a zone a few pips deep.",
        },
        check: {
          q: "Price has bounced between 1.0840 and 1.0910 six times with overlapping swings. The auction is telling you…",
          options: [
            "A crash is imminent",
            "The market considers this area roughly fair — both edges are being defended",
            "The uptrend is accelerating",
            "The chart has too little data to mean anything",
          ],
          answer: 1,
          explain: "Overlapping swings between a defended floor and ceiling define balance — the market's most common state, and its waiting room.",
        },
      },
      {
        h: "The flag: a trend catching its breath",
        paras: [
          "After a strong push — say a 60-pip impulse up on GBPUSD — price often drifts back down for a handful of small, overlapping candles, giving back maybe a third of the move. That tight, tilted drift is a flag. The engine is mundane: winners are taking partial profits, and nobody with size disagrees strongly enough to punish the dip. Selling from profit-taking is patient and shallow; selling from changed minds is fast and deep. The flag's calm IS the information.",
          "Now connect it to lesson one: a flag is simply the pullback that builds the next higher low, viewed as a shape. Which is why the pattern 'works' — its resolution is just the trend resuming, printing the next higher high. The healthy tells: shallow (roughly a third of the impulse, not two-thirds), slowing (candles shrink), and brief. The payoff moment is the break out of the drift in the trend's direction — often good for a push comparable to the first impulse.",
          "And the disqualifier: if the 'flag' retraces most of the impulse at speed, it isn't a flag — it's a fight. Real counter-size showed up, opinion is genuinely split, and the polite name for that chart is a coin flip. Skipping a fast, deep pullback isn't missing a trade; it's declining a bet the pattern never offered.",
        ],
      },
      {
        h: "The false break: the trap that pays the patient",
        paras: [
          "The most obvious level in the room finally breaks — say the range ceiling at 1.0910 — and breakout traders pile in long within seconds. Two candles later, price is back inside the range and their positions are underwater. Those trapped longs now MUST sell to get out, and their exits are the fuel that drives price down through the range faster than it ever rallied out. A false break isn't a failed pattern; it is its own pattern, with the most honest engine of the three: forced orders. Trapped traders don't get to have opinions.",
          "You've met this animal before in different lighting — a false break at a range edge is a liquidity sweep wearing a costume, and the replay in the last lesson showed you its anatomy. The practical playbook has two sides. If you're tempted by breakouts, demand proof before you chase: a close beyond the level, ideally a retest that holds, because the pattern zoo's biggest predator eats early breakout buyers. If you're patient, the break-and-fail itself is the setup — entering back inside the range, stop beyond the trap's extreme, with the trapped crowd pushing your way.",
        ],
        callout: {
          tone: "warn",
          title: "Name the trapped trader",
          body: "Before trading any pattern, say out loud who is trapped or forced to act, and why. If you can't name them, you don't have a pattern — you have a shape, and shapes don't pay.",
        },
        check: {
          q: "Price breaks above a range ceiling, then closes back inside within two candles. Where does the fuel for the drop that follows come from?",
          options: [
            "Breakout buyers now trapped underwater, forced to sell out",
            "The broker widening the spread",
            "Short sellers celebrating",
            "There is no fuel — the drop is random",
          ],
          answer: 0,
          explain: "Trapped traders must exit; their selling is automatic, not optional. Forced orders are the most reliable engine a pattern can have.",
        },
      },
    ],
    terms: [
      { term: "impulse", def: "The fast, directional leg of a trend — the push that flags form after." },
      { term: "flag", def: "A shallow, slowing drift against the trend after an impulse. Profit-taking, not changed minds — the pullback that builds the next swing." },
      { term: "false break", def: "A push through an obvious level that fails to hold and closes back inside — a trap for breakout chasers." },
      { term: "trapped trader", def: "Someone whose position went underwater the moment it opened. Their forced exit fuels the move against them." },
      { term: "zone", def: "A price band where orders cluster. Real levels are areas a few pips deep, not single prices." },
      { term: "pareidolia", def: "The human habit of finding shapes in randomness — clouds, toast, and charts included." },
    ],
    quiz: [
      {
        q: "This lesson's filter for whether a pattern deserves attention is…",
        options: [
          "Whether it appears in classic trading books",
          "Whether you can name whose orders make it work",
          "How dramatic its name sounds",
          "Whether it appeared at least once this week",
        ],
        answer: 1,
        explain: "No orders behind it, no pattern — just a coincidence with a nickname. The range, flag and false break each have a nameable engine.",
      },
      {
        q: "Why do flags form after a strong impulse?",
        options: [
          "The trend is secretly reversing",
          "Winners take partial profits while nobody with size disagrees — a shallow pause, not a change of mind",
          "Brokers pause the market to process orders",
          "Volume is being manipulated",
        ],
        answer: 1,
        explain: "Profit-taking is patient and shallow; changed minds are fast and deep. A calm, shallow drift says the trend's opinion still stands.",
      },
      {
        q: "Why are the edges of a range especially dangerous places for obvious stops?",
        options: [
          "Spreads are always widest at range edges",
          "Ranges have no real levels, so stops are pointless",
          "Stops cluster just past each defended edge — a range is two liquidity pools with a waiting room between",
          "Brokers reject orders near range edges",
        ],
        answer: 2,
        explain: "Longs stop out under the floor, shorts above the ceiling. Both pools invite the sweep you studied in the last lesson.",
      },
      {
        q: "The difference between a real breakout and a false break shows up as…",
        options: [
          "Follow-through: closes holding beyond the level, ideally a retest that holds — versus a quick close back inside",
          "The color of the breakout candle",
          "The time of day, and nothing else",
          "There is no observable difference",
        ],
        answer: 0,
        explain: "Wicks ask, closes answer — same rule as break of structure. Demanding proof costs a few pips of entry and dodges the zoo's biggest predator.",
      },
      {
        q: "You spot a textbook 'cup and handle' but can't explain whose orders would drive it. The lesson's advice:",
        options: [
          "Trade it — textbook shapes are proven",
          "Trade it at half size as a compromise",
          "Skip it — a shape without a structural reason is pareidolia, not a pattern",
          "Add three indicators to confirm it first",
        ],
        answer: 2,
        explain: "The filter is the whole lesson: no nameable engine, no trade. Indicators layered on a coincidence are decoration on a coincidence.",
      },
    ],
  },
] as const;
