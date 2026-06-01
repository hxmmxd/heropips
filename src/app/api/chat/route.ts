import { NextResponse } from 'next/server';
import {
  getMarketSnapshot,
  detectSymbol,
  displaySymbol,
  calculateRiskParams,
  fetchNewsHeadlines,
} from '@/lib/market';

import { getPlatformConfig } from '@/lib/platformConfig';

// ── NVIDIA API Key Round-Robin Rotation ─────────────────────
// Keys are read from Supabase platform_config first, then env vars
let keyIndex = 0;

async function getNvidiaKeys(): Promise<string[]> {
  // Try Supabase first
  const dbKeys = await getPlatformConfig('nvidia_api_keys', '');
  if (dbKeys) return dbKeys.split(',').map((k: string) => k.trim()).filter(Boolean);
  // Fall back to env vars
  const multi = process.env.NVIDIA_API_KEYS;
  if (multi) return multi.split(',').map(k => k.trim()).filter(Boolean);
  const single = process.env.NVIDIA_API_KEY;
  if (single) return [single];
  return [];
}

async function getNextApiKey(): Promise<string | null> {
  const keys = await getNvidiaKeys();
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
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
      const apiKey = await getNextApiKey();
      let parsedText = '';

      if (!apiKey) {
        console.warn('[Chat API] NVIDIA_API_KEY is empty. Generating simulated general response.');
        const welcomeGreetings = ['hello', 'hi', 'hey', 'greetings', 'welcome'];
        const isGreeting = welcomeGreetings.some(g => lastUserMessage.toLowerCase().includes(g));

        if (isGreeting) {
          parsedText = "Hello! I am TradeGPT, your institutional AI trading assistant. How can I help you today? I can analyze charts and dispatch trade signals for assets like Gold (XAUUSD), EURUSD, Bitcoin, and Nasdaq.";
        } else {
          parsedText = "I am TradeGPT, designed to run multi-agent analysis on live markets. I can analyze charts and dispatch automated order signals for: Gold, EURUSD, GBPUSD, USDJPY, BTC, ETH, and Nasdaq. Just ask me to analyze an asset!";
        }
      } else {
        try {
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
            throw new Error(JSON.stringify(data));
          }

          let rawContent = data.choices?.[0]?.message?.content || '{}';
          rawContent = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          try {
            const parsed = JSON.parse(rawContent);
            parsedText = parsed.text || rawContent;
          } catch {
            parsedText = rawContent;
          }
        } catch (llmErr) {
          console.warn('[Chat API] NVIDIA Chat completions failed, falling back to simulation:', llmErr);
          parsedText = "Hello! I am TradeGPT, your institutional AI trading assistant. How can I help you today? I can analyze charts and dispatch trade signals for assets like Gold (XAUUSD), EURUSD, Bitcoin, and Nasdaq.";
        }
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

    // 4. Build prompt based on whether user wants signal or just analysis
    const systemPrompt = explicitSignal
      ? `You are the Master Trading Agent. Orchestrate specialized sub-agents to analyze markets and execute trades:
1. Technical Analysis Agent: RSI, MACD, EMA50, ATR.
2. Macro News Agent: Live headline sentiment.
3. Master Synthesis Agent: Decisive final trading plan.

Rules:
- Formulate the "text" field as a professional markdown report summarizing findings.
- Enforce extreme conciseness: Each agent's bullet point MUST be under 8 words. No explanation, just data.
- Keep the entire report under 30 words total. Use only real numbers from the context.

${marketContextBlock}

Account Balance: $${accountBalance.toFixed(2)} | Max Risk: 1.5%

Respond ONLY with this JSON (no markdown wrapping, no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [under 8 words findings]\\n* **Macro News**: [under 8 words sentiment]\\n* **Master Synthesis**: [under 8 words execution target]","newsSentiment":"BULLISH, BEARISH, or NEUTRAL","ticket":{"ticketId":"5 digit number","symbol":"${symDisplay}","action":"BUY or SELL","entryPrice":"price","lotVolume":"lots","rrRatio":"ratio","stopLoss":"sl","takeProfit":"tp","margin":"margin","risk":"risk","profit":"profit","confidence":"${snapshot?.confidenceGrade || 'BBB'}"}}`
      : `You are the Master Trading Agent. Orchestrate specialized sub-agents to analyze markets:
1. Technical Analysis Agent: RSI, MACD, EMA50, ATR.
2. Macro News Agent: Live headline sentiment.
3. Master Synthesis Agent: Decisive final summary.

Rules:
- Formulate the "text" field as a professional markdown report summarizing findings.
- Enforce extreme conciseness: Each agent's bullet point MUST be under 8 words. No explanation, just data.
- Keep the entire report under 25 words total. Use only real numbers from the context.
- Do NOT generate a trade ticket JSON.

${marketContextBlock}

Respond ONLY with this JSON (no markdown wrapping, no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [under 8 words findings]\\n* **Macro News**: [under 8 words sentiment]\\n* **Master Synthesis**: [under 8 words final summary]","newsSentiment":"BULLISH, BEARISH, or NEUTRAL"}`;

    // 5. Call NVIDIA NIM API
    const apiKey = await getNextApiKey();
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
      const errDetail = llmData?.detail || llmData?.error?.message || llmData?.message || JSON.stringify(llmData);
      console.error(`[Chat API] NVIDIA error (status ${llmResponse.status}):`, errDetail);
      return NextResponse.json(
        { text: `Signal engine error: ${errDetail}`, ticket: null },
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
        action: parsed.ticket.action || (snapshot.confluenceDirection === 'SELL' ? 'SELL' : 'BUY'),
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
        apiSymbol: symbol, // raw API symbol for execution (e.g. "XAU/USD")
      };
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

    return NextResponse.json({
      text: parsed.text || 'Analysis complete.',
      ticket: (explicitSignal && parsed.ticket) ? parsed.ticket : null,
      signalSymbol: !explicitSignal ? symbol : null,
      marketData: marketData,
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
