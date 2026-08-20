import { LlmClient, GenerationOptions, RubricEvaluationResult } from '../types.js';
import { countWords, extractFrontmatter, validateMarkdownStructure } from '../rubric/deterministic.js';
import { calculateCompositeScore } from '../rubric/institutionalGrade.js';

export type MockScenario = 'default' | 'fail_then_pass' | 'always_fail' | 'rate_limit_once' | 'malformed_json';

/**
 * High-fidelity deterministic mock client for offline tests, CI, and local pipeline verification.
 */
export class MockLlmClient implements LlmClient {
  public callCount = 0;
  public callHistory: Array<{ prompt: string; options?: GenerationOptions; response: string }> = [];
  private responses: string[] = [];
  private defaultResponse: string = '';
  private scenario: MockScenario = 'default';
  private rateLimitTriggered = false;

  constructor(defaultResponse?: string) {
    if (defaultResponse) {
      this.defaultResponse = defaultResponse;
    }
  }

  public setScenario(scenario: MockScenario) {
    this.scenario = scenario;
  }

  public queueResponse(response: string) {
    this.responses.push(response);
  }

  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    this.callCount++;

    if (this.scenario === 'rate_limit_once' && !this.rateLimitTriggered) {
      this.rateLimitTriggered = true;
      const error: any = new Error('HTTP 429: Resource has been exhausted (rate limit exceeded)');
      error.status = 429;
      throw error;
    }

    let response = '';

    if (this.responses.length > 0) {
      response = this.responses.shift()!;
    } else if (
      options?.jsonMode ||
      prompt.includes('RubricEvaluationResult') ||
      prompt.includes('Chief Editorial Auditor') ||
      prompt.includes('Evaluate this candidate draft')
    ) {
      response = this.handleJudgeEvaluation(prompt);
    } else {
      response = this.handleContentGeneration(prompt, options);
    }

    this.callHistory.push({ prompt, options, response });
    return response;
  }

  public reset() {
    this.callCount = 0;
    this.callHistory = [];
    this.responses = [];
    this.rateLimitTriggered = false;
    this.scenario = 'default';
  }

  private handleJudgeEvaluation(prompt: string): string {
    // Extract candidate draft from prompt if present
    const draftMatch = prompt.match(/```markdown\n([\s\S]*?)\n```/) || prompt.match(/Draft:\n([\s\S]*)$/);
    const candidateDraft = draftMatch ? draftMatch[1].trim() : '';

    // Extract slug or topic index
    const slugMatch = prompt.match(/topic(?:_slug)?:\s*([a-zA-Z0-9_]+)/i) || prompt.match(/(\d{2}_[a-z0-9_]+)/);
    const topicSlug = slugMatch ? slugMatch[1] : '01_ai_crypto_trading_bot';
    const indexMatch = topicSlug.match(/^(\d{2})_/);
    const topicIndex = indexMatch ? parseInt(indexMatch[1], 10) : 1;

    // Check candidate draft characteristics
    const wordCount = candidateDraft ? countWords(candidateDraft) : 1465;
    const structure = candidateDraft ? validateMarkdownStructure(candidateDraft) : { isValidHierarchy: true, h1Count: 1, h2Count: 5, tableCount: 1, hasFaq: true, hasDisclaimer: true };

    const containsFluff = /moon|100x|guaranteed win rate|get rich quick|rocket emoji|🚀|🔥/i.test(candidateDraft);
    const containsAiArtifacts = /as an ai language model|in this article we will delve|certainly! here is/i.test(candidateDraft);

    let isPassing = true;
    let minWordCountMet = wordCount >= 1200;
    let noFluff = !containsFluff;
    let validHierarchy = structure.isValidHierarchy && structure.h1Count === 1 && structure.h2Count >= 4;
    let noArtifacts = !containsAiArtifacts;

    if (this.scenario === 'always_fail') {
      isPassing = false;
      minWordCountMet = false;
      noFluff = false;
    } else if (this.scenario === 'fail_then_pass') {
      if (this.callCount <= 2) {
        isPassing = false;
        minWordCountMet = false;
        noFluff = false;
      } else {
        isPassing = true;
        minWordCountMet = true;
        noFluff = true;
        validHierarchy = true;
        noArtifacts = true;
      }
    } else {
      isPassing = minWordCountMet && noFluff && validHierarchy && noArtifacts;
    }

    const evalResult: RubricEvaluationResult = {
      evaluation_timestamp: new Date().toISOString(),
      topic_slug: topicSlug,
      topic_index: topicIndex,
      word_count_actual: wordCount,
      overall_score: isPassing ? 95.2 : 52.0,
      passed: isPassing,
      hard_gates: {
        min_word_count_met: minWordCountMet,
        no_critical_factual_errors: true,
        no_hyperbolic_marketing_fluff: noFluff,
        valid_markdown_hierarchy: validHierarchy,
        no_llm_boilerplate_artifacts: noArtifacts
      },
      dimension_scores: {
        institutional_tone: {
          score: isPassing ? 96 : 45,
          passed: isPassing,
          weight: 0.25,
          critique: isPassing
            ? 'Authoritative, analytical, and objective tone throughout. Zero marketing fluff.'
            : 'Contains retail hype words and promotional claims.',
          actionable_remediation: isPassing
            ? []
            : ['Eliminate promotional language and replace with probabilistic risk analysis.']
        },
        financial_crypto_accuracy: {
          score: isPassing ? 95 : 60,
          passed: isPassing,
          weight: 0.25,
          critique: isPassing
            ? 'Exemplary market microstructure depth and accurate mathematical formulas.'
            : 'Superficial descriptions of trading mechanics lacking microstructure or risk mechanics.',
          actionable_remediation: isPassing
            ? []
            : ['Add quantitative models for order book dynamics and execution latency.']
        },
        word_count_depth: {
          score: isPassing ? 98 : 35,
          passed: isPassing,
          weight: 0.15,
          critique: isPassing
            ? `Substantive depth with ${wordCount} body words meeting requirement.`
            : `Body word count (${wordCount}) is below the 1,200-word threshold.`,
          actionable_remediation: isPassing
            ? []
            : ['Expand technical sections to achieve at least 1,350 words.']
        },
        markdown_structure: {
          score: isPassing ? 94 : 65,
          passed: isPassing,
          weight: 0.15,
          critique: isPassing
            ? 'Clean H1 -> H2 -> H3 hierarchy, comparison tables, and FAQ block.'
            : 'Missing comparison matrix table or structured FAQ section.',
          actionable_remediation: isPassing
            ? []
            : ['Add comparison matrix table and 3 technical FAQ entries.']
        },
        seo_optimization: {
          score: isPassing ? 92 : 70,
          passed: isPassing,
          weight: 0.10,
          critique: isPassing
            ? 'Primary and secondary keywords naturally integrated without keyword stuffing.'
            : 'Keyword integration is insufficient in H2 headings.',
          actionable_remediation: isPassing ? [] : ['Include primary keyword in lead paragraph and H2s.']
        },
        readability_formatting: {
          score: isPassing ? 95 : 70,
          passed: isPassing,
          weight: 0.10,
          critique: isPassing
            ? 'Well-formatted callouts, clear mathematical expressions, and tables.'
            : 'Lacks technical sub-headings and code/math callouts.',
          actionable_remediation: isPassing ? [] : ['Add LaTeX equations and ASCII architecture diagrams.']
        }
      },
      identified_issues: isPassing
        ? []
        : [
            {
              severity: 'fatal',
              dimension: 'word_count_depth',
              location: 'Full Document',
              issue_description: `Word count (${wordCount}) is below the mandatory 1,200-word threshold.`,
              suggested_fix: 'Expand technical discussion across 5 distinct H2 sections to achieve >= 1,350 words.'
            },
            {
              severity: 'fatal',
              dimension: 'institutional_tone',
              location: 'Section 1',
              issue_description: 'Promotional hype and unrealistic win rate claims detected.',
              suggested_fix: 'Remove all claims of guaranteed profits; frame within risk-adjusted return paradigms.'
            }
          ],
      refinement_prompt_guidance: isPassing
        ? 'Article meets all institutional grade criteria. Approved for publication.'
        : 'CRITICAL FIXES REQUIRED: 1) Expand body text from 540 to 1,400+ words. 2) Eliminate marketing hype and replace with rigorous institutional analysis. 3) Add a comparison table and 3 technical FAQs.'
    };

    if (this.scenario === 'malformed_json') {
      return `\`\`\`json\n${JSON.stringify(evalResult, null, 2)}\n\`\`\``;
    }

    return JSON.stringify(evalResult, null, 2);
  }

  private handleContentGeneration(prompt: string, options?: GenerationOptions): string {
    if (this.defaultResponse) {
      return this.defaultResponse;
    }

    // Extract title, keyword, slug if in prompt
    let title = 'The Ultimate Guide to AI Crypto Trading Bots in 2026';
    let keyword = 'AI crypto trading bot';
    let slug = '01_ai_crypto_trading_bot';
    let pillar = 'AI Trading & Algorithmic Automation';

    const titleMatch = prompt.match(/title:\s*"?([^"\n]+)"?/i) || prompt.match(/topic:\s*"?([^"\n(]+)"?/i);
    if (titleMatch) title = titleMatch[1].trim();

    const kwMatch = prompt.match(/keyword:\s*"?([^"\n)]+)"?/i);
    if (kwMatch) keyword = kwMatch[1].trim();

    const slugMatch = prompt.match(/slug:\s*"?([^"\n]+)"?/i) || prompt.match(/(\d{2}_[a-z0-9_]+)/);
    if (slugMatch) slug = slugMatch[1].trim();

    return `---
title: "${title}"
slug: "${slug}"
index: 1
target_keyword: "${keyword}"
secondary_keywords:
  - "machine learning trade execution"
  - "quantitative crypto strategies"
  - "algorithmic order routing"
category: "${pillar}"
search_intent: "Transactional"
target_audience: "Institutional allocators, quantitative traders, systematic desk leads"
estimated_reading_time_minutes: 8
word_count: 1465
status: "draft"
---

# ${title}

The transition from discretionary digital asset execution to autonomous, quantitative trading infrastructure marks a structural paradigm shift across institutional capital markets. In high-frequency and algorithmic crypto markets, traditional heuristic models and technical indicators fail under regime shifts, non-stationary volatility, and liquidity fragmentation. Modern market participants deploy probabilistic machine learning architectures capable of extracting subtle alpha signals from multi-exchange order book dynamics while simultaneously minimizing adverse selection and market impact.

This comprehensive guide details the mathematical foundations, system architecture, latency considerations, and risk frameworks required to build and deploy institutional-grade trading systems in digital asset markets.

---

## 1. Market Microstructure & Signal Extraction

At the core of systematic digital asset trading is the continuous modeling of Limit Order Book (LOB) dynamics. Unlike equity markets governed by consolidated SIP feeds, crypto market microstructure is fragmented across heterogeneous centralized exchanges (Binance, Coinbase, OKX, Bybit) and decentralized automated market makers (Uniswap v3, Curve).

### Order Book Imbalance (OBI) & Micro-Price Modeling

Order book depth signals provide immediate short-term directional probability. The static Order Book Imbalance (OBI) metric measures liquidity pressure across top-of-book levels:

\`\`\`
          V_b(t) - V_a(t)
OBI(t) = ─────────────────
          V_b(t) + V_a(t)
\`\`\`

Where $V_b(t)$ and $V_a(t)$ represent aggregate bid and ask volume across $K$ price levels. To account for queue depletion and Poisson arrival rates of market orders, institutional desks compute the Stoikov micro-price ($P_{micro}$):

\`\`\`
              V_b(t) · P_a(t) + V_a(t) · P_b(t)
P_micro(t) = ───────────────────────────────────
                      V_b(t) + V_a(t)
\`\`\`

By incorporating volume imbalance into mid-price calculation, systematic execution algorithms predict short-term price drift and avoid toxic flow.

---

## 2. Machine Learning Architectures for Alpha Generation

State-of-the-art crypto quantitative systems leverage hybrid deep learning models to predict return distributions over discrete forward horizons (100ms, 1s, 10s, 60s).

### Feature Engineering Pipeline

1. **Stationary Price Transformations**: Log-returns, Fractional Differentiation ($d \\approx 0.35$ preserving long memory while ensuring stationarity).
2. **Microstructure Descriptors**: Realized volatility, Amihud illiquidity ratio, Roll effective spread, Kyle's lambda.
3. **Cross-Exchange Lead-Lag Features**: High-frequency correlation matrices across BTC-USDT perps and spot pairs.

### Deep Learning Architecture Taxonomy

- **Temporal Convolutional Networks (TCN)**: Dilated causal 1D convolutions capturing multi-scale temporal dependencies without recursive gradient degradation.
- **Transformer Encoders with Multi-Head Self-Attention**: Capturing non-linear cross-asset momentum spillovers and macroeconomic liquidity pulses.
- **Deep Q-Networks (DQN) / PPO for Optimal Execution**: Reinforcement learning agents optimizing TWAP/VWAP schedules against synthetic exchange simulators.

---

## 3. Systematic Execution & Slippage Minimization

Alpha decay occurs rapidly in crypto markets. Slippage and maker fees dictate the viability of quantitative strategies.

| Execution Algorithm | Core Objective | Optimal Market Regime | Adverse Selection Risk |
| :--- | :--- | :--- | :--- |
| **Adaptive TWAP** | Time-sliced volume dispersion | Low-volatility range-bound | Moderate |
| **Almgren-Chriss Optimal** | Balance inventory risk vs. execution cost | High-volatility trend continuation | Low |
| **Passive Liquidity Provision** | Capture bid-ask spread with maker rebates | High-volume mean-reverting books | High (requires inventory skew) |
| **Statistical Arbitrage Router** | Cross-venue triangle / basis capture | Structural fragmentation | Negligible (requires sub-10ms colocation) |

### Optimal Execution Framework

The Almgren-Chriss framework minimizes the expected execution cost $E[x]$ and variance $V[x]$:

\`\`\`
U(x) = E[x] + \\lambda V[x]
\`\`\`

Where $\\lambda$ denotes the risk-aversion parameter of the fund. Large blocks are dynamically partitioned into child orders routed to dark pools and crossing networks to mitigate market footprint.

---

## 4. Institutional Risk Management & Portfolio Optimization

Systematic strategies require rigorous real-time risk controls implemented at the gateway layer before order transit.

### Quantitative Risk Guardrails

1. **Fractional Kelly Sizing**: Sizing allocations using $f^* = \\frac{p \\cdot b - q}{b} \\cdot c_{safety}$ where $c_{safety} = 0.25$ to prevent tail drawdowns.
2. **Conditional Value-at-Risk (CVaR / Expected Shortfall)**: 99% 1-hour CVaR monitoring accounting for fat-tailed non-Gaussian return distributions.
3. **Automated Kill-Switches**: Sub-millisecond circuit breakers triggering flat inventory states upon WebSocket disconnects, API error rate spikes (>2%), or maximum daily loss thresholds (-3.0%).

---

## 5. Technology Stack & Infrastructure Architecture

High-throughput trading pipelines require deterministic execution environments:

\`\`\`
[Exchange WebSockets] ──> [Rust FIX / WS Ingestion] ──> [Shared Memory Ring Buffer]
                                                              │
                                                              ▼
[Sub-ms Risk Gateway] <── [C++ Execution Engine] <── [Python ONNX Model Runtime]
         │
         ▼
[Exchange Direct Market Access]
\`\`\`

- **Ingestion**: Zero-copy deserialization in Rust/C++ utilizing kernel bypass (Solarflare OpenOnload).
- **Inference**: Quantized ONNX / TensorRT runtimes executing batched forward passes in $<1.2\\text{ms}$.
- **Logging & Audit**: ClickHouse time-series database capturing full tick-by-tick LOB state for backtesting fidelity.

---

## Frequently Asked Questions (FAQ)

### How do institutional crypto trading bots mitigate exchange counterparty risk?
Institutional allocators utilize Off-Exchange Settlement (OES) networks (such as Copper ClearLoop and Fireblocks Off-Exchange) to trade on centralized exchange order books while retaining custody of collateral in segregated multi-party computation (MPC) vaults.

### What backtesting safeguards prevent lookahead bias and overfitting in ML strategies?
Rigorous quantitative setups apply Purged Group Time-Series Cross-Validation, combinatorial purged cross-validation (CPCV), synthetic market simulation with realistic queue priority modeling, and subtract exchange fee tiers and conservative 2-5 bps slippage penalties.

### Which programming languages dominate quantitative crypto trading infrastructure?
Production systems use a hybrid stack: Python (Polars, PyTorch, VectorBT) for research and feature engineering, and C++20 or Rust for live order routing, feed handlers, and sub-millisecond execution engines.

---

## Compliance & Risk Disclosure
*This document is for educational and institutional research purposes only and does not constitute financial, investment, or trading advice. Algorithmic trading and digital asset derivatives involve substantial risk of capital loss. Past statistical performance is no guarantee of future returns.*
`;
  }
}
