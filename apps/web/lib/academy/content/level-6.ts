/* =========================================================================
 * Level 6 — Prove It. Backtests, journals and the paper capstone — evidence before money
 * Voice: plain language, concrete numbers, honest about risk.
 * ======================================================================= */

import type { LessonContent } from "../curriculum";

export const LEVEL_6: readonly LessonContent[] = [
  {
    slug: "backtesting-honestly",
    title: "Backtesting, honestly",
    hook: "History will tell you the truth about your plan — if you stop bribing it.",
    summary:
      "How to replay your rules over past charts without fooling yourself: sample size, the four classic self-deceptions, and the out-of-sample discipline that separates a tested edge from a fitted fantasy.",
    sections: [
      {
        h: "Replaying the past by the rules",
        paras: [
          "A backtest answers one question: if I had followed my written plan, trade for trade, over the last N months of charts — what would have happened? You scroll history candle by candle, and every time your setup and trigger fire, you record the trade exactly as the plan dictates: entry, stop, target, outcome in R (risk multiples). No skipping the ugly ones, no 'I wouldn't have taken that one.' The plan takes the trade, or the plan is rewritten — there is no third option.",
          "The output is a small table of numbers: how often the setup appears, the win rate, the average win and loss in R, and the number that actually matters — expectancy, the average R you make per trade across everything. A plan that wins 40% of the time but makes +2R on winners and −1R on losers has an expectancy of +0.20R per trade: a real edge. A plan that wins 70% but loses big when it loses can be a slow bleed. Win rate is a feeling; expectancy is the verdict.",
          "One rule before any of it counts: sample size. Ten trades tell you nothing — flip a fair coin ten times and you'll see streaks that look like destiny. You need at least 100 recorded setups before the numbers begin to mean anything, and even then they're an estimate, not a promise. If your setup fires twice a week, that's a year of history to scroll. Do it anyway; it's the cheapest year of tuition you will ever pay.",
        ],
        callout: {
          tone: "tip",
          title: "Count in R, not dollars",
          body: "Record every outcome as a multiple of the risk you took: +1.8R, −1R, +0.4R. R-multiples make a hundred trades comparable regardless of account size — and they're the same unit your live journal will use.",
        },
        check: {
          q: "Ten backtested trades of your new setup all won. What do you actually know?",
          options: [
            "The setup has a real edge — ten for ten is rare",
            "Almost nothing yet — ten trades is coin-flip territory; you need 100+ before the numbers start to mean anything",
            "The win rate is 100%, so expectancy must be positive",
          ],
          answer: 1,
          explain: "Flip a fair coin ten times and you'll see streaks that look like destiny. Sample size comes before conclusions — 100+ logged setups is the floor, and even then it's an estimate.",
        },
      },
      {
        h: "The four ways traders lie to themselves",
        paras: [
          "Backtesting has a dirty secret: done casually, it always says yes. The reason is that you already know how the chart ends. Hindsight bias makes every winning setup look obvious after the fact — so you 'see' entries you would never have caught live. Cherry-picking is its cousin: skipping the losers with a quiet 'I'd have noticed the news that day.' Both inflate results the market will happily deflate for you later, at full price.",
          "The most dangerous trap has a technical name: curve-fitting, or overfitting. It starts innocently — one losing trade in the sample, so you add a rule that excludes it: 'skip Wednesdays.' Another loser, another rule: 'only when the sweep is under 8 pips.' Each patch makes the PAST more perfect and the FUTURE more fragile, because you're no longer modeling market behavior — you're memorizing one specific stretch of history that will never repeat. A plan with twelve conditions that never lost in 2025 is a description of 2025, not an edge.",
          "The antidote is out-of-sample testing: split your history before you start. Build and tune the plan on the first chunk (say 2024), then run it — frozen, no more edits — on data it has never seen (2025). If the edge only exists in the tuning data, it was never an edge. The final gate is a forward test: run the frozen plan on a paper account in live markets for several weeks. Forward testing is slower and humbler than scrolling history — which is exactly why it's the last honest checkpoint before real money. It's also the next lesson's capstone.",
        ],
        table: {
          caption: "The self-deception catalogue",
          head: ["Trap", "What it looks like", "The honest fix"],
          rows: [
            ["Hindsight bias", "Every winner looks 'obvious' when you already know the ending", "Scroll candle-by-candle with the future hidden; log the trade before revealing what happens"],
            ["Cherry-picking", "'I wouldn't have taken THAT one' — losers quietly excluded", "The plan takes every qualifying trade, or the plan gets rewritten. No discretionary skips"],
            ["Curve-fitting", "A new rule per losing trade until the past is perfect", "Fewer rules, bigger sample. Suspect any condition that exists to delete one specific loss"],
            ["Testing on tuning data", "The plan is 'validated' on the same history it was built on", "Split the data: tune on one chunk, verify frozen on the unseen chunk, then forward test on paper"],
          ],
        },
        callout: {
          tone: "warn",
          title: "Past results promise nothing",
          body: "A positive backtest — even an honest one — is evidence, not a guarantee. Markets change. That's why risk rules from Level 2 stay on every trade no matter how good the numbers look.",
        },
        figure: {
          kind: "strategy-loop",
          caption: "The honest pipeline: idea → written rules → backtest → out-of-sample and forward test → live. Skipping a stage doesn't skip the tuition — it defers it to live prices.",
        },
      },
      {
        h: "What a passing grade looks like",
        paras: [
          "So when is a plan ready for the capstone? A reasonable bar: 100+ logged setups, positive expectancy in the out-of-sample chunk (not just the tuning chunk), and no single rule you can't explain in one sentence of market logic. 'Skip the rollover hour because spreads triple' explains itself. 'Skip Wednesdays' does not — it's a memorized loss wearing a rule's clothing.",
          "Notice what's NOT on the bar: a high win rate, zero losing streaks, or smooth results. An honest test of a real edge still contains losing weeks — your Level 2 math says a 45% win-rate plan will hit four losses in a row about once every 30 trades. The point of testing isn't to find a plan that never loses; it's to know your plan's losing streaks in advance, so that when one arrives live, it's an expected weather pattern and not a crisis. That psychological armor — 'this drawdown is within test parameters' — may be the single most valuable output of the whole exercise.",
        ],
        figure: {
          kind: "equity-curve",
          caption: "Two curves with the same edge: sized at 1%, the scheduled losing streak is a dip you rode through in testing; sized recklessly, it's the end of the chart.",
        },
      },
    ],
    terms: [
      { term: "backtest", def: "Replaying your written rules over historical charts, logging every qualifying trade exactly as the plan dictates." },
      { term: "sample size", def: "The number of recorded setups. Below ~100, streaks and luck dominate; conclusions are noise." },
      { term: "overfitting", def: "Adding rules until past results are perfect — memorizing history instead of modeling behavior. Also called curve-fitting." },
      { term: "out-of-sample", def: "History your plan was NOT tuned on, held back to verify the edge survives on unseen data." },
      { term: "forward test", def: "Running the frozen plan on a paper account in live markets — the last checkpoint before real money." },
      { term: "expectancy", def: "Average R earned per trade across all wins and losses. The number that decides if an edge exists." },
    ],
    quiz: [
      {
        q: "Why is a 10-trade backtest worthless?",
        options: [
          "Ten trades take too long to record",
          "Backtests only work with round numbers of trades",
          "At that sample size, luck and streaks dominate — a fair coin looks like destiny over 10 flips",
          "Brokers require 50 trades minimum",
        ],
        answer: 2,
        explain: "Randomness produces convincing patterns in small samples. Aim for 100+ setups before the numbers mean anything.",
      },
      {
        q: "Your backtest has one losing Wednesday, so you add a rule: 'never trade Wednesdays.' This is…",
        options: [
          "Good optimization — the data proved Wednesdays are bad",
          "Curve-fitting — you memorized one loss instead of modeling market behavior",
          "Out-of-sample testing",
          "A valid fix as long as you document it",
        ],
        answer: 1,
        explain: "A rule that exists to delete one specific loss makes the past prettier and the future more fragile. Demand one sentence of market logic per rule.",
      },
      {
        q: "A plan wins only 40% of the time, but winners average +2R and losers −1R. Its expectancy is…",
        options: [
          "Negative — a 40% win rate always loses money",
          "Zero — wins and losses cancel out",
          "Impossible to compute without dollar amounts",
          "+0.20R per trade — a real edge despite losing most trades",
        ],
        answer: 3,
        explain: "0.4 × (+2R) + 0.6 × (−1R) = +0.20R. Expectancy, not win rate, is the verdict — and R-multiples make account size irrelevant.",
      },
      {
        q: "The point of out-of-sample testing is to…",
        options: [
          "Check the edge exists on data the plan was never tuned on",
          "Double the sample size",
          "Test the plan on a different currency pair",
          "Make the backtest finish faster",
        ],
        answer: 0,
        explain: "An edge that only exists in the tuning data was never an edge. Freeze the plan, then run it on the chunk it has never seen.",
      },
      {
        q: "An honest backtest of a genuinely profitable plan should show…",
        options: [
          "No losing streaks at all",
          "A win rate above 80%",
          "Losing streaks you can now expect and survive — known weather, not a crisis",
          "Profits in every single month",
        ],
        answer: 2,
        explain: "Real edges lose often — a 45% win rate hits four straight losses regularly. Testing tells you the streaks in advance so live drawdowns arrive as expected.",
      },
    ],
  },

  {
    slug: "journal-like-a-pro",
    title: "Journal like a pro",
    hook: "Your next edge isn't a new entry. It's the mistake you keep repeating.",
    summary:
      "The trading journal as a feedback loop: exactly what to log on every trade, the weekly review ritual that finds your biggest leak, and why fixing one recurring error beats hunting new setups.",
    sections: [
      {
        h: "The feedback loop",
        paras: [
          "Every skill you've ever built — an instrument, a sport, a language — improved through the same loop: perform, record, review, adjust. Trading is the rare skill where most people skip the middle two steps, because the market already 'keeps score' in money. But P&L is a terrible teacher: it rewards broken rules on lucky days and punishes perfect discipline on unlucky ones. If you learn from P&L alone, you will learn exactly the wrong lessons, reinforced at random — which is how casinos build regulars.",
          "The journal fixes the loop by recording what P&L can't see: whether you followed the plan. A rule-following loser is a GOOD trade that cost money. A rule-breaking winner is a BAD trade that paid you — this time — and every one you celebrate buys you a bigger rule-break later. The journal is where those two trades stop looking identical.",
        ],
        callout: {
          tone: "story",
          title: "The expensive winner",
          body: "A trader skips his checklist, doubles his size on a hunch, and wins $400. Cheapest lesson he never learned: three weeks later the same hunch, same doubled size, gives back $1,900. The journal had flagged the first trade as a violation — he just hadn't done the review that would have caught it.",
        },
        figure: {
          kind: "strategy-loop",
          caption: "The journal powers the middle of the loop: rules produce trades, the record and review turn trades back into better rule-following — and only then into better rules.",
        },
      },
      {
        h: "What to log on every trade",
        paras: [
          "A useful journal entry takes two minutes and captures seven things. The setup tag — a short name for which plan setup this was ('sweep-reclaim'), so trades can be grouped and compared later. Planned versus actual: entry, stop and size as the plan dictated, next to what you actually did — the gap between those columns is where your money leaks. A screenshot of the chart at entry and one at exit, because in a month you will not remember what you saw, only what happened after. Your emotional state on a simple 1–5 scale (1 calm, 5 tilted). And any rule violations, named specifically: 'moved stop', 'entered before trigger', 'size 2× plan', 'traded outside window'.",
          "Honesty is the entire value. A journal that flatters you is dead weight — the violations column exists precisely because everyone has entries for it, including professionals with decades of screen time. On the platform, part of this ledger keeps itself: every guarded trade is recorded with its planned risk, R-multiple and P&L automatically, and Trade Guard makes some violations — oversizing, trading through a drawdown breaker — impossible to commit in the first place. But no software can log how you felt or what you saw. The two-minute human half stays yours.",
        ],
        table: {
          caption: "The journal entry, field by field",
          head: ["Field", "Why it matters"],
          rows: [
            ["Setup tag", "Lets the weekly review compute win rate and expectancy PER setup — plans are judged by group, not by trade"],
            ["Planned vs actual entry/stop/size", "The gap between columns is your leak, measured in pips and dollars"],
            ["Screenshots (entry + exit)", "In a month you'll remember the outcome, not the chart. Pictures outlast hindsight"],
            ["Emotional state (1–5)", "Reveals the tilt pattern: most traders' worst trades cluster at 4–5, right after a loss"],
            ["Rule violations, named", "The one column that predicts blow-ups. An honest zero here matters more than a green P&L"],
          ],
        },
        check: {
          q: "You broke your entry rule, doubled size on a hunch — and the trade won $400. What does the journal call it?",
          options: [
            "A good trade — the P&L column is green",
            "A bad trade that happened to pay: logged as a violation, because celebrating it buys a bigger rule-break later",
            "Nothing — winners don't need journal entries",
          ],
          answer: 1,
          explain: "P&L rewards broken rules on lucky days. The violations column exists so a rule-breaking winner and a rule-following loser stop looking identical.",
        },
      },
      {
        h: "The weekly review ritual",
        paras: [
          "The journal earns its keep in a 30-minute ritual, same time every week, markets closed. Step one: group the week's trades by setup tag and compute win rate and average R per group — you're checking whether live results are drifting from your backtest numbers. Step two: find the single biggest leak — the one recurring violation or gap that cost the most. Sort the week's trades by 'money lost to rule-breaks' and the leak is usually staring at you: stops moved on 3 of 4 losers, or every 4–5 emotion trade entered before the trigger. Step three: write ONE fix for the coming week. One. 'This week I do not touch a stop after entry.' Next week, review whether the fix held, then find the next leak.",
          "Notice what this ritual is NOT: hunting for new setups. The instinct after a losing week is to redesign the plan — but if the journal shows the plan was only followed on 6 of 10 trades, you have no data on the plan at all; you have data on improvisation. The professional sequence is: eliminate YOUR recurring error first, until the violations column runs empty for weeks. Only then do the setup statistics mean anything, and only then — through the plan-rewrite process from Level 3, in writing, between sessions — do you touch the rules themselves. Most traders are one fixed leak away from their backtest numbers, and they go looking for a new plan instead.",
        ],
        callout: {
          tone: "tip",
          title: "One fix per week",
          body: "Fixing one leak per week feels slow and compounds fast: it's up to 52 eliminated errors a year. Fixing five at once fixes none — attention, like risk, works best concentrated.",
        },
      },
    ],
    terms: [
      { term: "journal", def: "The per-trade record of plan vs. action, screenshots, emotion and violations — your feedback loop." },
      { term: "setup tag", def: "A short name grouping trades by plan setup, so statistics are computed per setup, not per feeling." },
      { term: "leak", def: "A recurring, measurable loss source — usually a repeated rule violation, not a flaw in the setup." },
      { term: "review cadence", def: "The fixed weekly appointment where trades are grouped, the biggest leak is named and one fix is set." },
      { term: "rule violation", def: "Any deviation from the written plan — moved stop, early entry, oversizing — logged by name, win or lose." },
    ],
    quiz: [
      {
        q: "Why is P&L alone a bad teacher?",
        options: [
          "It rewards broken rules on lucky days and punishes discipline on unlucky ones",
          "Profits are taxed, so P&L numbers are misleading",
          "P&L updates too slowly to learn from",
          "Money is less motivating than grades",
        ],
        answer: 0,
        explain: "Random reinforcement teaches the wrong lessons — a rule-breaking winner quietly trains you toward a bigger rule-break later.",
      },
      {
        q: "You broke your entry rule and the trade made money. In the journal, this is…",
        options: [
          "A win — the outcome justifies the entry",
          "Not worth logging, since nothing went wrong",
          "A rule violation to log by name, despite the profit",
          "Proof the entry rule should be removed",
        ],
        answer: 2,
        explain: "A rule-breaking winner is a bad trade that happened to pay. The violations column is the one that predicts blow-ups.",
      },
      {
        q: "The weekly review's main output is…",
        options: [
          "A new setup to add to the plan",
          "One named fix for your single biggest leak",
          "A prediction for next week's market",
          "A bigger position size if the week was green",
        ],
        answer: 1,
        explain: "One leak, one fix, one week — then verify it held. Redesigning the plan comes only after the violations column runs clean.",
      },
      {
        q: "Your journal shows the plan was followed on only 6 of 10 trades this week. What do the week's results tell you about the plan?",
        options: [
          "The plan needs a lower win-rate setup",
          "The plan failed and should be replaced",
          "The plan is fine because some trades won",
          "Almost nothing — you have data on improvisation, not on the plan",
        ],
        answer: 3,
        explain: "Statistics describe what was actually executed. Until adherence is high, the plan itself hasn't been tested live at all.",
      },
    ],
  },

  {
    slug: "paper-trading-capstone",
    title: "The paper trading capstone",
    hook: "Every hour of study was for this: fly the account. Rules on, money off.",
    summary:
      "The academy's hero trial: run a $10,000 paper account under your real rules — stop on every trade, 1% risk sizing — and let the platform verify your discipline automatically. Passing is rule-following, not profit.",
    interactive: { kind: "capstone" },
    sections: [
      {
        h: "Why paper first",
        paras: [
          "Pilots log simulator hours before carrying passengers, and nobody calls that timid — reps are reps, and simulator crashes cost nothing. Paper trading is your simulator: a live-market account with a real price feed, real spreads, and real order mechanics — funded with $10,000 of practice balance instead of money. Every mistake you're still going to make (and you will make them; everyone does) costs tuition of exactly zero.",
          "Everything you've built converges here. The plan from Level 3 gives you the rules. The backtest from this level says the rules deserve a forward test. The journal is running. The paper account is where all three meet live markets for the first time — the forward test from the backtesting lesson, made real. This is the trial: not whether you can profit in a week (a coin can do that), but whether you can execute a written plan under live conditions without breaking it.",
        ],
        callout: {
          tone: "story",
          title: "This is the hero trial",
          body: "Every rank you've climbed led here. No monster at the gate — just you, a live market, and the question every level has been asking: can you follow your own rules when the chart is moving?",
        },
      },
      {
        h: "The three missions",
        paras: [
          "The capstone is three missions, verified automatically by the platform — no screenshots to submit, no honor system. Mission one: create your paper trading account. It opens with the standard $10,000 practice balance and behaves like the real thing, including Trade Guard, which will size and check your orders exactly as it would live. Mission two: close three paper trades, each placed with a stop loss and sized at 1% risk. Guarded trades — orders placed through the risk engine — record their stop and risk percent at entry, which is how the platform verifies the rules were followed rather than taking your word for it. Mission three: once both are done, claim the capstone from your academy dashboard. The claim button unlocks by itself when the ledger confirms your missions; if it hasn't, the checklist shows exactly which mission is still open.",
          "Three trades is deliberately small — this is a discipline check, not a statistical sample (your backtest was the sample). Take the trades from your actual plan, in your actual window, journaled like any other. Win, lose, or scratch: a stopped-out trade with correct sizing counts fully. The platform is checking the two rules that decide survival — a stop on every trade, risk capped at 1% — because those are the two that separate an account that can have a bad week from an account that can have a last week.",
        ],
        table: {
          caption: "Capstone missions — auto-verified by the platform",
          head: ["Mission", "What the platform checks"],
          rows: [
            ["1. Create your paper account", "Practice account exists, funded with the standard $10,000 balance"],
            ["2. Close 3 guarded paper trades", "Each closed trade had a stop loss attached and risk sized at 1% of equity"],
            ["3. Claim the capstone", "Missions 1–2 confirmed in the ledger; the claim unlocks automatically"],
          ],
        },
        check: {
          q: "Your second capstone trade hit its stop for a clean 1R loss — placed with a stop, sized at 1%. Does it count toward the three?",
          options: [
            "No — only winning trades demonstrate skill",
            "Yes, fully — the platform verifies the stop and the sizing, not the outcome",
            "Only if the other two trades finish green",
          ],
          answer: 1,
          explain: "The capstone grades discipline, not profit. A stopped-out trade with correct sizing is exactly the behavior being verified — win, lose, or scratch.",
        },
      },
      {
        h: "What passing means — and what it unlocks",
        paras: [
          "Read this twice, because it's the opposite of every trading movie: the capstone does not grade profit. A week where you follow every rule and finish down 2% is a PASS — that's a trader executing a plan through normal variance. A week where you triple the account by removing stops and doubling size is a FAIL in every way that matters, even though no exam flags it: you've practiced habits that end accounts, and rehearsed them until they feel like winning. Rule-following losing weeks build careers. Rule-breaking winning weeks end them — later, at live size, when the same habit finally meets the losing streak your Level 2 math guarantees is coming.",
          "Completing the capstone makes you eligible for the Hero Trader certificate — the verified, shareable proof that you finished every level of this academy, capstone included — and unlocks Level 5, where the curriculum turns to what actually breaks trained traders: psychology under streaks, and the automation guardrails that hold the line when discipline gets expensive. The paper account stays yours after the capstone. Many graduates keep flying it for months, and there is no prize for rushing off it — the market will still be there.",
        ],
        callout: {
          tone: "warn",
          title: "Paper is practice, not prophecy",
          body: "Paper results never promise live results. Real money adds real emotions, and fills can differ. The capstone certifies your discipline — not future profits. Nothing in this academy is financial advice.",
        },
        figure: {
          kind: "equity-curve",
          caption: "What the capstone protects: the account risking 1% survives its scheduled losing streaks and keeps flying; the reckless curve doesn't get a second act.",
        },
      },
    ],
    terms: [
      { term: "paper trading", def: "Trading live markets with a practice balance — real prices and mechanics, zero money at risk." },
      { term: "capstone", def: "The academy's final verified mission set: paper account created, three rule-following trades closed, claim confirmed." },
      { term: "guarded trade", def: "An order placed through the risk engine, which records its stop and risk percent — making rule-following verifiable." },
      { term: "risk rule", def: "The non-negotiables on every capstone trade: a stop loss attached, and size capped at 1% of equity." },
    ],
    quiz: [
      {
        q: "You finish your capstone week down 1.5%, with every trade stopped, sized at 1% and taken from your plan. The capstone considers this…",
        options: [
          "A fail — the account lost money",
          "A pass only if the next week is profitable",
          "A pass — passing is rule-adherence through normal variance, not profit",
          "A retry — losing weeks reset the missions",
        ],
        answer: 2,
        explain: "The capstone grades discipline, not P&L. A rule-following losing week is exactly what executing a real plan looks like sometimes.",
      },
      {
        q: "A trader passes mission 2 by tripling the paper account — no stops, 10% risk per trade. What has this week actually built?",
        options: [
          "Nothing — it won't count: capstone trades are verified for stops and 1% sizing",
          "A strong foundation, since profit proves skill",
          "Eligibility for the certificate ahead of schedule",
          "Proof that stops were unnecessary this week",
        ],
        answer: 0,
        explain: "Guarded trades record stop and risk at entry, so rule-breaking trades simply don't satisfy the mission. The habits rehearsed wouldn't survive live markets anyway.",
      },
      {
        q: "Mid-capstone, a trade is 20 pips against you but hasn't hit the stop. The plan says nothing about early exits. The rule-following action is…",
        options: [
          "Close it — protecting paper profit builds good instincts",
          "Widen the stop so the trade has room to recover",
          "Add to the position to improve the average price",
          "Do nothing — the pre-placed stop is the plan's exit, and it hasn't fired",
        ],
        answer: 3,
        explain: "The stop was placed by calm-you before entry; a drawdown inside it is normal variance. Moving or overriding it is the leak your journal exists to catch.",
      },
    ],
  },
] as const;
