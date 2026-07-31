/* =========================================================================
 * Scenario data — deterministic candle sequences that power the animated
 * chart replays (lessons) and the Long-or-Short arcade game. All values
 * are ILLUSTRATIVE teaching scenarios modeled on typical session behavior,
 * never presented as records of specific historical dates. Compliance: no
 * performance claims — every scenario teaches a mechanic, not a promise.
 *
 * Candle prices are plain floats in instrument price space; the replay
 * component normalizes to its own viewBox, so any consistent scale works.
 * ======================================================================= */

export type Candle = { o: number; h: number; l: number; c: number };

export type ReplayMarker = {
  /** Candle index the marker attaches to. */
  at: number;
  price: number;
  kind: "entry" | "stop" | "target" | "note";
  label: string;
};

export type ReplayScenario = {
  id: string;
  title: string;
  pair: string;
  timeframe: string;
  /** Caption beats — advance as playback crosses matching `beatAt` indices. */
  narration: { atCandle: number; text: string }[];
  candles: Candle[];
  markers: ReplayMarker[];
  /** How the story ends — drives the outcome flash color. */
  outcome: "target" | "stop" | "neutral";
};

export type GameScenario = {
  id: string;
  pair: string;
  timeframe: string;
  candles: Candle[];
  /** Candles shown before the player must choose. Rest replay as the reveal. */
  revealCount: number;
  answer: "long" | "short";
  /** One-sentence read of the tape, shown after the reveal. */
  explain: string;
};

/* ---------- lesson replays ---------- */

export const REPLAYS: readonly ReplayScenario[] = [
  {
    id: "pip-count",
    title: "Counting a move in pips",
    pair: "EURUSD",
    timeframe: "M15",
    narration: [
      { atCandle: 0, text: "EURUSD sits at 1.0842. Watch the fourth decimal — that digit is the pip." },
      { atCandle: 4, text: "1.0846 — the price has stepped up 4 pips. Small candles, small counts." },
      { atCandle: 9, text: "1.0850 hit: 8 pips from where we started. Same math on every pair you trade." },
      { atCandle: 12, text: "A pullback to 1.0847 is −3 pips. Moves are counted, not felt." },
    ],
    candles: [
      { o: 1.0842, h: 1.08435, l: 1.08405, c: 1.08425 },
      { o: 1.08425, h: 1.0845, l: 1.0842, c: 1.08445 },
      { o: 1.08445, h: 1.08455, l: 1.0843, c: 1.0844 },
      { o: 1.0844, h: 1.08465, l: 1.08435, c: 1.0846 },
      { o: 1.0846, h: 1.08475, l: 1.08445, c: 1.0847 },
      { o: 1.0847, h: 1.08472, l: 1.0844, c: 1.08452 },
      { o: 1.08452, h: 1.0848, l: 1.0845, c: 1.08475 },
      { o: 1.08475, h: 1.08495, l: 1.0847, c: 1.0849 },
      { o: 1.0849, h: 1.08505, l: 1.0848, c: 1.08498 },
      { o: 1.08498, h: 1.08512, l: 1.08488, c: 1.085 },
      { o: 1.085, h: 1.08508, l: 1.0848, c: 1.08485 },
      { o: 1.08485, h: 1.0849, l: 1.08462, c: 1.08468 },
      { o: 1.08468, h: 1.08478, l: 1.08458, c: 1.0847 },
      { o: 1.0847, h: 1.0849, l: 1.08465, c: 1.08488 },
    ],
    markers: [
      { at: 0, price: 1.0842, kind: "note", label: "start 1.0842" },
      { at: 9, price: 1.085, kind: "note", label: "+8 pips" },
    ],
    outcome: "neutral",
  },
  {
    id: "trend-hh-hl",
    title: "An uptrend drawn by higher highs and higher lows",
    pair: "GBPUSD",
    timeframe: "H1",
    narration: [
      { atCandle: 0, text: "A trend is a staircase, not an elevator. Watch the steps form." },
      { atCandle: 5, text: "First swing high prints, then price rests. The pullback is part of the pattern." },
      { atCandle: 9, text: "The dip holds ABOVE the last low — a higher low. Buyers stepped in earlier than before." },
      { atCandle: 14, text: "A new higher high. Higher highs + higher lows = uptrend, by definition." },
      { atCandle: 19, text: "Trend traders don't predict the staircase — they climb it one confirmed step at a time." },
    ],
    candles: [
      { o: 1.271, h: 1.2718, l: 1.2704, c: 1.2715 },
      { o: 1.2715, h: 1.2726, l: 1.2712, c: 1.2723 },
      { o: 1.2723, h: 1.2734, l: 1.2719, c: 1.2731 },
      { o: 1.2731, h: 1.2745, l: 1.2728, c: 1.2742 },
      { o: 1.2742, h: 1.2752, l: 1.2738, c: 1.2748 },
      { o: 1.2748, h: 1.2755, l: 1.2741, c: 1.2744 }, // swing high zone
      { o: 1.2744, h: 1.2746, l: 1.2731, c: 1.2735 },
      { o: 1.2735, h: 1.2739, l: 1.2724, c: 1.2728 },
      { o: 1.2728, h: 1.2734, l: 1.2722, c: 1.2731 }, // higher low holds
      { o: 1.2731, h: 1.2742, l: 1.2729, c: 1.2739 },
      { o: 1.2739, h: 1.2749, l: 1.2735, c: 1.2746 },
      { o: 1.2746, h: 1.2757, l: 1.2743, c: 1.2754 },
      { o: 1.2754, h: 1.2764, l: 1.275, c: 1.2761 },
      { o: 1.2761, h: 1.2771, l: 1.2757, c: 1.2768 },
      { o: 1.2768, h: 1.2779, l: 1.2764, c: 1.2775 }, // higher high
      { o: 1.2775, h: 1.2778, l: 1.2763, c: 1.2767 },
      { o: 1.2767, h: 1.2771, l: 1.2755, c: 1.2759 },
      { o: 1.2759, h: 1.2765, l: 1.2752, c: 1.2762 }, // higher low again
      { o: 1.2762, h: 1.2774, l: 1.2759, c: 1.2771 },
      { o: 1.2771, h: 1.2784, l: 1.2768, c: 1.2781 },
    ],
    markers: [
      { at: 5, price: 1.2755, kind: "note", label: "swing high" },
      { at: 8, price: 1.2722, kind: "note", label: "higher low" },
      { at: 14, price: 1.2779, kind: "note", label: "higher high" },
      { at: 17, price: 1.2752, kind: "note", label: "higher low" },
    ],
    outcome: "neutral",
  },
  {
    id: "first-auction",
    title: "The auction that becomes a chart",
    pair: "EURUSD",
    timeframe: "M15",
    narration: [
      { atCandle: 0, text: "The stall opens quiet. Buyers bid around 1.0840, sellers offer just above — both sides roughly agree, so price only breathes." },
      { atCandle: 4, text: "A two-sided auction: every push up meets a willing seller, every dip meets a willing buyer. Deals happen, price goes nowhere." },
      { atCandle: 8, text: "Now more buyers arrive than sellers can fill. To get their oranges they must pay up — the handshake price steps higher." },
      { atCandle: 12, text: "No magic and no signal — just imbalance. When buying pressure outweighs selling, the auction reprices, one candle at a time." },
    ],
    candles: [
      { o: 1.08398, h: 1.08413, l: 1.08393, c: 1.08405 },
      { o: 1.08405, h: 1.08423, l: 1.08396, c: 1.08418 },
      { o: 1.08418, h: 1.08428, l: 1.08396, c: 1.08402 },
      { o: 1.08402, h: 1.08421, l: 1.08394, c: 1.08415 },
      { o: 1.08415, h: 1.08424, l: 1.08394, c: 1.08398 }, // two-sided: every push meets the other side
      { o: 1.08398, h: 1.08416, l: 1.08391, c: 1.08412 },
      { o: 1.08412, h: 1.0842, l: 1.084, c: 1.08405 },
      { o: 1.08405, h: 1.08425, l: 1.08396, c: 1.0842 },
      { o: 1.0842, h: 1.08444, l: 1.08418, c: 1.08438 }, // more buyers than sellers can fill
      { o: 1.08438, h: 1.08458, l: 1.08436, c: 1.08452 },
      { o: 1.08452, h: 1.0847, l: 1.08448, c: 1.08461 },
      { o: 1.08461, h: 1.08465, l: 1.08442, c: 1.08449 },
      { o: 1.08449, h: 1.08477, l: 1.08447, c: 1.0847 },
      { o: 1.0847, h: 1.0849, l: 1.08467, c: 1.08484 },
      { o: 1.08484, h: 1.08502, l: 1.08478, c: 1.08492 },
      { o: 1.08492, h: 1.08511, l: 1.08484, c: 1.08505 }, // the auction repriced, step by step
    ],
    markers: [
      { at: 3, price: 1.08425, kind: "note", label: "two-sided range" },
      { at: 9, price: 1.08452, kind: "note", label: "buyers outnumber sellers" },
    ],
    outcome: "neutral",
  },
  {
    id: "spread-cost",
    title: "The toll booth: what the spread costs",
    pair: "EURUSD",
    timeframe: "M15",
    narration: [
      { atCandle: 0, text: "The quote is two prices: sellers ask 1.08512, buyers bid 1.08500. That 1.2-pip gap is the spread — the toll booth." },
      { atCandle: 1, text: "You buy and are filled at the ask, 1.08512 — but the chart plots the bid. You are 1.2 pips down the instant you enter." },
      { atCandle: 5, text: "The bid finally reaches 1.08512. Only now is the trade at breakeven. The toll is paid first, on every single trade." },
      { atCandle: 12, text: "Three pips of climb, 1.2 of them paid to the booth. On short timeframes the spread is a real opponent — always count it." },
    ],
    candles: [
      { o: 1.085, h: 1.08507, l: 1.08497, c: 1.08502 },
      { o: 1.08502, h: 1.08508, l: 1.08497, c: 1.08505 }, // filled at the ask 1.08512 — chart shows the bid
      { o: 1.08505, h: 1.08512, l: 1.08496, c: 1.085 },
      { o: 1.085, h: 1.08512, l: 1.08495, c: 1.08508 },
      { o: 1.08508, h: 1.08516, l: 1.08506, c: 1.08511 },
      { o: 1.08511, h: 1.08516, l: 1.08506, c: 1.08514 }, // bid finally crosses 1.08512 — breakeven
      { o: 1.08514, h: 1.08519, l: 1.08509, c: 1.08512 },
      { o: 1.08512, h: 1.08521, l: 1.08507, c: 1.08518 },
      { o: 1.08518, h: 1.08529, l: 1.08515, c: 1.08522 },
      { o: 1.08522, h: 1.08526, l: 1.08514, c: 1.08519 },
      { o: 1.08519, h: 1.08529, l: 1.08517, c: 1.08524 },
      { o: 1.08524, h: 1.0853, l: 1.08519, c: 1.08528 },
      { o: 1.08528, h: 1.08535, l: 1.08525, c: 1.0853 },
      { o: 1.0853, h: 1.08537, l: 1.08525, c: 1.08534 },
    ],
    markers: [
      { at: 1, price: 1.08512, kind: "entry", label: "buy filled at ask 1.08512" },
      { at: 5, price: 1.08512, kind: "note", label: "breakeven — spread paid" },
    ],
    outcome: "neutral",
  },
  {
    id: "stop-and-run",
    title: "A stop that held: near miss, then 2R",
    pair: "GBPUSD",
    timeframe: "H1",
    narration: [
      { atCandle: 0, text: "Sellers drive GBPUSD into 1.2680, where the fall stalls. That low becomes the structure everything is measured against." },
      { atCandle: 7, text: "The bounce pulls back but bottoms at 1.2694 — a higher low. Buyers just moved their line up." },
      { atCandle: 9, text: "Entry 1.2711, stop 1.2688 — below the higher low, where the idea is proven wrong. Risk 23 pips; the 2R target waits at 1.2757." },
      { atCandle: 11, text: "The scary part: price dips to 1.2690, two pips from the stop, and holds. The stop sat where the idea dies — not where it itches." },
      { atCandle: 17, text: "1.2757 tagged: 2R banked. The trade survived because the stop lived below structure, with room for one ugly dip." },
    ],
    candles: [
      { o: 1.2711, h: 1.2712, l: 1.27074, c: 1.2708 },
      { o: 1.2708, h: 1.27086, l: 1.27029, c: 1.2704 },
      { o: 1.2704, h: 1.27053, l: 1.26953, c: 1.2696 },
      { o: 1.2696, h: 1.26968, l: 1.2687, c: 1.2688 },
      { o: 1.2688, h: 1.26885, l: 1.268, c: 1.2683 }, // structure low 1.2680
      { o: 1.2683, h: 1.26915, l: 1.26821, c: 1.2691 },
      { o: 1.2691, h: 1.27, l: 1.26904, c: 1.2699 },
      { o: 1.2699, h: 1.26996, l: 1.2694, c: 1.2695 }, // higher low holds at 1.2694
      { o: 1.2695, h: 1.26983, l: 1.26943, c: 1.2697 },
      { o: 1.2697, h: 1.27119, l: 1.26966, c: 1.2711 }, // entry candle
      { o: 1.2711, h: 1.27121, l: 1.27055, c: 1.2706 },
      { o: 1.2706, h: 1.27064, l: 1.269, c: 1.2696 }, // the scary dip — low 1.2690, stop 1.2688
      { o: 1.2696, h: 1.2703, l: 1.26954, c: 1.2702 },
      { o: 1.2702, h: 1.27156, l: 1.27009, c: 1.2715 },
      { o: 1.2715, h: 1.27273, l: 1.27143, c: 1.2726 },
      { o: 1.2726, h: 1.27388, l: 1.2725, c: 1.2738 },
      { o: 1.2738, h: 1.27481, l: 1.27375, c: 1.2747 },
      { o: 1.2747, h: 1.27585, l: 1.27465, c: 1.2756 }, // 2R target tagged
    ],
    markers: [
      { at: 9, price: 1.2711, kind: "entry", label: "long 1.2711" },
      { at: 9, price: 1.2688, kind: "stop", label: "stop 1.2688 — below structure" },
      { at: 11, price: 1.269, kind: "note", label: "dip to 1.2690 — held by 2 pips" },
      { at: 17, price: 1.2757, kind: "target", label: "2R target 1.2757" },
    ],
    outcome: "target",
  },
  {
    id: "liquidity-sweep",
    title: "The sweep: why obvious lows get raided",
    pair: "XAUUSD",
    timeframe: "M15",
    narration: [
      { atCandle: 0, text: "Gold holds above 2352. Twice the dip stops at almost the same price — equal lows that every screen in the world can see." },
      { atCandle: 7, text: "Under obvious equal lows sits a pile of resting orders: sell stops from longs, sell entries from breakout traders." },
      { atCandle: 10, text: "The sweep — one wick punches to 2349.6, fills the whole cluster, and finds no sellers left underneath." },
      { atCandle: 13, text: "Fuel spent, shorts trapped, price reverses hard. The liquidity below the lows was the destination, not the direction." },
    ],
    candles: [
      { o: 2357.2, h: 2358.2, l: 2355.8, c: 2356.4 },
      { o: 2356.4, h: 2357, l: 2354, c: 2355.1 },
      { o: 2355.1, h: 2356.4, l: 2353.1, c: 2353.8 },
      { o: 2353.8, h: 2354.2, l: 2352, c: 2352.9 }, // equal low #1 at 2352.0
      { o: 2352.9, h: 2355.3, l: 2352.4, c: 2354.2 },
      { o: 2354.2, h: 2355.5, l: 2353.3, c: 2355 },
      { o: 2355, h: 2356, l: 2353, c: 2353.6 },
      { o: 2353.6, h: 2354.1, l: 2352.1, c: 2352.8 }, // equal low #2 at 2352.1
      { o: 2352.8, h: 2355.2, l: 2352.1, c: 2353.9 },
      { o: 2353.9, h: 2354.7, l: 2352.1, c: 2353.1 },
      { o: 2353.1, h: 2354, l: 2349.6, c: 2353.4 }, // sweep wick to 2349.6, close back above
      { o: 2353.4, h: 2356, l: 2353.1, c: 2355.2 },
      { o: 2355.2, h: 2357.9, l: 2354.9, c: 2357 },
      { o: 2357, h: 2359.5, l: 2355.9, c: 2358.9 }, // the reversal — sellers are trapped
      { o: 2358.9, h: 2361.4, l: 2358.6, c: 2360.6 },
      { o: 2360.6, h: 2362.9, l: 2359.6, c: 2362.1 },
    ],
    markers: [
      { at: 3, price: 2352.0, kind: "note", label: "equal lows" },
      { at: 7, price: 2352.1, kind: "note", label: "equal lows" },
      { at: 10, price: 2349.6, kind: "note", label: "sweep — clustered stops sat here" },
    ],
    outcome: "neutral",
  },
  {
    id: "london-open",
    title: "When volatility clocks in: London open",
    pair: "EURUSD",
    timeframe: "M15",
    narration: [
      { atCandle: 0, text: "Late Asian session. EURUSD breathes inside a band barely two pips wide. Nothing to trade — and that itself is information." },
      { atCandle: 5, text: "Eight candles with hardly a body between them. Quiet clusters with quiet — until the session changes." },
      { atCandle: 8, text: "London opens. Dealing desks, funds and corporate flow arrive at once, and candle size triples within the hour." },
      { atCandle: 12, text: "Volatility clusters too: expansion feeds expansion. Same pair, same day — only the clock changed, so the tape changed." },
      { atCandle: 16, text: "Pick your hours like you pick your setups. Some sessions pay you to be there; others only charge you spread." },
    ],
    candles: [
      { o: 1.08423, h: 1.08426, l: 1.08417, c: 1.0842 }, // Asian session — tiny bodies
      { o: 1.0842, h: 1.08429, l: 1.08417, c: 1.08426 },
      { o: 1.08426, h: 1.08429, l: 1.08416, c: 1.08419 },
      { o: 1.08419, h: 1.08427, l: 1.08416, c: 1.08424 },
      { o: 1.08424, h: 1.08431, l: 1.08421, c: 1.08428 },
      { o: 1.08428, h: 1.08431, l: 1.08419, c: 1.08422 },
      { o: 1.08422, h: 1.0843, l: 1.08419, c: 1.08427 },
      { o: 1.08427, h: 1.0843, l: 1.08422, c: 1.08425 },
      { o: 1.08425, h: 1.08454, l: 1.08423, c: 1.08448 }, // London open — candle size triples
      { o: 1.08448, h: 1.08483, l: 1.08445, c: 1.08476 },
      { o: 1.08476, h: 1.08479, l: 1.08456, c: 1.08462 },
      { o: 1.08462, h: 1.08505, l: 1.08459, c: 1.08498 },
      { o: 1.08498, h: 1.08532, l: 1.08494, c: 1.08524 }, // expansion begets expansion
      { o: 1.08524, h: 1.08527, l: 1.08501, c: 1.08508 },
      { o: 1.08508, h: 1.0855, l: 1.08505, c: 1.08542 },
      { o: 1.08542, h: 1.08566, l: 1.08538, c: 1.0856 },
      { o: 1.0856, h: 1.08564, l: 1.08545, c: 1.08551 },
    ],
    markers: [
      { at: 3, price: 1.08434, kind: "note", label: "Asian range — ~2 pips wide" },
      { at: 8, price: 1.08448, kind: "note", label: "London open — expansion" },
    ],
    outcome: "neutral",
  },
  {
    id: "revenge-spiral",
    title: "The revenge spiral: one loss becomes seven",
    pair: "BTCUSDT",
    timeframe: "M15",
    narration: [
      { atCandle: 2, text: "A clean long: entry 64,560, stop 64,260, one unit of risk. This is the last calm decision of the session." },
      { atCandle: 4, text: "Stopped out. −1R. Fine on paper — but the mind whispers: win it back, fast." },
      { atCandle: 6, text: "Re-entry minutes later at double size, no setup in sight. That isn't analysis — it's arithmetic to erase a feeling." },
      { atCandle: 8, text: "Stopped again. −3R total. Every loss makes the next size feel more 'necessary'. That is tilt, and it compounds." },
      { atCandle: 12, text: "Doubled again, stopped again: −7R. Three revenge trades burned a week of progress. A daily stop after trade two would have capped the damage at −3R." },
    ],
    candles: [
      { o: 64350, h: 64490, l: 64308, c: 64420 },
      { o: 64420, h: 64552, l: 64343, c: 64510 },
      { o: 64510, h: 64651, l: 64461, c: 64560 }, // planned long 64,560
      { o: 64560, h: 64616, l: 64310, c: 64380 },
      { o: 64380, h: 64408, l: 64117, c: 64180 }, // stop 64,260 hit: −1R
      { o: 64180, h: 64275, l: 64117, c: 64240 },
      { o: 64240, h: 64370, l: 64198, c: 64300 }, // revenge entry, 2× size
      { o: 64300, h: 64342, l: 64073, c: 64150 },
      { o: 64150, h: 64178, l: 63910, c: 63980 }, // stopped: running total −3R
      { o: 63980, h: 64116, l: 63910, c: 64060 },
      { o: 64060, h: 64187, l: 64025, c: 64110 }, // doubled again, 4× size
      { o: 64110, h: 64145, l: 63877, c: 63940 },
      { o: 63940, h: 63968, l: 63703, c: 63780 }, // stopped: −7R on the day
      { o: 63780, h: 63902, l: 63703, c: 63860 },
      { o: 63860, h: 63951, l: 63771, c: 63820 },
      { o: 63820, h: 63876, l: 63680, c: 63750 },
      { o: 63750, h: 63827, l: 63655, c: 63690 },
      { o: 63690, h: 63755, l: 63627, c: 63720 },
    ],
    markers: [
      { at: 2, price: 64560, kind: "entry", label: "planned long 64,560" },
      { at: 4, price: 64260, kind: "stop", label: "stop hit: −1R" },
      { at: 6, price: 64300, kind: "note", label: "2× size chase → −3R" },
      { at: 10, price: 64110, kind: "note", label: "4× size chase → −7R" },
    ],
    outcome: "stop",
  },
] as const;

/* ---------- arcade: Long or Short? ---------- */

export const GAME_SCENARIOS: readonly GameScenario[] = [
  {
    id: "ls-breakout-hold",
    pair: "EURUSD",
    timeframe: "M15",
    revealCount: 12,
    answer: "long",
    explain:
      "Three tests of the same ceiling, each dip shallower — buyers absorbed the selling, and the break held above the old high.",
    candles: [
      { o: 1.084, h: 1.0851, l: 1.0836, c: 1.0848 },
      { o: 1.0848, h: 1.0855, l: 1.0845, c: 1.085 }, // test 1 of 1.0855
      { o: 1.085, h: 1.0853, l: 1.0842, c: 1.0845 },
      { o: 1.0845, h: 1.0849, l: 1.0839, c: 1.0847 },
      { o: 1.0847, h: 1.0856, l: 1.0844, c: 1.0851 }, // test 2
      { o: 1.0851, h: 1.0854, l: 1.0846, c: 1.0849 },
      { o: 1.0849, h: 1.0852, l: 1.0845, c: 1.085 },
      { o: 1.085, h: 1.0856, l: 1.0848, c: 1.0853 }, // test 3, shallow dip
      { o: 1.0853, h: 1.0855, l: 1.085, c: 1.0852 },
      { o: 1.0852, h: 1.0854, l: 1.0849, c: 1.0853 },
      { o: 1.0853, h: 1.0858, l: 1.0851, c: 1.0857 }, // break
      { o: 1.0857, h: 1.086, l: 1.0854, c: 1.0858 }, // hold above 1.0855 — CHOICE
      { o: 1.0858, h: 1.0866, l: 1.0856, c: 1.0864 },
      { o: 1.0864, h: 1.0871, l: 1.0861, c: 1.0869 },
      { o: 1.0869, h: 1.0873, l: 1.0864, c: 1.0867 },
      { o: 1.0867, h: 1.0875, l: 1.0865, c: 1.0873 },
      { o: 1.0873, h: 1.0879, l: 1.087, c: 1.0877 },
      { o: 1.0877, h: 1.0881, l: 1.0873, c: 1.0879 },
    ],
  },
  {
    id: "ls-failed-break",
    pair: "GBPUSD",
    timeframe: "M15",
    revealCount: 12,
    answer: "short",
    explain:
      "The break above the range printed one candle of follow-through, then closed back INSIDE — a failed breakout traps buyers, and trapped buyers fuel the drop.",
    candles: [
      { o: 1.2705, h: 1.2718, l: 1.27, c: 1.2714 },
      { o: 1.2714, h: 1.2722, l: 1.2709, c: 1.2712 },
      { o: 1.2712, h: 1.2719, l: 1.2705, c: 1.2709 },
      { o: 1.2709, h: 1.2721, l: 1.2706, c: 1.2718 },
      { o: 1.2718, h: 1.2723, l: 1.2711, c: 1.2715 }, // range top ~1.2722
      { o: 1.2715, h: 1.272, l: 1.2707, c: 1.2711 },
      { o: 1.2711, h: 1.2717, l: 1.2704, c: 1.2714 },
      { o: 1.2714, h: 1.2728, l: 1.2712, c: 1.2726 }, // breakout candle
      { o: 1.2726, h: 1.2731, l: 1.2721, c: 1.2724 }, // stalls
      { o: 1.2724, h: 1.2727, l: 1.2714, c: 1.2716 }, // back inside
      { o: 1.2716, h: 1.2719, l: 1.2708, c: 1.271 },
      { o: 1.271, h: 1.2714, l: 1.2702, c: 1.2705 }, // CHOICE
      { o: 1.2705, h: 1.2708, l: 1.2694, c: 1.2697 },
      { o: 1.2697, h: 1.2701, l: 1.2687, c: 1.269 },
      { o: 1.269, h: 1.2694, l: 1.2681, c: 1.2684 },
      { o: 1.2684, h: 1.269, l: 1.2677, c: 1.2681 },
      { o: 1.2681, h: 1.2685, l: 1.2672, c: 1.2675 },
      { o: 1.2675, h: 1.268, l: 1.2668, c: 1.2672 },
    ],
  },
  {
    id: "ls-exhaustion-wick",
    pair: "XAUUSD",
    timeframe: "H1",
    revealCount: 12,
    answer: "short",
    explain:
      "A vertical run into a huge upper wick on the biggest candle of the day — the crowd bought the top and sellers answered. Exhaustion, not strength.",
    candles: [
      { o: 2331.0, h: 2334.5, l: 2329.0, c: 2333.2 },
      { o: 2333.2, h: 2337.8, l: 2332.1, c: 2336.9 },
      { o: 2336.9, h: 2341.2, l: 2335.5, c: 2340.1 },
      { o: 2340.1, h: 2344.6, l: 2339.0, c: 2343.8 },
      { o: 2343.8, h: 2348.9, l: 2342.7, c: 2347.6 },
      { o: 2347.6, h: 2352.4, l: 2346.2, c: 2351.3 },
      { o: 2351.3, h: 2356.8, l: 2350.1, c: 2355.9 },
      { o: 2355.9, h: 2361.5, l: 2354.6, c: 2360.2 },
      { o: 2360.2, h: 2366.3, l: 2359.1, c: 2365.1 },
      { o: 2365.1, h: 2371.0, l: 2363.8, c: 2369.7 },
      { o: 2369.7, h: 2378.4, l: 2368.5, c: 2371.2 }, // giant upper wick
      { o: 2371.2, h: 2372.8, l: 2366.4, c: 2367.9 }, // CHOICE
      { o: 2367.9, h: 2369.1, l: 2361.2, c: 2362.8 },
      { o: 2362.8, h: 2364.5, l: 2356.7, c: 2358.1 },
      { o: 2358.1, h: 2360.2, l: 2352.4, c: 2354.6 },
      { o: 2354.6, h: 2357.3, l: 2349.8, c: 2351.9 },
      { o: 2351.9, h: 2354.1, l: 2346.5, c: 2348.7 },
      { o: 2348.7, h: 2351.6, l: 2344.9, c: 2347.2 },
    ],
  },
  {
    id: "ls-hl-continuation",
    pair: "BTCUSDT",
    timeframe: "H1",
    revealCount: 12,
    answer: "long",
    explain:
      "Uptrend, pullback, and a higher low that held with two strong closes off it — continuation is the higher-probability read, and the trend resumed.",
    candles: [
      { o: 64120, h: 64480, l: 63980, c: 64410 },
      { o: 64410, h: 64760, l: 64330, c: 64690 },
      { o: 64690, h: 65040, l: 64580, c: 64970 },
      { o: 64970, h: 65380, l: 64890, c: 65310 },
      { o: 65310, h: 65620, l: 65180, c: 65540 },
      { o: 65540, h: 65710, l: 65290, c: 65370 }, // pullback starts
      { o: 65370, h: 65450, l: 65020, c: 65110 },
      { o: 65110, h: 65240, l: 64830, c: 64920 },
      { o: 64920, h: 65060, l: 64750, c: 64980 }, // higher low vs 63980
      { o: 64980, h: 65290, l: 64940, c: 65230 }, // strong close 1
      { o: 65230, h: 65510, l: 65170, c: 65470 }, // strong close 2
      { o: 65470, h: 65590, l: 65350, c: 65520 }, // CHOICE
      { o: 65520, h: 65890, l: 65480, c: 65840 },
      { o: 65840, h: 66210, l: 65790, c: 66150 },
      { o: 66150, h: 66480, l: 66080, c: 66390 },
      { o: 66390, h: 66650, l: 66290, c: 66580 },
      { o: 66580, h: 66840, l: 66470, c: 66720 },
      { o: 66720, h: 67050, l: 66650, c: 66980 },
    ],
  },
  {
    id: "ls-trend-pullback",
    pair: "USDJPY",
    timeframe: "M15",
    revealCount: 12,
    answer: "long",
    explain:
      "An established uptrend pulled back to a higher low at 154.94 and printed two strong closes off it — continuation off a held higher low is the highest-probability read on the board.",
    candles: [
      { o: 154.76, h: 154.85, l: 154.742, c: 154.82 },
      { o: 154.82, h: 154.918, l: 154.787, c: 154.9 },
      { o: 154.9, h: 155.029, l: 154.879, c: 154.99 },
      { o: 154.99, h: 155.104, l: 154.96, c: 155.08 },
      { o: 155.08, h: 155.193, l: 155.065, c: 155.16 },
      { o: 155.16, h: 155.255, l: 155.133, c: 155.24 },
      { o: 155.24, h: 155.27, l: 155.132, c: 155.15 },
      { o: 155.15, h: 155.168, l: 155.017, c: 155.05 },
      { o: 155.05, h: 155.065, l: 154.944, c: 154.98 }, // higher low at 154.94
      { o: 154.98, h: 155.09, l: 154.971, c: 155.06 }, // strong close 1
      { o: 155.06, h: 155.17, l: 155.051, c: 155.14 }, // strong close 2
      { o: 155.14, h: 155.215, l: 155.113, c: 155.2 }, // CHOICE
      { o: 155.2, h: 155.33, l: 155.182, c: 155.3 },
      { o: 155.3, h: 155.398, l: 155.267, c: 155.38 },
      { o: 155.38, h: 155.509, l: 155.359, c: 155.47 },
      { o: 155.47, h: 155.554, l: 155.44, c: 155.53 },
      { o: 155.53, h: 155.633, l: 155.515, c: 155.6 },
      { o: 155.6, h: 155.695, l: 155.573, c: 155.68 },
    ],
  },
  {
    id: "ls-trap-reversal",
    pair: "ETHUSDT",
    timeframe: "H1",
    revealCount: 12,
    answer: "short",
    explain:
      "The push above 3,428 lasted exactly one candle before closing back inside the range — a failed breakout traps late buyers, and their forced exits become the fuel for the drop.",
    candles: [
      { o: 3398, h: 3405, l: 3396.2, c: 3402 },
      { o: 3402, h: 3412.8, l: 3398.7, c: 3411 },
      { o: 3411, h: 3414.9, l: 3403.9, c: 3406 },
      { o: 3406, h: 3420.4, l: 3403, c: 3418 },
      { o: 3418, h: 3427.3, l: 3416.5, c: 3424 },
      { o: 3424, h: 3425.5, l: 3412.3, c: 3415 },
      { o: 3415, h: 3418, l: 3407.2, c: 3409 },
      { o: 3409, h: 3421.8, l: 3405.7, c: 3420 },
      { o: 3420, h: 3430.9, l: 3417.9, c: 3427 },
      { o: 3427, h: 3441.6, l: 3425.8, c: 3438 }, // breakout above 3,428
      { o: 3438, h: 3439.5, l: 3416, c: 3419 }, // slammed back inside
      { o: 3419, h: 3420.5, l: 3407.3, c: 3410 }, // CHOICE
      { o: 3410, h: 3413, l: 3394.2, c: 3396 },
      { o: 3396, h: 3397.8, l: 3378.7, c: 3382 },
      { o: 3382, h: 3385.9, l: 3368.9, c: 3371 },
      { o: 3371, h: 3373.4, l: 3357, c: 3360 },
      { o: 3360, h: 3363.3, l: 3350.5, c: 3352 },
      { o: 3352, h: 3353.5, l: 3338.3, c: 3341 },
    ],
  },
  {
    id: "ls-blowoff-wick",
    pair: "SOLUSDT",
    timeframe: "M15",
    revealCount: 12,
    answer: "short",
    explain:
      "A near-vertical climb ended in the chart's biggest upper wick at 150.80 — the crowd bought the very top and sellers absorbed every bit of it; that's exhaustion, not strength.",
    candles: [
      { o: 140.85, h: 141.5, l: 140.67, c: 141.2 },
      { o: 141.2, h: 142.03, l: 140.87, c: 141.85 },
      { o: 141.85, h: 142.99, l: 141.64, c: 142.6 },
      { o: 142.6, h: 143.54, l: 142.3, c: 143.3 },
      { o: 143.3, h: 144.48, l: 143.15, c: 144.15 },
      { o: 144.15, h: 145.05, l: 143.88, c: 144.9 },
      { o: 144.9, h: 146.1, l: 144.72, c: 145.8 },
      { o: 145.8, h: 146.83, l: 145.47, c: 146.65 },
      { o: 146.65, h: 147.89, l: 146.44, c: 147.5 },
      { o: 147.5, h: 148.54, l: 147.2, c: 148.3 },
      { o: 148.3, h: 150.8, l: 148.05, c: 148.2 }, // blow-off: wick to 150.80
      { o: 148.2, h: 148.35, l: 147.3, c: 147.6 }, // CHOICE
      { o: 147.6, h: 147.9, l: 146.62, c: 146.8 },
      { o: 146.8, h: 146.98, l: 145.67, c: 146 },
      { o: 146, h: 146.39, l: 145.09, c: 145.3 },
      { o: 145.3, h: 145.54, l: 144.4, c: 144.7 },
      { o: 144.7, h: 145.03, l: 143.95, c: 144.1 },
      { o: 144.1, h: 144.25, l: 143.33, c: 143.6 },
    ],
  },
  {
    id: "ls-range-fade",
    pair: "GBPUSD",
    timeframe: "M15",
    revealCount: 12,
    answer: "short",
    explain:
      "Three visits to 1.2726 resistance, each with a smaller body and no close above — inside a range the edges are for fading until price proves it can actually leave.",
    candles: [
      { o: 1.2692, h: 1.2699, l: 1.26914, c: 1.2698 },
      { o: 1.2698, h: 1.27066, l: 1.26969, c: 1.2706 },
      { o: 1.2706, h: 1.27193, l: 1.27053, c: 1.2718 },
      { o: 1.2718, h: 1.27262, l: 1.27176, c: 1.2724 }, // resistance test 1
      { o: 1.2724, h: 1.27251, l: 1.27135, c: 1.2714 },
      { o: 1.2714, h: 1.27145, l: 1.27011, c: 1.2702 },
      { o: 1.2702, h: 1.2703, l: 1.26954, c: 1.2696 },
      { o: 1.2696, h: 1.27056, l: 1.26949, c: 1.2705 },
      { o: 1.2705, h: 1.27183, l: 1.27043, c: 1.2717 },
      { o: 1.2717, h: 1.27256, l: 1.27166, c: 1.2723 }, // test 2
      { o: 1.2723, h: 1.27241, l: 1.27145, c: 1.2715 },
      { o: 1.2715, h: 1.2725, l: 1.27145, c: 1.27225 }, // test 3, shrinking body — CHOICE
      { o: 1.27225, h: 1.27235, l: 1.27124, c: 1.2713 },
      { o: 1.2713, h: 1.27136, l: 1.27009, c: 1.2702 },
      { o: 1.2702, h: 1.27033, l: 1.26933, c: 1.2694 },
      { o: 1.2694, h: 1.26945, l: 1.26856, c: 1.2687 },
      { o: 1.2687, h: 1.26941, l: 1.26865, c: 1.2693 },
      { o: 1.2693, h: 1.26935, l: 1.26881, c: 1.2689 },
    ],
  },
  {
    id: "ls-sweep-reverse",
    pair: "XAUUSD",
    timeframe: "M15",
    revealCount: 12,
    answer: "long",
    explain:
      "The wick through the equal lows at 2,341 was reclaimed within the same candle — stops were the target, and once that liquidity is spent the path of least resistance flips up.",
    candles: [
      { o: 2348.8, h: 2349.8, l: 2347, c: 2347.6 },
      { o: 2347.6, h: 2348.2, l: 2344.8, c: 2345.9 },
      { o: 2345.9, h: 2347.2, l: 2343.1, c: 2343.8 },
      { o: 2343.8, h: 2344.2, l: 2341, c: 2342.2 }, // equal low 2341.0
      { o: 2342.2, h: 2345.1, l: 2341.7, c: 2344 },
      { o: 2344, h: 2346, l: 2343.1, c: 2345.5 },
      { o: 2345.5, h: 2346.5, l: 2342.8, c: 2343.4 },
      { o: 2343.4, h: 2343.8, l: 2341.2, c: 2342 }, // equal low 2341.2
      { o: 2342, h: 2344.9, l: 2341.3, c: 2343.6 },
      { o: 2343.6, h: 2344.4, l: 2341.5, c: 2342.5 },
      { o: 2342.5, h: 2344.3, l: 2338.2, c: 2343.8 }, // sweep to 2338.2, instant reclaim
      { o: 2343.8, h: 2346.5, l: 2343.5, c: 2345.9 }, // strong close — CHOICE
      { o: 2345.9, h: 2349.4, l: 2345.3, c: 2348.4 },
      { o: 2348.4, h: 2351.6, l: 2347.3, c: 2351 },
      { o: 2351, h: 2354.5, l: 2350.3, c: 2353.2 },
      { o: 2353.2, h: 2356.4, l: 2352.2, c: 2355.6 },
      { o: 2355.6, h: 2358.5, l: 2355.1, c: 2357.4 },
      { o: 2357.4, h: 2360.3, l: 2356.5, c: 2359.8 },
    ],
  },
  {
    id: "ls-momentum-hold",
    pair: "BTCUSDT",
    timeframe: "M15",
    revealCount: 12,
    answer: "long",
    explain:
      "The coil under 65,200 broke with the widest body on the chart and every dip since has held above the old ceiling — momentum that refuses to give back its breakout usually keeps paying.",
    candles: [
      { o: 64820, h: 64940, l: 64784, c: 64880 },
      { o: 64880, h: 64986, l: 64814, c: 64950 },
      { o: 64950, h: 65028, l: 64868, c: 64910 },
      { o: 64910, h: 65068, l: 64850, c: 65020 },
      { o: 65020, h: 65146, l: 64990, c: 65080 },
      { o: 65080, h: 65110, l: 64986, c: 65040 },
      { o: 65040, h: 65170, l: 65004, c: 65110 },
      { o: 65110, h: 65196, l: 65044, c: 65160 },
      { o: 65160, h: 65238, l: 65088, c: 65130 },
      { o: 65130, h: 65356, l: 65112, c: 65320 }, // widest body — coil breaks 65,200
      { o: 65320, h: 65344, l: 65254, c: 65290 },
      { o: 65290, h: 65380, l: 65266, c: 65350 }, // holding above the old ceiling — CHOICE
      { o: 65350, h: 65580, l: 65314, c: 65520 },
      { o: 65520, h: 65716, l: 65454, c: 65680 },
      { o: 65680, h: 65868, l: 65638, c: 65790 },
      { o: 65790, h: 65988, l: 65730, c: 65940 },
      { o: 65940, h: 66126, l: 65910, c: 66060 },
      { o: 66060, h: 66210, l: 66006, c: 66180 },
    ],
  },
  {
    id: "ls-lower-high",
    pair: "EURUSD",
    timeframe: "H1",
    revealCount: 12,
    answer: "short",
    explain:
      "The rally stalled at 1.0918, short of the 1.0924 top — a lower high — and the next leg closed under the pullback low; when buyers can't reach and sellers can, the trend is rolling over.",
    candles: [
      { o: 1.0895, h: 1.0903, l: 1.08944, c: 1.0902 },
      { o: 1.0902, h: 1.09096, l: 1.09009, c: 1.0909 },
      { o: 1.0909, h: 1.09173, l: 1.09083, c: 1.0916 },
      { o: 1.0916, h: 1.09242, l: 1.09155, c: 1.0922 }, // trend high 1.09242
      { o: 1.0922, h: 1.09231, l: 1.09145, c: 1.0915 },
      { o: 1.0915, h: 1.09155, l: 1.09051, c: 1.0906 },
      { o: 1.0906, h: 1.0907, l: 1.08984, c: 1.0899 }, // pullback low 1.0899
      { o: 1.0899, h: 1.09056, l: 1.08979, c: 1.0905 },
      { o: 1.0905, h: 1.09133, l: 1.09043, c: 1.0912 },
      { o: 1.0912, h: 1.09182, l: 1.09116, c: 1.09165 }, // lower high 1.09182
      { o: 1.09165, h: 1.09176, l: 1.09075, c: 1.0908 },
      { o: 1.0908, h: 1.09084, l: 1.08967, c: 1.08975 }, // pullback low cracks — CHOICE
      { o: 1.08975, h: 1.08985, l: 1.08914, c: 1.0892 },
      { o: 1.0892, h: 1.08926, l: 1.08829, c: 1.0884 },
      { o: 1.0884, h: 1.08853, l: 1.08763, c: 1.0877 },
      { o: 1.0877, h: 1.08778, l: 1.0869, c: 1.087 },
      { o: 1.087, h: 1.08762, l: 1.08696, c: 1.0875 },
      { o: 1.0875, h: 1.08755, l: 1.08671, c: 1.0868 },
    ],
  },
  {
    id: "ls-spike-fade",
    pair: "USDJPY",
    timeframe: "M15",
    revealCount: 12,
    answer: "long",
    explain:
      "The one-candle news spike to 154.40 found zero follow-through — five of the next six candles closed higher, so the drop was headline reflex, not new sellers, and unconfirmed spikes get faded.",
    candles: [
      { o: 155.15, h: 155.21, l: 155.132, c: 155.18 },
      { o: 155.18, h: 155.238, l: 155.147, c: 155.22 },
      { o: 155.22, h: 155.259, l: 155.169, c: 155.19 },
      { o: 155.19, h: 155.264, l: 155.16, c: 155.24 },
      { o: 155.24, h: 155.273, l: 155.195, c: 155.21 },
      { o: 155.21, h: 155.265, l: 155.183, c: 155.25 },
      { o: 155.25, h: 155.259, l: 154.4, c: 154.62 }, // news spike — low 154.40
      { o: 154.62, h: 154.724, l: 154.608, c: 154.7 },
      { o: 154.7, h: 154.739, l: 154.639, c: 154.66 },
      { o: 154.66, h: 154.804, l: 154.651, c: 154.78 },
      { o: 154.78, h: 154.884, l: 154.771, c: 154.86 },
      { o: 154.86, h: 154.935, l: 154.833, c: 154.92 }, // five of six closes higher — CHOICE
      { o: 154.92, h: 155.03, l: 154.902, c: 155 },
      { o: 155, h: 155.078, l: 154.967, c: 155.06 },
      { o: 155.06, h: 155.099, l: 154.959, c: 154.98 },
      { o: 154.98, h: 155.104, l: 154.95, c: 155.08 },
      { o: 155.08, h: 155.173, l: 155.065, c: 155.14 },
      { o: 155.14, h: 155.205, l: 155.113, c: 155.19 },
    ],
  },
] as const;

export function findReplay(id: string): ReplayScenario | null {
  return REPLAYS.find((r) => r.id === id) ?? null;
}
