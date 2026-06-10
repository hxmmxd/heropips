/**
 * llmRouter.ts — Multi-Provider Failover Chain
 * 
 * Automatically cascades through LLM providers in priority order:
 *   1. Groq (LPU — ~300ms, same llama-3.3-70b model)
 *   2. NVIDIA NIM (~1.3s fallback)
 *   3. Engine template (0ms — always works, caller handles)
 * 
 * Features:
 *   - Circuit breaker: auto-skips dead providers after 3 failures
 *   - Auto-heal: retries after 5 min cooldown
 *   - Stats integration: reports to apiStats.ts
 *   - Key rotation: round-robin for multi-key providers
 */

import { recordApiCall, markUnconfigured, type ApiName } from './apiStats';
import { getPlatformConfig } from './platformConfig';

// ── Provider Definitions ──────────────────────────────────

export interface LLMProvider {
  name: ApiName;
  label: string;
  url: string;
  model: string;
  keyEnv: string;          // env var name (or platform_config key)
  timeoutMs: number;
  priority: number;        // lower = tried first
}

export interface LLMResult {
  text: string;
  raw: any;                // Full parsed response from LLM
  provider: string;
  latencyMs: number;
}

// Provider chain — ordered by priority
const PROVIDERS: LLMProvider[] = [
  {
    name: 'groq',
    label: 'Groq LPU',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyEnv: 'GROQ_API_KEY',
    timeoutMs: 5_000,       // Groq is normally <500ms
    priority: 1,
  },
  {
    name: 'nvidia',
    label: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',   // Same 70B model — zero quality compromise
    keyEnv: 'NVIDIA_API_KEYS',
    timeoutMs: 15_000,
    priority: 2,
  },
];

// ── Circuit Breaker ────────────────────────────────────────
// Prevents wasting time on providers that are known to be down.
// After THRESHOLD consecutive failures, the provider is "opened" (skipped).
// After COOLDOWN_MS, the breaker auto-heals and retries.

interface BreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 5 * 60_000; // 5 minutes

const breakers = new Map<string, BreakerState>();

function getBreaker(name: string): BreakerState {
  if (!breakers.has(name)) {
    breakers.set(name, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return breakers.get(name)!;
}

function shouldSkipProvider(name: string): boolean {
  const b = getBreaker(name);
  if (!b.isOpen) return false;
  // Auto-heal: if cooldown elapsed, give it another chance (half-open)
  if (Date.now() - b.lastFailure > BREAKER_COOLDOWN_MS) {
    b.isOpen = false;
    b.failures = 0;
    console.log(`[LLM Router] ♻️  Circuit breaker HEALED for ${name}`);
    return false;
  }
  return true;
}

function recordProviderSuccess(name: string) {
  const b = getBreaker(name);
  b.failures = 0;
  b.isOpen = false;
}

function recordProviderFailure(name: string, reason: string) {
  const b = getBreaker(name);
  b.failures++;
  b.lastFailure = Date.now();
  if (b.failures >= BREAKER_THRESHOLD) {
    b.isOpen = true;
    console.warn(`[LLM Router] 🔴 Circuit breaker OPEN for ${name} after ${b.failures} consecutive failures (${reason})`);
  }
}

// ── API Key Resolution ─────────────────────────────────────

let nvidiaKeyIndex = 0;

async function resolveApiKey(provider: LLMProvider): Promise<string | null> {
  // Check Supabase platform_config first
  const dbKey = await getPlatformConfig(provider.keyEnv.toLowerCase(), '');
  if (dbKey) {
    const keys = dbKey.split(',').map((k: string) => k.trim()).filter(Boolean);
    if (keys.length > 0) {
      if (keys.length === 1) return keys[0];
      const key = keys[nvidiaKeyIndex % keys.length];
      nvidiaKeyIndex++;
      return key;
    }
  }

  // Fall back to env vars
  const envVal = process.env[provider.keyEnv] || '';
  if (!envVal) return null;

  const keys = envVal.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;
  if (keys.length === 1) return keys[0];

  // Round-robin for multi-key providers
  const key = keys[nvidiaKeyIndex % keys.length];
  nvidiaKeyIndex++;
  return key;
}

// ── Core: Call a single provider ───────────────────────────

async function tryProvider(
  provider: LLMProvider,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number,
): Promise<LLMResult | null> {

  // 1. Check API key
  const apiKey = await resolveApiKey(provider);
  if (!apiKey) {
    markUnconfigured(provider.name);
    return null;
  }

  // 2. Check circuit breaker
  if (shouldSkipProvider(provider.name)) {
    console.log(`[LLM Router] ⏭️  Skipping ${provider.label} (circuit breaker open)`);
    return null;
  }

  // 3. Make the call
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - t0;

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'unknown');
      const errMsg = `HTTP ${res.status}: ${errBody.substring(0, 150)}`;
      recordApiCall(provider.name, false, latency, errMsg);
      recordProviderFailure(provider.name, errMsg);
      console.warn(`[LLM Router] ❌ ${provider.label} error (${latency}ms): ${errMsg.substring(0, 100)}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      recordApiCall(provider.name, false, latency, 'Empty response');
      recordProviderFailure(provider.name, 'Empty response');
      return null;
    }

    recordApiCall(provider.name, true, latency);
    recordProviderSuccess(provider.name);
    console.log(`[LLM Router] ✅ ${provider.label} responded in ${latency}ms (${data.usage?.completion_tokens || '?'} tokens)`);

    return { text, raw: data, provider: provider.name, latencyMs: latency };

  } catch (err: any) {
    clearTimeout(timeoutId);
    const latency = Date.now() - t0;
    const errMsg = err?.cause?.code || err?.message || 'unknown';
    recordApiCall(provider.name, false, latency, errMsg);
    recordProviderFailure(provider.name, errMsg);
    console.warn(`[LLM Router] ❌ ${provider.label} failed (${latency}ms): ${errMsg}`);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────

/**
 * Call an LLM with automatic multi-provider failover.
 * Tries providers in priority order (Groq → NVIDIA).
 * Returns null if ALL providers fail — caller should use engine template.
 */
export async function callLLM(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number = 512,
): Promise<LLMResult | null> {

  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  for (const provider of sorted) {
    const result = await tryProvider(provider, messages, systemPrompt, maxTokens);
    if (result) return result;
  }

  console.warn('[LLM Router] ⚠️  All providers failed — caller should use engine fallback');
  return null;
}

/**
 * Get the health status of all providers (for admin dashboard).
 */
export function getProviderHealth() {
  return PROVIDERS.map(p => {
    const b = getBreaker(p.name);
    return {
      name: p.name,
      label: p.label,
      model: p.model,
      hasKey: !!(process.env[p.keyEnv]),
      circuitBreaker: {
        isOpen: b.isOpen,
        consecutiveFailures: b.failures,
        lastFailureAt: b.lastFailure || null,
        cooldownRemaining: b.isOpen
          ? Math.max(0, BREAKER_COOLDOWN_MS - (Date.now() - b.lastFailure))
          : 0,
      },
    };
  });
}
