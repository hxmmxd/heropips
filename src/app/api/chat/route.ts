import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
  fetchNewsHeadlines,
  markSignalFired,
} from '@/lib/market';

import { callLLM } from '@/lib/llmRouter';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// Keywords that indicate user explicitly wants a trade signal
const SIGNAL_KEYWORDS = [
  'signal', 'trade', 'buy', 'sell', 'entry', 'position',
  'setup', 'execute', 'generate signal', 'open', 'short', 'long',
];

function wantsSignal(message: string): boolean {
  const lower = message.toLowerCase();
  return SIGNAL_KEYWORDS.some(kw => lower.includes(kw));
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    // ── Self-healing database check (runs once per dev server startup) ──
    if (!(global as any).limitsMigrated) {
      try {
        await supabaseAdmin.rpc('exec_sql_raw', {
          sql_text: `
            ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS daily_tokens_used INTEGER DEFAULT 0 NOT NULL,
            ADD COLUMN IF NOT EXISTS daily_signals_used INTEGER DEFAULT 0 NOT NULL,
            ADD COLUMN IF NOT EXISTS last_limit_reset_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
          `
        });
      } catch (err: any) {
        console.error('[Migration] Failed to add limit columns:', err);
      }
      (global as any).limitsMigrated = true;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, daily_tokens_used, daily_signals_used, last_limit_reset_at')
      .eq('id', user.id)
      .maybeSingle();

    const userPlan = profile?.plan || 'free';
    const isFree = userPlan === 'free' || userPlan === 'starter';

    let dailyTokensUsed = profile?.daily_tokens_used ?? 0;
    let dailySignalsUsed = profile?.daily_signals_used ?? 0;
    let lastReset = new Date(profile?.last_limit_reset_at || new Date());
    const now = new Date();

    // Reset counters if crossed UTC day boundary
    if (
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear()
    ) {
      dailyTokensUsed = 0;
      dailySignalsUsed = 0;
      await supabaseAdmin
        .from('profiles')
        .update({
          daily_tokens_used: 0,
          daily_signals_used: 0,
          last_limit_reset_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', user.id);
    }

    const saveUsage = async (tokens: number, signals: number) => {
      if (isFree) {
        await supabaseAdmin
          .from('profiles')
          .update({
            daily_tokens_used: tokens,
            daily_signals_used: signals,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    };

    const body = await request.json();
    const userMessages = body.messages || [];
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

    // ── Code Generation Abuse Interceptor (Blocks LLM token abuse) ──
    const CODE_REGEX = /(?:write|generate|create|develop|code|program)\s+(?:some\s+|a\s+|an\s+)?(?:code|script|program|function|class|component|algorithm|api|bot|macro|plugin|extension|module|wrapper|scaffold)|(?:python|javascript|typescript|pinescript|pine\s+script|html|css|solidity|rust|java|c\+\+|golang|ruby|php|bash|powershell|vba)\s+(?:code|script|program|function|class|component|library|package|snippet)/i;
    if (CODE_REGEX.test(lastUserMessage)) {
      return NextResponse.json({
        text: "I am your financial trading assistant, specialized in market analysis, technical indicator evaluation, and trade signal executions. I do not write or generate programming code.",
        ticket: null,
      });
    }

    const accountBalance = body.accountBalance ? parseFloat(body.accountBalance.replace(/,/g, '')) : 10000;
    const forceSignal = body.forceSignal === true;

    const activeBrokerId = body.activeBrokerId;

    // Load allowed symbols of active broker from cache / DB
    let allowedSymbols: string[] = [];
    if (activeBrokerId && activeBrokerId !== 'none') {
      try {
        const { getAllBrokers, syncBrokerToSupabase } = await import('@/lib/broker');
        const { farmGetSymbols, resolveAccountId } = await import('@/lib/mt5farm');

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        let brokers = await getAllBrokers(user?.id);
        let activeBroker = brokers.find(b => b.id === activeBrokerId || b.login === activeBrokerId);

        if (activeBroker) {
          allowedSymbols = activeBroker.allowed_symbols || [];

          // Self-healing: if cache is empty, fetch live from MT5 Farm sidecar
          if (allowedSymbols.length === 0) {
            const loginOrId = activeBroker.login || activeBroker.id;
            const accountId = await resolveAccountId(loginOrId);
            const symbols = await farmGetSymbols(accountId);
            if (symbols && symbols.length > 0) {
              allowedSymbols = symbols;
              activeBroker.allowed_symbols = symbols;
              
              if (user?.id) {
                // Sync updated symbols array back to Supabase & local DB cache
                syncBrokerToSupabase(activeBroker, user.id).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.error('[Chat API] Failed to fetch allowed symbols:', err);
      }
    }

    // 1. Detect asset from user message
    const symbol = detectSymbol(lastUserMessage, allowedSymbols);
    const explicitSignal = forceSignal || wantsSignal(lastUserMessage);

    // Enforce Free Tier token and signal limits
    if (isFree) {
      if (dailyTokensUsed >= 2500) {
        return NextResponse.json({
          text: "🔒 **Daily Chat Limit Reached**\n\nYou have reached your daily limit of 2,500 AI response tokens on the Free plan. Please upgrade to the Premium (Pro) plan to unlock unlimited chat analysis!",
          ticket: null,
          limitReached: true,
        });
      }
      if (explicitSignal && dailySignalsUsed >= 3) {
        return NextResponse.json({
          text: "🔒 **Daily Signal Limit Reached**\n\nYou have reached your daily limit of 3 trade signals on the Free plan. Please upgrade to the Premium (Pro) plan to generate unlimited trade signals!",
          ticket: null,
          limitReached: true,
        });
      }
    }

    const astroContext = '';

    // Keywords that trigger the analysis card (even in longer messages)
    const ANALYSIS_KEYWORDS = [
      'forecast', 'prediction', 'predict', 'analysis', 'analyze', 'analyse',
      'outlook', 'trend', 'chart', 'technical', 'price', 'where is',
      'how is', 'what about', 'target', 'support', 'resistance',
    ];
    const hasAnalysisIntent = ANALYSIS_KEYWORDS.some(kw => lastUserMessage.toLowerCase().includes(kw));

    // Show rich card if: short direct query (≤3 words) OR has analysis/forecast intent OR signal request
    const wordCount = lastUserMessage.trim().split(/\s+/).length;
    const isDirectQuery = symbol && (wordCount <= 3 || explicitSignal || forceSignal || hasAnalysisIntent);

    // 2. Check for market screener / scan intent (e.g. "suggest stocks", "top setups")
    const SCAN_INTENT_KEYWORDS = ['suggest', 'recommend', 'scan', 'screener', 'what to trade', 'trade today', 'setups', 'find stocks', 'top stocks', 'what can i trade', 'any setups'];
    const isScanRequest = !symbol && SCAN_INTENT_KEYWORDS.some(kw => lastUserMessage.toLowerCase().includes(kw));

    if (isScanRequest) {
      const scanSymbols = ['XAU/USD', 'EUR/USD', 'GBP/USD', 'BTC/USD', 'QQQ', 'SPY'];
      const snapshotPromises = scanSymbols.map(s => getMarketSnapshot(s));
      const results = await Promise.allSettled(snapshotPromises);
      
      const snapshots: any[] = [];
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'fulfilled' && res.value) {
          snapshots.push(res.value);
        } else {
          const sym = scanSymbols[i];
          snapshots.push({
            symbol: sym,
            displaySymbol: displaySymbol(sym),
            price: 0,
            confluenceScore: 50,
            confluenceDirection: 'NEUTRAL',
            confidenceGrade: 'BBB',
            signalOutcome: 'NO_TRADE'
          });
        }
      }

      snapshots.sort((a, b) => b.confluenceScore - a.confluenceScore);
      const top5 = snapshots.slice(0, 5);

      const text = `### 🔍 Live Multi-Agent Market Scan\nHere are the top 5 setups across major markets. Tap on any card below to analyze:`;

      const screenerData = top5.map(snap => ({
        symbol: snap.symbol,
        displaySymbol: snap.displaySymbol,
        price: snap.price,
        confluenceScore: snap.confluenceScore,
        confluenceDirection: snap.confluenceDirection,
        confidenceGrade: snap.confidenceGrade,
        signalOutcome: snap.signalOutcome
      }));

      return NextResponse.json({
        text,
        ticket: null,
        screenerData
      });
    }

    // 3. No asset detected OR conversational mention → general conversation
    if (!symbol || !isDirectQuery) {
      const chatSystemPrompt = `You are TradeGPT, an elite institutional AI trading terminal built for professional traders. You have deep expertise in forex, commodities, crypto, indices, technical analysis, macro economics, and trading psychology.

RESPONSE RULES:
1. STRICT DOMAIN LOCK RULE: You MUST ONLY answer questions related to financial markets, trading, technical/fundamental analysis, macro economics, risk management, cryptocurrencies, stocks, forex, gold, oil, commodities, or trading psychology. If a question is NOT strictly about these topics (e.g. writing school/work leave applications, essays, recipes, letters, writing code, general non-financial Q&A), you MUST refuse politely: "I am TradeGPT, an AI trading terminal specialized strictly in financial markets, technical analysis, and signal execution. I cannot assist with non-financial or general inquiries."
2. Answer every question thoroughly and professionally with structured markdown.
3. Use ## for section headers, **bold** for key terms, and bullet points (- ) for lists.
4. When comparing data, use markdown tables with | column | headers |.
5. Include specific numbers, ranges, and real financial data whenever possible.
6. End with a brief actionable insight or suggestion to analyze a specific asset.
7. Keep the tone authoritative yet approachable — like a senior analyst briefing a trader.
8. If the question is about a specific asset, include price context, key levels, and what to watch.
9. For educational questions (e.g. "what is RSI"), give a concise masterclass with practical examples.
10. STRICT CODE BLOCKING RULE: You are a pure financial trading terminal and market assistant. You MUST NEVER output coding blocks, programming scripts, HTML, CSS, React, Pine Script, Python, or software code in your responses. If a user asks you to write code, program a script, or build a codebase, you must refuse politely: 'I am your financial trading assistant, specialized in market analysis, technical indicator evaluation, and trade signal executions. I do not write or generate programming code.'

FORMAT: Respond ONLY as JSON (no code fences): {"text":"your full markdown response here"}
Use \\n for newlines inside the JSON string.${astroContext}`;

      let activeSystemPrompt = chatSystemPrompt;
      const responseMaxTokens = isFree ? 250 : 500;
      if (isFree) {
        activeSystemPrompt += `\n\nBREVITY RULE: Keep response extremely short, concise, and direct (maximum 2 short paragraphs under 120 words total). Refuse detailed descriptions or extended guidelines.`;
      } else {
        activeSystemPrompt += `\n\nINSTITUTIONAL ANALYSIS RULE: Provide detailed, highly thorough institutional-grade financial analysis.`;
      }

      // Chat path — LLM Router handles failover (Groq → NVIDIA → fallback)
      const chatResult = await callLLM(userMessages, activeSystemPrompt, responseMaxTokens);
      let parsedText = '';

      if (chatResult) {
        const totalUsed = chatResult.raw?.usage?.total_tokens ?? 
                          (Math.round((chatResult.text.length + activeSystemPrompt.length) / 4) + 50);
        dailyTokensUsed += totalUsed;
        let rawContent = chatResult.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        // Try 1: Standard JSON.parse
        try {
          const parsed = JSON.parse(rawContent);
          parsedText = parsed.text || rawContent;
        } catch {
          // Try 2: Extract "text" field via regex (handles malformed JSON)
          const textMatch = rawContent.match(/"text"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
          if (textMatch) {
            parsedText = textMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          } else {
            // Try 3: Strip JSON wrapper and use as plain text
            parsedText = rawContent
              .replace(/^\s*\{\s*"text"\s*:\s*"/i, '')
              .replace(/"\s*\}\s*$/, '')
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"');
          }
        }

        // Safety: always convert any remaining literal \n to real newlines
        parsedText = parsedText.replace(/\\n/g, '\n');
      } else {
        // All providers failed — use static fallback
        const welcomeGreetings = ['hello', 'hi', 'hey', 'greetings', 'welcome'];
        const isGreeting = welcomeGreetings.some(g => lastUserMessage.toLowerCase().includes(g));
        parsedText = isGreeting
          ? "Hello! I am TradeGPT, your institutional AI trading assistant. How can I help you today? I can analyze charts and dispatch trade signals for assets like Gold (XAUUSD), EURUSD, Bitcoin, and Nasdaq."
          : "I am TradeGPT, designed to run multi-agent analysis on live markets. I can analyze charts and dispatch automated order signals for: Gold, EURUSD, GBPUSD, USDJPY, BTC, ETH, and Nasdaq. Just ask me to analyze an asset!";
      }

      await saveUsage(dailyTokensUsed, dailySignalsUsed);
      return NextResponse.json({ text: parsedText, ticket: null });
    }

    // 3. Asset detected — fetch live market data and news headlines (parallel)
    const symDisplay = displaySymbol(symbol);
    const [snapshot, news] = await Promise.all([
      getMarketSnapshot(symbol),
      fetchNewsHeadlines(5),
    ]);

    const newsBlock = news.length > 0
      ? `\nRECENT MARKET HEADLINES:\n${news.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : '';

    const marketContextBlock = snapshot
      ? `
LIVE MARKET DATA FOR ${symDisplay}:
Current Price: $${snapshot.price.toFixed(2)}
RSI(14): ${snapshot.indicators.rsi?.toFixed(1) ?? 'N/A'}
MACD: ${snapshot.indicators.macd ? `Histogram=${snapshot.indicators.macd.histogram.toFixed(4)}` : 'N/A'}
EMA(50): ${snapshot.indicators.ema50?.toFixed(2) ?? 'N/A'}
ATR(14): ${snapshot.indicators.atr?.toFixed(2) ?? 'N/A'}
Confluence: ${snapshot.confluenceScore}% ${snapshot.confluenceDirection}
Grade: ${snapshot.confidenceGrade}
${newsBlock}
`
      : `[Market data unavailable for ${symDisplay}.]${newsBlock}`;

    // 4. FAST PATH: For non-signal queries, return engine data directly (no LLM needed)
    if (!explicitSignal && snapshot) {
      const smcBlock = snapshot.smcPatterns.length > 0
        ? `\n* **SMC Scanner:** ${snapshot.smcPatterns.join(', ')}`
        : '';

      const outcomeEmoji = snapshot.signalOutcome === 'SIGNAL' ? '🟢' : snapshot.signalOutcome === 'WATCH' ? '🟡' : '🔴';

      let analysisText = `### 🤖 ${symDisplay} Analysis — ${outcomeEmoji} ${snapshot.signalOutcome}\n` +
        `* **Price:** $${snapshot.price.toFixed(2)}\n` +
        `* **Technical:** RSI ${snapshot.indicators.rsi?.toFixed(1) ?? 'N/A'} | MACD ${snapshot.indicators.macd ? (snapshot.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish') : 'N/A'} | EMA50 ${snapshot.indicators.ema50 ? (snapshot.price > snapshot.indicators.ema50 ? 'Above' : 'Below') : 'N/A'}\n` +
        `* **Confluence:** ${snapshot.confluenceScore}% ${snapshot.confluenceDirection} (${snapshot.confidenceGrade})\n` +
        `* **1H Bias:** ${snapshot.htfBias}${smcBlock}`;



      const marketData = {
        symbol, displaySymbol: symDisplay, price: snapshot.price,
        rsi: snapshot.indicators.rsi, macdHistogram: snapshot.indicators.macd?.histogram ?? null,
        ema50: snapshot.indicators.ema50, atr: snapshot.indicators.atr,
        confluenceScore: snapshot.confluenceScore, confluenceDirection: snapshot.confluenceDirection,
        confidenceGrade: snapshot.confidenceGrade, newsSentiment: snapshot.newsSentiment.sentiment,
      };

      await saveUsage(dailyTokensUsed, dailySignalsUsed);
      return NextResponse.json({
        text: analysisText, ticket: null, signalSymbol: symbol, marketData,
        gating: {
          outcome: snapshot.signalOutcome, reason: snapshot.outcomeReason,
          gates: [...snapshot.gateResults, ...(snapshot.riskGates || [])],
          smcPatterns: snapshot.smcPatterns,
          smcConfirmations: snapshot.smcConfirmations,
          riskSummary: snapshot.riskSummary || null,
          riskMultipliers: snapshot.riskMultipliers || null,
        },
      });
    }

    // 5. SIGNAL PATH: LLM Router handles failover (Groq → NVIDIA → engine fallback)
    let parsed: any = {};

    const signalSystemPrompt = `You are the Master Trading Agent. Summarize this market data into a concise report.

Rules: Each bullet MUST be under 8 words. Use only real numbers. No explanation.

${marketContextBlock}${astroContext}

Respond ONLY with JSON (no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [data]\\n* **Macro News**: [sentiment]\\n* **Master Synthesis**: [action target]","newsSentiment":"BULLISH or BEARISH or NEUTRAL"}`;

    const signalMaxTokens = isFree ? 100 : 200;
    const signalResult = await callLLM(userMessages, signalSystemPrompt, signalMaxTokens);
    if (signalResult) {
      parsed = flexibleJsonParse(signalResult.text);
      const totalUsed = signalResult.raw?.usage?.total_tokens ?? 
                        (Math.round((signalResult.text.length + signalSystemPrompt.length) / 4) + 50);
      dailyTokensUsed += totalUsed;
    }

    // 6. Engine-generated fallback report (used when LLM is unavailable or returned no text)
    if (!parsed.text && snapshot) {
      const dir = snapshot.confluenceDirection;
      const rsiLabel = snapshot.indicators.rsi ? `RSI ${snapshot.indicators.rsi.toFixed(1)}` : 'RSI N/A';
      const macdLabel = snapshot.indicators.macd
        ? (snapshot.indicators.macd.histogram > 0 ? 'MACD Bullish' : 'MACD Bearish')
        : 'MACD N/A';
      const emaLabel = snapshot.indicators.ema50
        ? (snapshot.price > snapshot.indicators.ema50 ? 'Above EMA50' : 'Below EMA50')
        : 'EMA50 N/A';
      const sentimentLabel = snapshot.newsSentiment?.sentiment || 'NEUTRAL';

      parsed.text = `### 🤖 Multi-Agent Consensus\n* **Technical Analysis:** ${rsiLabel} · ${macdLabel} · ${emaLabel}\n* **Macro News:** Sentiment ${sentimentLabel}\n* **Master Synthesis:** ${dir} ${symDisplay} @ $${snapshot.price.toFixed(2)} — ${snapshot.confidenceGrade} grade`;
      parsed.newsSentiment = sentimentLabel;
    }



    // 7. Build ticket from engine-calculated risk params (engine ALWAYS decides — not the LLM)
    if (snapshot && explicitSignal) {
      const engineDirection = snapshot.confluenceDirection === 'SELL' ? 'SELL' : 'BUY';
      const riskParams = calculateRiskParams(
        snapshot.price,
        snapshot.indicators.atr,
        engineDirection,
        accountBalance,
        1.5,
        symbol
      );

      const adjustedLot = parseFloat(riskParams.lotVolume);

      parsed.ticket = {
        ticketId: parsed.ticket?.ticketId || Math.floor(10000 + Math.random() * 90000).toString(),
        symbol: symDisplay,
        action: engineDirection,
        entryPrice: snapshot.price.toFixed(2),
        stopLoss: riskParams.stopLoss,
        takeProfit: riskParams.takeProfit,
        lotVolume: adjustedLot.toFixed(2),
        margin: riskParams.margin,
        risk: riskParams.risk,
        profit: riskParams.profit,
        rrRatio: riskParams.rrRatio,
        confidence: snapshot.confidenceGrade,
        executionStatus: 'PENDING',
        apiSymbol: symbol,
      };
      // Mark cooldown
      markSignalFired(symbol);
    }

    // Build marketData — always non-null so the rich card renders.
    // If snapshot failed (rate-limit / network) we return a stub; live price
    // from the SSE stream will fill in the price on the client side.
    const marketData = {
      symbol: symbol,
      displaySymbol: symDisplay,
      price: snapshot?.price ?? 0,
      rsi: snapshot?.indicators.rsi ?? null,
      macdHistogram: snapshot?.indicators.macd?.histogram ?? null,
      ema50: snapshot?.indicators.ema50 ?? null,
      atr: snapshot?.indicators.atr ?? null,
      confluenceScore: snapshot?.confluenceScore ?? 50,
      confluenceDirection: snapshot?.confluenceDirection ?? 'NEUTRAL',
      confidenceGrade: snapshot?.confidenceGrade ?? 'BBB',
      newsSentiment: parsed.newsSentiment || 'NEUTRAL',
    };

    // Gating: only send ticket if engine says SIGNAL
    const gatingOutcome = snapshot?.signalOutcome || 'NO_TRADE';
    const shouldSendTicket = explicitSignal && parsed.ticket && gatingOutcome === 'SIGNAL';



    if (shouldSendTicket) {
      dailySignalsUsed += 1;
    }

    await saveUsage(dailyTokensUsed, dailySignalsUsed);

    return NextResponse.json({
      text: parsed.text || 'Analysis complete.',
      ticket: shouldSendTicket ? parsed.ticket : null,
      signalSymbol: !explicitSignal ? symbol : null,
      marketData: marketData,
      gating: {
        outcome: gatingOutcome,
        reason: snapshot?.outcomeReason || '',
        gates: [...(snapshot?.gateResults || []), ...(snapshot?.riskGates || [])],
        smcPatterns: snapshot?.smcPatterns || [],
        smcConfirmations: snapshot?.smcConfirmations || 0,
        riskSummary: snapshot?.riskSummary || null,
        riskMultipliers: snapshot?.riskMultipliers || null,
      }
    });
  } catch (error: any) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json(
      { text: 'An error occurred processing your request.', ticket: null },
      { status: 500 }
    );
  }
}

function flexibleJsonParse(rawStr: string): any {
  let cleaned = rawStr.trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try standard parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt standard repairs
    try {
      // 1. Wrap unquoted keys (e.g. newsSentiment: -> "newsSentiment":)
      let repaired = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      // 2. Normalize quotes
      repaired = repaired.replace(/'/g, '"');
      return JSON.parse(repaired);
    } catch (e2) {
      console.warn('[Chat API] Repair failed, using regex extraction. Raw:', cleaned);
    }
  }

  // Regex extraction fallback
  const result: any = {};
  
  // Extract text
  const textMatch = cleaned.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (textMatch) {
    result.text = textMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  } else {
    result.text = cleaned;
  }

  // Extract newsSentiment
  const sentimentMatch = cleaned.match(/(?:"newsSentiment"|newsSentiment)\s*:\s*"([^"]+)"/);
  if (sentimentMatch) {
    result.newsSentiment = sentimentMatch[1];
  }

  // Extract ticket
  const ticketMatch = cleaned.match(/"ticket"\s*:\s*(\{[\s\S]*?\})/);
  if (ticketMatch) {
    try {
      let ticketStr = ticketMatch[1].replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      result.ticket = JSON.parse(ticketStr);
    } catch {
      result.ticket = null;
    }
  }

  return result;
}
