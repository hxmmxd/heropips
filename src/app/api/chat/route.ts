import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
} from '@/lib/market';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessages = body.messages || [];
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const accountBalance = body.accountBalance ? parseFloat(body.accountBalance.replace(/,/g, '')) : 10000;

    // 1. Detect asset from user message (returns null if no asset mentioned)
    const symbol = detectSymbol(lastUserMessage);

    // 2. If no specific asset detected, respond as a general trading assistant
    if (!symbol) {
      const apiKey = process.env.NVIDIA_API_KEY;
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          temperature: 0.3,
          max_tokens: 512,
          messages: [
            {
              role: 'system',
              content: `You are TradeGPT, an institutional-grade trading terminal AI assistant. You help traders with market analysis, trading strategies, and financial questions. Be concise and professional. If the user wants to analyze a specific asset, tell them to mention the asset name (e.g. gold, EURUSD, bitcoin, nasdaq). Respond in JSON: {"text":"your response","ticket":null}`
            },
            ...userMessages,
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[Chat API] NVIDIA error:', JSON.stringify(data));
        return NextResponse.json({ text: 'Signal engine temporarily unavailable.', ticket: null }, { status: 502 });
      }

      let rawContent = data.choices?.[0]?.message?.content || '{}';
      rawContent = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      try {
        const parsed = JSON.parse(rawContent);
        return NextResponse.json({ text: parsed.text || rawContent, ticket: null });
      } catch {
        return NextResponse.json({ text: rawContent, ticket: null });
      }
    }

    // 3. Asset detected — fetch live market data
    const symDisplay = displaySymbol(symbol);
    const snapshot = await getMarketSnapshot(symbol);

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
`
      : `[Market data unavailable for ${symDisplay}.]`;

    const systemPrompt = `You are TradeGPT, an institutional quantitative trading terminal with live market data.

Rules:
1. Analyze the market data below and give a 2-3 sentence technical analysis.
2. ALWAYS generate a trade ticket JSON with BUY or SELL based on the confluence direction.
3. Use ONLY the real data provided. Never invent numbers.
4. Be direct and decisive.

${marketContextBlock}

Account Balance: $${accountBalance.toFixed(2)} | Max Risk: 1.5%

Respond ONLY with this JSON (no markdown, no code fences):
{"text":"your analysis","ticket":{"ticketId":"5 digit number","symbol":"${symDisplay}","action":"BUY or SELL","entryPrice":"price","lotVolume":"lots","rrRatio":"ratio","stopLoss":"sl","takeProfit":"tp","margin":"margin","risk":"risk","profit":"profit","confidence":"${snapshot?.confidenceGrade || 'BBB'}"}}`;

    // 4. Call NVIDIA NIM API
    const apiKey = process.env.NVIDIA_API_KEY;
    const llmResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        temperature: 0.2,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...userMessages,
        ],
      }),
    });

    const llmData = await llmResponse.json();

    if (!llmResponse.ok) {
      console.error('[Chat API] NVIDIA error:', JSON.stringify(llmData));
      return NextResponse.json(
        { text: 'Signal engine temporarily unavailable. Please try again.', ticket: null },
        { status: 502 }
      );
    }

    // 5. Parse structured JSON from LLM
    let rawContent = llmData.choices?.[0]?.message?.content || '{}';
    rawContent = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: { text?: string; ticket?: any } = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { text: rawContent, ticket: null };
    }

    // 6. Override ticket with engine-calculated risk params for accuracy
    if (parsed.ticket && snapshot) {
      const riskParams = calculateRiskParams(
        snapshot.price,
        snapshot.indicators.atr,
        snapshot.confluenceDirection === 'SELL' ? 'SELL' : 'BUY',
        accountBalance,
        1.5,
        symbol
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
