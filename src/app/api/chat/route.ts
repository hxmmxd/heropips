import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
} from '@/lib/market';

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

    // Check if this is a direct asset query (short, 1-3 word message like "Gold", "EURUSD", "bitcoin")
    const wordCount = lastUserMessage.trim().split(/\s+/).length;
    const isDirectQuery = symbol && (wordCount <= 3 || explicitSignal || forceSignal);

    // 2. No asset detected OR conversational mention → general conversation
    if (!symbol || !isDirectQuery) {
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
              content: `You are TradeGPT, an institutional-grade AI trading terminal. You are friendly, professional, and helpful.

When users greet you or ask general questions:
- Welcome them warmly and ask what asset they'd like to analyze
- Suggest trending markets (e.g. Gold, EURUSD, Bitcoin, Nasdaq)
- Explain you can generate real-time trade signals with live market data
- Keep responses concise (2-3 sentences max)

Supported assets: Gold/XAUUSD, EURUSD, GBPUSD, USDJPY, Bitcoin/BTC, Ethereum/ETH, Nasdaq/NAS100, Dow/US30, Oil

You MUST respond in this JSON format only: {"text":"your response"}`
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

    // 4. Build prompt based on whether user wants signal or just analysis
    const systemPrompt = explicitSignal
      ? `You are TradeGPT, an institutional quantitative trading terminal with live market data.

Rules:
1. Analyze the market data below and give a 2-3 sentence technical analysis.
2. ALWAYS generate a trade ticket JSON with BUY or SELL based on the confluence direction.
3. Use ONLY the real data provided. Never invent numbers.
4. Be direct and decisive.

${marketContextBlock}

Account Balance: $${accountBalance.toFixed(2)} | Max Risk: 1.5%

Respond ONLY with this JSON (no markdown, no code fences):
{"text":"your analysis","ticket":{"ticketId":"5 digit number","symbol":"${symDisplay}","action":"BUY or SELL","entryPrice":"price","lotVolume":"lots","rrRatio":"ratio","stopLoss":"sl","takeProfit":"tp","margin":"margin","risk":"risk","profit":"profit","confidence":"${snapshot?.confidenceGrade || 'BBB'}"}}`
      : `You are TradeGPT, an institutional quantitative trading terminal with live market data.

Rules:
1. Analyze the market data below and give a clear, concise technical analysis (3-4 sentences).
2. Mention key indicator levels and what they suggest.
3. State the current market bias (bullish/bearish/neutral).
4. Do NOT generate a trade ticket — the user hasn't requested one yet.
5. Use ONLY the real data provided.

${marketContextBlock}

Respond ONLY with this JSON (no markdown, no code fences):
{"text":"your analysis"}`;

    // 5. Call NVIDIA NIM API
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

    // 6. Parse structured JSON from LLM
    let rawContent = llmData.choices?.[0]?.message?.content || '{}';
    rawContent = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: { text?: string; ticket?: any } = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { text: rawContent, ticket: null };
    }

    // 7. Override ticket with engine-calculated risk params
    if (parsed.ticket && snapshot && explicitSignal) {
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

    // Build marketData for rich card rendering
    const marketData = snapshot ? {
      symbol: symbol,
      displaySymbol: symDisplay,
      price: snapshot.price,
      rsi: snapshot.indicators.rsi,
      macdHistogram: snapshot.indicators.macd?.histogram ?? null,
      ema50: snapshot.indicators.ema50,
      atr: snapshot.indicators.atr,
      confluenceScore: snapshot.confluenceScore,
      confluenceDirection: snapshot.confluenceDirection,
      confidenceGrade: snapshot.confidenceGrade,
    } : null;

    return NextResponse.json({
      text: parsed.text || 'Analysis complete.',
      ticket: (explicitSignal && parsed.ticket) ? parsed.ticket : null,
      signalSymbol: !explicitSignal ? symbol : null,
      marketData: !explicitSignal ? marketData : null,
    });
  } catch (error: any) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json(
      { text: 'An error occurred processing your request.', ticket: null },
      { status: 500 }
    );
  }
}
