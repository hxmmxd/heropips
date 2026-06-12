#!/usr/bin/env node
/**
 * Quality Comparison: 8B vs 70B on financial trading prompts
 * Tests: JSON accuracy, financial reasoning, instruction following
 */

const API_KEY = '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const MODELS = [
  { id: 'meta/llama-3.1-8b-instruct',  label: '8B (proposed)' },
  { id: 'meta/llama-3.3-70b-instruct', label: '70B (current)' },
];

// ── TEST SUITE ──────────────────────────────────────────────
const TESTS = [
  {
    name: 'Signal Generation (core use case)',
    system: `You are the Master Trading Agent. Rules:
- Formulate "text" as a professional markdown report.
- Each bullet MUST be under 8 words. No explanation, just data.
- Keep entire report under 30 words total. Use only real numbers.

LIVE DATA FOR XAUUSD:
Price: $3352.20, RSI(14): 46.6, MACD Histogram: -2.4500
EMA(50): 3376.95, ATR(14): 16.30, Confluence: 54% SELL, Grade: BBB

Account Balance: $10000.00 | Max Risk: 1.5%

Respond ONLY with JSON (no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [data]\\n* **Macro News**: [sentiment]\\n* **Master Synthesis**: [target]","newsSentiment":"BULLISH/BEARISH/NEUTRAL","ticket":{"ticketId":"12345","symbol":"XAUUSD","action":"BUY or SELL","entryPrice":"3352.20","lotVolume":"0.05 Lots","rrRatio":"1:2.5","stopLoss":"3328.00","takeProfit":"3413.00","margin":"335.22","risk":"150.00","profit":"375.00","confidence":"BBB"}}`,
    user: 'Generate trade signal for XAUUSD gold',
    checkFn: (text) => {
      const checks = {};
      // Check if valid JSON
      let cleaned = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        checks.validJson = true;
        checks.hasText = !!parsed.text;
        checks.hasTicket = !!parsed.ticket;
        checks.hasSentiment = !!parsed.newsSentiment;
        checks.hasSymbol = parsed.ticket?.symbol === 'XAUUSD';
        checks.hasAction = ['BUY', 'SELL'].includes(parsed.ticket?.action);
        checks.correctDirection = parsed.ticket?.action === 'SELL'; // confluence says SELL
        checks.textConcise = (parsed.text?.length || 999) < 300;
      } catch {
        try {
          let repaired = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/'/g, '"');
          const parsed = JSON.parse(repaired);
          checks.validJson = true;
          checks.hasText = !!parsed.text;
          checks.hasTicket = !!parsed.ticket;
        } catch {
          checks.validJson = false;
        }
      }
      return checks;
    },
  },
  {
    name: 'Financial Analysis Question',
    system: 'You are TradeGPT, an institutional AI trading terminal. Keep responses concise (2-3 sentences). Respond with JSON: {"text":"your response"}',
    user: 'What does a bearish MACD crossover combined with RSI at 32 suggest for gold?',
    checkFn: (text) => {
      const checks = {};
      let cleaned = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        checks.validJson = true;
        const t = (parsed.text || '').toLowerCase();
        checks.mentionsBearish = t.includes('bearish') || t.includes('sell') || t.includes('downward');
        checks.mentionsOversold = t.includes('oversold') || t.includes('over-sold') || t.includes('bounce') || t.includes('reversal');
        checks.mentionsDivergence = t.includes('divergen') || t.includes('conflict') || t.includes('contradict') || t.includes('mixed');
        checks.isConcise = (parsed.text?.length || 999) < 500;
        checks.qualityNote = parsed.text?.substring(0, 200);
      } catch {
        checks.validJson = false;
        checks.qualityNote = text.substring(0, 200);
      }
      return checks;
    },
  },
  {
    name: 'Risk Management Calculation',
    system: 'You are TradeGPT. Calculate position sizing. Respond with JSON only: {"text":"explanation","lotSize":"X.XX","riskAmount":"$X.XX"}',
    user: 'I have $5000 account. I want to risk 2% on EURUSD with a 30 pip stop loss. What lot size should I use?',
    checkFn: (text) => {
      const checks = {};
      let cleaned = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        checks.validJson = true;
        // Correct answer: 2% of $5000 = $100 risk, 30 pip SL, 1 pip = $10/lot
        // Lot size = $100 / (30 * $10) = 0.33 lots
        const lotStr = parsed.lotSize || parsed.lot_size || parsed.text || '';
        const lotMatch = lotStr.match?.(/0\.3[0-9]/) || parsed.text?.match?.(/0\.3[0-9]/);
        checks.correctLotSize = !!lotMatch;
        checks.correctRisk = (parsed.riskAmount || parsed.text || '').includes('100');
        checks.qualityNote = parsed.text?.substring(0, 200);
      } catch {
        checks.validJson = false;
        const lotMatch = text.match(/0\.3[0-9]/);
        checks.correctLotSize = !!lotMatch;
        checks.qualityNote = text.substring(0, 200);
      }
      return checks;
    },
  },
  {
    name: 'General Greeting (chat path)',
    system: 'You are TradeGPT, an institutional AI trading terminal. Be friendly and professional. Suggest assets to analyze. Respond with JSON: {"text":"your response"}',
    user: 'Hello! What can you help me with?',
    checkFn: (text) => {
      const checks = {};
      let cleaned = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        checks.validJson = true;
        const t = (parsed.text || '').toLowerCase();
        checks.mentionsTrading = t.includes('trad') || t.includes('signal') || t.includes('market');
        checks.mentionsAssets = t.includes('gold') || t.includes('eur') || t.includes('btc') || t.includes('xau');
        checks.professional = !t.includes('sorry') && !t.includes('cannot') && !t.includes("can't");
        checks.isConcise = (parsed.text?.length || 999) < 500;
        checks.qualityNote = parsed.text?.substring(0, 200);
      } catch {
        checks.validJson = false;
        checks.qualityNote = text.substring(0, 200);
      }
      return checks;
    },
  },
];

async function runTest(model, test) {
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          { role: 'system', content: test.system },
          { role: 'user', content: test.user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
      return { time: Date.now() - t0, error: `HTTP ${res.status}`, checks: {} };
    }
    
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const time = Date.now() - t0;
    const checks = test.checkFn(text);
    
    return { time, text: text.substring(0, 300), checks, tokens: data.usage };
  } catch (err) {
    return { time: Date.now() - t0, error: err.message, checks: {} };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   TradeGPT Quality Test: 8B vs 70B on Financial Prompts   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const allResults = {};
  
  for (const test of TESTS) {
    console.log(`\n━━━ TEST: ${test.name} ━━━`);
    console.log(`Prompt: "${test.user}"\n`);
    
    for (const model of MODELS) {
      console.log(`  ${model.label}:`);
      const result = await runTest(model, test);
      
      if (result.error) {
        console.log(`    ❌ ERROR: ${result.error} (${result.time}ms)`);
      } else {
        const checkKeys = Object.keys(result.checks).filter(k => k !== 'qualityNote');
        const passed = checkKeys.filter(k => result.checks[k] === true).length;
        const total = checkKeys.filter(k => typeof result.checks[k] === 'boolean').length;
        
        console.log(`    ⏱  ${result.time}ms | ${result.tokens?.completion_tokens || '?'} tokens`);
        console.log(`    ✅ ${passed}/${total} checks passed`);
        
        for (const [key, val] of Object.entries(result.checks)) {
          if (key === 'qualityNote') continue;
          const icon = val === true ? '✓' : val === false ? '✗' : '?';
          console.log(`       ${icon} ${key}`);
        }
        
        if (result.checks.qualityNote) {
          console.log(`    📝 "${result.checks.qualityNote}"`);
        }
      }
      console.log('');
      
      if (!allResults[test.name]) allResults[test.name] = {};
      allResults[test.name][model.label] = result;
    }
  }
  
  // ── Summary ─────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('SUMMARY: 8B vs 70B Quality Comparison');
  console.log('═'.repeat(70));
  
  let total8B = { passed: 0, total: 0, time: 0, tests: 0 };
  let total70B = { passed: 0, total: 0, time: 0, tests: 0 };
  
  for (const [testName, models] of Object.entries(allResults)) {
    for (const [label, result] of Object.entries(models)) {
      if (result.error) continue;
      const checkKeys = Object.keys(result.checks).filter(k => k !== 'qualityNote');
      const passed = checkKeys.filter(k => result.checks[k] === true).length;
      const total = checkKeys.filter(k => typeof result.checks[k] === 'boolean').length;
      
      if (label.includes('8B')) {
        total8B.passed += passed;
        total8B.total += total;
        total8B.time += result.time;
        total8B.tests++;
      } else {
        total70B.passed += passed;
        total70B.total += total;
        total70B.time += result.time;
        total70B.tests++;
      }
    }
  }
  
  console.log(`\n  Llama 3.1 8B:  ${total8B.passed}/${total8B.total} checks (${(total8B.passed/total8B.total*100).toFixed(0)}%) · Avg ${Math.round(total8B.time/total8B.tests)}ms`);
  console.log(`  Llama 3.3 70B: ${total70B.passed}/${total70B.total} checks (${(total70B.passed/total70B.total*100).toFixed(0)}%) · Avg ${Math.round(total70B.time/total70B.tests)}ms`);
  console.log(`\n  Speed advantage: ${(total70B.time/total70B.tests / (total8B.time/total8B.tests)).toFixed(1)}x faster with 8B`);
  console.log(`  Quality gap: ${((total70B.passed/total70B.total - total8B.passed/total8B.total)*100).toFixed(1)}% difference`);
}

main().catch(console.error);
