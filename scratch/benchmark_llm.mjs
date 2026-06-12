#!/usr/bin/env node
/**
 * TradeGPT LLM Benchmark — NVIDIA NIM Models
 * Tests multiple models with the actual signal generation prompt
 * Measures: connect time, TTFB, total time, tokens/sec, JSON validity
 */

const API_KEY = process.env.NVIDIA_API_KEY || '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';
const BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// ── Models to benchmark ─────────────────────────────────────
// Selected for: chat/instruct capability, range of sizes, likely speed
const MODELS = [
  // CURRENT MODEL
  { id: 'meta/llama-3.3-70b-instruct',                  label: 'Llama 3.3 70B (current)',    size: '70B' },
  
  // SMALL & FAST (< 15B params)
  { id: 'meta/llama-3.2-3b-instruct',                   label: 'Llama 3.2 3B',               size: '3B' },
  { id: 'meta/llama-3.1-8b-instruct',                   label: 'Llama 3.1 8B',               size: '8B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b',               label: 'Nemotron Nano 30B (MoE 3B)', size: '3B active' },
  { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',         label: 'Nemotron Nano 8B',            size: '8B' },
  { id: 'google/gemma-3n-e4b-it',                       label: 'Gemma 3n E4B',                size: '4B' },
  { id: 'microsoft/phi-4-mini-instruct',                 label: 'Phi-4 Mini',                  size: '~3.8B' },
  { id: 'nv-mistralai/mistral-nemo-12b-instruct',       label: 'Mistral Nemo 12B',            size: '12B' },
  
  // MEDIUM (15-50B params)
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',     label: 'Nemotron Super 49B v1.5',     size: '49B' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct',      label: 'Llama 4 Maverick 17B',        size: '17B' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct',             label: 'Qwen3 Next 80B (MoE 3B)',    size: '3B active' },
  
  // LARGE / FLAGSHIP
  { id: 'deepseek-ai/deepseek-v4-flash',                label: 'DeepSeek V4 Flash',           size: 'large' },
  { id: 'mistralai/mistral-medium-3.5-128b',            label: 'Mistral Medium 3.5 128B',     size: '128B' },
];

// ── Test Prompt (exact TradeGPT signal prompt) ──────────────
const SYSTEM_PROMPT = `You are the Master Trading Agent. Orchestrate specialized sub-agents to analyze markets and execute trades:
1. Technical Analysis Agent: RSI, MACD, EMA50, ATR.
2. Macro News Agent: Live headline sentiment.
3. Master Synthesis Agent: Decisive final trading plan.

Rules:
- Formulate the "text" field as a professional markdown report summarizing findings.
- Enforce extreme conciseness: Each agent's bullet point MUST be under 8 words. No explanation, just data.
- Keep the entire report under 30 words total. Use only real numbers from the context.

LIVE MARKET DATA FOR XAUUSD:
Current Price: $3352.20
RSI(14): 46.6
MACD: Histogram=-2.4500
EMA(50): 3376.95
ATR(14): 16.30
Confluence: 54% SELL
Grade: BBB

Account Balance: $10000.00 | Max Risk: 1.5%

Respond ONLY with this JSON (no markdown wrapping, no code fences):
{"text":"### 🤖 Multi-Agent Consensus\\n* **Technical Analysis**: [under 8 words findings]\\n* **Macro News**: [under 8 words sentiment]\\n* **Master Synthesis**: [under 8 words execution target]","newsSentiment":"BULLISH, BEARISH, or NEUTRAL","ticket":{"ticketId":"5 digit number","symbol":"XAUUSD","action":"BUY or SELL","entryPrice":"price","lotVolume":"lots","rrRatio":"ratio","stopLoss":"sl","takeProfit":"tp","margin":"margin","risk":"risk","profit":"profit","confidence":"BBB"}}`;

const USER_MESSAGE = 'Generate trade signal for XAUUSD gold';

const RUNS_PER_MODEL = 2;

// ── Benchmark Runner ────────────────────────────────────────

async function benchmarkModel(model) {
  const results = [];
  
  for (let run = 0; run < RUNS_PER_MODEL; run++) {
    const t0 = Date.now();
    let ttfb = null;
    let totalTime = null;
    let outputTokens = 0;
    let jsonValid = false;
    let error = null;
    let responseText = '';
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000); // 45s max
      
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: USER_MESSAGE },
          ],
        }),
        signal: controller.signal,
      });
      
      ttfb = Date.now() - t0;
      clearTimeout(timeout);
      
      if (!res.ok) {
        const errBody = await res.text();
        error = `HTTP ${res.status}: ${errBody.substring(0, 200)}`;
      } else {
        const data = await res.json();
        totalTime = Date.now() - t0;
        
        responseText = data.choices?.[0]?.message?.content || '';
        outputTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;
        const promptTokens = data.usage?.prompt_tokens || 0;
        
        // Check if response is valid JSON
        let cleaned = responseText.trim()
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        
        try {
          const parsed = JSON.parse(cleaned);
          jsonValid = !!(parsed.text && parsed.ticket);
        } catch {
          // Try with repairs
          try {
            let repaired = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            repaired = repaired.replace(/'/g, '"');
            const parsed = JSON.parse(repaired);
            jsonValid = !!(parsed.text && parsed.ticket);
          } catch {
            jsonValid = false;
          }
        }
        
        results.push({
          run: run + 1,
          ttfb,
          totalTime,
          outputTokens,
          promptTokens,
          totalTokens,
          tokensPerSec: totalTime > 0 ? (outputTokens / (totalTime / 1000)).toFixed(1) : '0',
          jsonValid,
          error: null,
          responsePreview: responseText.substring(0, 120),
        });
        continue;
      }
    } catch (err) {
      totalTime = Date.now() - t0;
      error = err.cause?.code || err.message || 'Unknown error';
    }
    
    results.push({
      run: run + 1,
      ttfb,
      totalTime,
      outputTokens: 0,
      promptTokens: 0,
      totalTokens: 0,
      tokensPerSec: '0',
      jsonValid: false,
      error,
      responsePreview: '',
    });
  }
  
  return results;
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     TradeGPT LLM Benchmark — NVIDIA NIM Models            ║');
  console.log('║     Testing with actual signal generation prompt           ║');
  console.log(`║     ${RUNS_PER_MODEL} runs per model · ${MODELS.length} models · ${new Date().toISOString()}  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const allResults = [];
  
  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const progress = `[${i + 1}/${MODELS.length}]`;
    console.log(`${progress} Testing: ${model.label} (${model.id})...`);
    
    const results = await benchmarkModel(model);
    
    const successes = results.filter(r => !r.error);
    const avgTime = successes.length > 0 
      ? Math.round(successes.reduce((s, r) => s + r.totalTime, 0) / successes.length)
      : null;
    const avgTTFB = successes.length > 0
      ? Math.round(successes.reduce((s, r) => s + r.ttfb, 0) / successes.length)
      : null;
    const avgTPS = successes.length > 0
      ? (successes.reduce((s, r) => s + parseFloat(r.tokensPerSec), 0) / successes.length).toFixed(1)
      : '0';
    const jsonRate = successes.length > 0
      ? Math.round(successes.filter(r => r.jsonValid).length / successes.length * 100)
      : 0;
    
    const summary = {
      model: model.id,
      label: model.label,
      size: model.size,
      runs: results.length,
      successes: successes.length,
      failures: results.filter(r => r.error).length,
      avgTotalMs: avgTime,
      avgTTFBMs: avgTTFB,
      avgTokensPerSec: avgTPS,
      avgOutputTokens: successes.length > 0
        ? Math.round(successes.reduce((s, r) => s + r.outputTokens, 0) / successes.length)
        : 0,
      jsonParseRate: jsonRate + '%',
      errors: results.filter(r => r.error).map(r => r.error),
      details: results,
    };
    
    allResults.push(summary);
    
    // Print per-model result immediately
    if (successes.length > 0) {
      console.log(`   ✅ Avg: ${avgTime}ms total · ${avgTTFB}ms TTFB · ${avgTPS} tok/s · JSON: ${jsonRate}%`);
    } else {
      console.log(`   ❌ FAILED: ${results[0].error}`);
    }
    console.log('');
  }
  
  // ── Final Report ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL RESULTS — Ranked by Average Total Time (fastest first)');
  console.log('═'.repeat(80));
  
  const ranked = allResults
    .filter(r => r.successes > 0)
    .sort((a, b) => a.avgTotalMs - b.avgTotalMs);
  
  console.log('\n' + [
    'Rank', 'Model', 'Size', 'Avg Time', 'TTFB', 'Tok/s', 'Tokens', 'JSON%', 'Status'
  ].join(' | '));
  console.log('-'.repeat(120));
  
  ranked.forEach((r, i) => {
    console.log([
      `#${i + 1}`.padEnd(4),
      r.label.padEnd(30),
      r.size.padEnd(10),
      `${r.avgTotalMs}ms`.padEnd(9),
      `${r.avgTTFBMs}ms`.padEnd(8),
      `${r.avgTokensPerSec}`.padEnd(8),
      `${r.avgOutputTokens}`.padEnd(7),
      r.jsonParseRate.padEnd(6),
      r.failures === 0 ? '✅' : `⚠️ ${r.failures} fail`,
    ].join(' | '));
  });
  
  const failed = allResults.filter(r => r.successes === 0);
  if (failed.length > 0) {
    console.log('\nFailed Models:');
    failed.forEach(r => {
      console.log(`  ❌ ${r.label}: ${r.errors[0]}`);
    });
  }
  
  // Write JSON results
  const outputPath = new URL('./benchmark_results.json', import.meta.url).pathname;
  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, JSON.stringify({ timestamp: new Date().toISOString(), ranked, failed, allResults }, null, 2));
  console.log(`\n📄 Full results saved to: ${outputPath}`);
  
  // Recommendation
  if (ranked.length > 0) {
    const best = ranked[0];
    const bestWithJson = ranked.find(r => r.jsonParseRate !== '0%');
    console.log('\n' + '═'.repeat(80));
    console.log('🏆 RECOMMENDATION');
    console.log('═'.repeat(80));
    console.log(`Fastest overall:     ${best.label} — ${best.avgTotalMs}ms avg`);
    if (bestWithJson && bestWithJson !== best) {
      console.log(`Fastest + valid JSON: ${bestWithJson.label} — ${bestWithJson.avgTotalMs}ms avg`);
    }
    console.log(`Current model:       Llama 3.3 70B — ${allResults.find(r => r.model === 'meta/llama-3.3-70b-instruct')?.avgTotalMs || 'N/A'}ms avg`);
    
    const currentTime = allResults.find(r => r.model === 'meta/llama-3.3-70b-instruct')?.avgTotalMs;
    if (currentTime && best.avgTotalMs < currentTime) {
      const speedup = (currentTime / best.avgTotalMs).toFixed(1);
      console.log(`\n⚡ Switching to ${best.label} would be ~${speedup}x faster!`);
    }
  }
}

main().catch(console.error);
