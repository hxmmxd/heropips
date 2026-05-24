import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
  fetchNewsHeadlines,
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

    // 3. Asset detected — fetch live market data and news headlines
    const symDisplay = displaySymbol(symbol);
    const snapshot = await getMarketSnapshot(symbol);
    const news = await fetchNewsHeadlines(5);

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

    // 4. Build prompt based on whether user wants signal or just analysis
    const systemPrompt = explicitSignal
      ? `You are the Master Trading Agent coordinating an institutional terminal. You orchestrate seven specialized sub-agents to analyze markets and execute trades:
1. Market Analyzer Agent: Reads current asset prices and trends.
2. Technical Analysis Agent: Deciphers RSI, MACD, EMA50, and ATR metrics.
3. Sentiment Agent: Gauges volume and confluence direction.
4. Risk Management Agent: Configures stop losses, take profits, and optimal position sizing (max 1.5% risk).
5. Macro News Agent: Analyzes live headlines to assess fundamental news sentiment (BULLISH, BEARISH, or NEUTRAL).
6. Execution Agent: Makes the final execution decision (BUY or SELL) based on agent confluences.
7. Explanation Agent: Synthesizes the reasoning of all agents into a highly polished report.

Rules:
- Formulate the "text" field as a professional markdown report summarizing the findings of the agents (Technical Analysis, News Sentiment, and Risk Management).
- Under the "ticket" field, output the execution details compiled by the Execution & Risk Management agents.
- Keep the markdown summary dense, institutional, and punchy. Use only the provided real numbers.

${marketContextBlock}

Account Balance: $${accountBalance.toFixed(2)} | Max Risk: 1.5%

Respond ONLY with this JSON (no markdown wrapping, no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis Agent**: [brief findings]\\n* **Macro News Agent**: [sentiment findings]\\n* **Risk Management Agent**: [sizing and SL/TP justification]\\n* **Master Agent Synthesis**: [decisive synthesis]","newsSentiment":"BULLISH, BEARISH, or NEUTRAL","ticket":{"ticketId":"5 digit number","symbol":"${symDisplay}","action":"BUY or SELL","entryPrice":"price","lotVolume":"lots","rrRatio":"ratio","stopLoss":"sl","takeProfit":"tp","margin":"margin","risk":"risk","profit":"profit","confidence":"${snapshot?.confidenceGrade || 'BBB'}"}}`
      : `You are the Master Trading Agent coordinating an institutional terminal. You orchestrate specialized sub-agents to analyze markets:
1. Market Analyzer Agent: Reads current asset prices and trends.
2. Technical Analysis Agent: Deciphers RSI, MACD, EMA50, and ATR metrics.
3. Sentiment Agent: Gauges volume and confluence direction.
4. Macro News Agent: Analyzes live headlines to assess fundamental news sentiment (BULLISH, BEARISH, or NEUTRAL).
5. Explanation Agent: Synthesizes the reasoning of all agents into a highly polished report.

Rules:
- Formulate the "text" field as a professional markdown report summarizing the findings of the agents (Technical Analysis, News Sentiment, and Master Synthesis).
- Do NOT generate a trade ticket JSON.
- Keep the markdown summary dense, institutional, and punchy. Use only the provided real numbers.

${marketContextBlock}

Respond ONLY with this JSON (no markdown wrapping, no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis Agent**: [brief findings]\\n* **Macro News Agent**: [sentiment findings]\\n* **Master Agent Synthesis**: [decisive synthesis]","newsSentiment":"BULLISH, BEARISH, or NEUTRAL"}`;

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
    const parsed = flexibleJsonParse(rawContent);

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
      newsSentiment: parsed.newsSentiment || 'NEUTRAL',
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
