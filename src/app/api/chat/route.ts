import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
} from '@/lib/market';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessages = body.messages || [];
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const accountBalance = body.accountBalance ? parseFloat(body.accountBalance.replace(/,/g, '')) : 10000;

    // 1. Detect asset from user message
    const symbol = detectSymbol(lastUserMessage);
    const symDisplay = displaySymbol(symbol);

    // 2. Fetch live market snapshot with all indicators
    const snapshot = await getMarketSnapshot(symbol);

    // 3. Build the institutional system prompt with live data
    const marketContextBlock = snapshot
      ? `
LIVE MARKET DATA FOR ${symDisplay}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Price: $${snapshot.price.toFixed(2)}

TECHNICAL INDICATORS (1-Hour Timeframe):
• RSI(14): ${snapshot.indicators.rsi?.toFixed(1) ?? 'N/A'}
• MACD: ${snapshot.indicators.macd ? `Line=${snapshot.indicators.macd.macd.toFixed(4)}, Signal=${snapshot.indicators.macd.signal.toFixed(4)}, Histogram=${snapshot.indicators.macd.histogram.toFixed(4)}` : 'N/A'}
• EMA(20): ${snapshot.indicators.ema20?.toFixed(2) ?? 'N/A'}
• EMA(50): ${snapshot.indicators.ema50?.toFixed(2) ?? 'N/A'}
• EMA(200): ${snapshot.indicators.ema200?.toFixed(2) ?? 'N/A'}
• Bollinger Bands: ${snapshot.indicators.bbands ? `Upper=${snapshot.indicators.bbands.upper.toFixed(2)}, Middle=${snapshot.indicators.bbands.middle.toFixed(2)}, Lower=${snapshot.indicators.bbands.lower.toFixed(2)}` : 'N/A'}
• ATR(14): ${snapshot.indicators.atr?.toFixed(2) ?? 'N/A'}
• Stochastic(14,3): ${snapshot.indicators.stoch ? `%K=${snapshot.indicators.stoch.k.toFixed(1)}, %D=${snapshot.indicators.stoch.d.toFixed(1)}` : 'N/A'}

MULTI-TIMEFRAME ANALYSIS:
• 4H Bias: ${snapshot.htfBias.toUpperCase()}

CONFLUENCE ENGINE OUTPUT:
• Confluence Score: ${snapshot.confluenceScore}%
• Direction: ${snapshot.confluenceDirection}
• Confidence Grade: ${snapshot.confidenceGrade}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : `\n[Market data temporarily unavailable for ${symDisplay}. Provide general analysis based on the user query.]\n`;

    const systemPrompt = `You are TradeGPT — an institutional-grade quantitative trading terminal powered by real-time multi-indicator confluence analysis.

Your role:
1. Analyze the live market data provided below.
2. Deliver a concise, professional technical analysis (2-4 sentences maximum).
3. You MUST ALWAYS generate a trade ticket with a BUY or SELL recommendation based on the data. Use the confluence direction provided. The confidence grade reflects the signal strength.
4. Never fabricate prices or indicator values — use ONLY the data provided.
5. Be direct and decisive like an institutional trading desk. No hedging language.

${marketContextBlock}

ACCOUNT CONTEXT:
• Account Balance: $${accountBalance.toFixed(2)}
• Max Risk Per Trade: 1.5% ($${(accountBalance * 0.015).toFixed(2)})

You MUST respond in this EXACT JSON format and nothing else:
{
  "text": "Your technical analysis here. Be concise and institutional.",
  "ticket": {
    "ticketId": "5-digit random number as string",
    "symbol": "${symDisplay}",
    "action": "BUY" or "SELL",
    "entryPrice": "current price as string",
    "lotVolume": "calculated lot size e.g. 0.25 Lots",
    "rrRatio": "risk:reward ratio e.g. 1 : 2.5",
    "stopLoss": "calculated stop loss level",
    "takeProfit": "calculated take profit level",
    "margin": "required margin estimate",
    "risk": "dollar risk amount",
    "profit": "dollar profit target",
    "confidence": "${snapshot?.confidenceGrade || 'BBB'}"
  }
}`;

    // 4. Call LLM via OpenRouter
    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...userMessages,
        ],
      }),
    });

    const llmData = await llmResponse.json();

    if (!llmResponse.ok) {
      console.error('[Chat API] LLM error:', llmData);
      return NextResponse.json(
        { text: 'Signal engine temporarily unavailable. Please try again.', ticket: null },
        { status: 502 }
      );
    }

    // 5. Parse structured JSON from LLM
    const rawContent = llmData.choices?.[0]?.message?.content || '{}';
    let parsed: { text?: string; ticket?: any } = {};

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // If LLM didn't return valid JSON, treat entire response as text
      parsed = { text: rawContent, ticket: null };
    }

    // 6. If LLM generated a ticket but we have real snapshot data,
    //    override with our engine's calculated risk params for accuracy
    if (parsed.ticket && snapshot) {
      const riskParams = calculateRiskParams(
        snapshot.price,
        snapshot.indicators.atr,
        snapshot.confluenceDirection === 'SELL' ? 'SELL' : 'BUY',
        accountBalance
      );
      parsed.ticket = {
        ...parsed.ticket,
        ticketId: parsed.ticket.ticketId || Math.floor(10000 + Math.random() * 90000).toString(),
        symbol: symDisplay,
        entryPrice: snapshot.price.toFixed(2),
        stopLoss: riskParams.stopLoss,
        takeProfit: riskParams.takeProfit,
        lotVolume: riskParams.lotVolume,
        margin: riskParams.margin,
        risk: riskParams.risk,
        profit: riskParams.profit,
        rrRatio: riskParams.rrRatio,
        confidence: snapshot.confidenceGrade,
      };
    }

    return NextResponse.json({
      text: parsed.text || 'Analysis complete.',
      ticket: parsed.ticket || null,
    });
  } catch (error: any) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json(
      { text: 'An error occurred processing your request.', ticket: null },
      { status: 500 }
    );
  }
}
