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

export const dynamic = 'force-dynamic';

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
    const body = await request.json();
    const userMessages = body.messages || [];
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const accountBalance = body.accountBalance ? parseFloat(body.accountBalance.replace(/,/g, '')) : 10000;
    const forceSignal = body.forceSignal === true; // From "Generate Signal" button

    // 1. Detect asset from user message
    const symbol = detectSymbol(lastUserMessage);
    const explicitSignal = forceSignal || wantsSignal(lastUserMessage);

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

    // 2. No asset detected OR conversational mention → general conversation
    if (!symbol || !isDirectQuery) {
      const chatSystemPrompt = `You are TradeGPT, an institutional AI trading terminal. Be friendly, concise (2 sentences max). Suggest analyzing Gold, EURUSD, Bitcoin, or Nasdaq. Respond ONLY as JSON: {"text":"your response"}`;

      // Chat path — LLM Router handles failover (Groq → NVIDIA → fallback)
      const chatResult = await callLLM(userMessages, chatSystemPrompt, 150);
      let parsedText = '';

      if (chatResult) {
        let rawContent = chatResult.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        try {
          const parsed = JSON.parse(rawContent);
          parsedText = parsed.text || rawContent;
        } catch {
          parsedText = rawContent;
        }
      } else {
        // All providers failed — use static fallback
        const welcomeGreetings = ['hello', 'hi', 'hey', 'greetings', 'welcome'];
        const isGreeting = welcomeGreetings.some(g => lastUserMessage.toLowerCase().includes(g));
        parsedText = isGreeting
          ? "Hello! I am TradeGPT, your institutional AI trading assistant. How can I help you today? I can analyze charts and dispatch trade signals for assets like Gold (XAUUSD), EURUSD, Bitcoin, and Nasdaq."
          : "I am TradeGPT, designed to run multi-agent analysis on live markets. I can analyze charts and dispatch automated order signals for: Gold, EURUSD, GBPUSD, USDJPY, BTC, ETH, and Nasdaq. Just ask me to analyze an asset!";
      }

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

      const analysisText = `### 🤖 ${symDisplay} Analysis — ${outcomeEmoji} ${snapshot.signalOutcome}\n` +
        `* **Price:** $${snapshot.price.toFixed(2)}\n` +
        `* **Technical:** RSI ${snapshot.indicators.rsi?.toFixed(1) ?? 'N/A'} | MACD ${snapshot.indicators.macd ? (snapshot.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish') : 'N/A'} | EMA50 ${snapshot.indicators.ema50 ? (snapshot.price > snapshot.indicators.ema50 ? 'Above' : 'Below') : 'N/A'}\n` +
        `* **Confluence:** ${snapshot.confluenceScore}% ${snapshot.confluenceDirection} (${snapshot.confidenceGrade})\n` +
        `* **4H Bias:** ${snapshot.htfBias}${smcBlock}`;

      const marketData = {
        symbol, displaySymbol: symDisplay, price: snapshot.price,
        rsi: snapshot.indicators.rsi, macdHistogram: snapshot.indicators.macd?.histogram ?? null,
        ema50: snapshot.indicators.ema50, atr: snapshot.indicators.atr,
        confluenceScore: snapshot.confluenceScore, confluenceDirection: snapshot.confluenceDirection,
        confidenceGrade: snapshot.confidenceGrade, newsSentiment: snapshot.newsSentiment.sentiment,
      };

      return NextResponse.json({
        text: analysisText, ticket: null, signalSymbol: symbol, marketData,
        gating: {
          outcome: snapshot.signalOutcome, reason: snapshot.outcomeReason,
          gates: snapshot.gateResults, smcPatterns: snapshot.smcPatterns,
          smcConfirmations: snapshot.smcConfirmations,
        },
      });
    }

    // 5. SIGNAL PATH: LLM Router handles failover (Groq → NVIDIA → engine fallback)
    let parsed: any = {};

    const signalSystemPrompt = `You are the Master Trading Agent. Summarize this market data into a concise report.

Rules: Each bullet MUST be under 8 words. Use only real numbers. No explanation.

${marketContextBlock}

Respond ONLY with JSON (no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [data]\\n* **Macro News**: [sentiment]\\n* **Master Synthesis**: [action target]","newsSentiment":"BULLISH or BEARISH or NEUTRAL"}`;

    const signalResult = await callLLM(userMessages, signalSystemPrompt, 150);
    if (signalResult) {
      parsed = flexibleJsonParse(signalResult.text);
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
      parsed.ticket = {
        ticketId: parsed.ticket?.ticketId || Math.floor(10000 + Math.random() * 90000).toString(),
        symbol: symDisplay,
        action: engineDirection,
        entryPrice: snapshot.price.toFixed(2),
        stopLoss: riskParams.stopLoss,
        takeProfit: riskParams.takeProfit,
        lotVolume: riskParams.lotVolume,
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

    return NextResponse.json({
      text: parsed.text || 'Analysis complete.',
      ticket: shouldSendTicket ? parsed.ticket : null,
      signalSymbol: !explicitSignal ? symbol : null,
      marketData: marketData,
      // Phase A: Gating data for frontend
      gating: {
        outcome: gatingOutcome,
        reason: snapshot?.outcomeReason || '',
        gates: snapshot?.gateResults || [],
        smcPatterns: snapshot?.smcPatterns || [],
        smcConfirmations: snapshot?.smcConfirmations || 0,
      },
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
