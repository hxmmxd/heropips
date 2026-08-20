# Original User Request

## 2026-08-18T21:11:16Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Implement the Unified Quote Pipeline (UQP) as defined in the `UQP_Architecture_Plan.md` document. This involves building a Redis-backed tick ingestion daemon, an OHLC aggregator, and an SSE streaming layer to replace third-party price feeds.

Working directory: /Users/lavish/Sites/heropip
Integrity mode: development

## Requirements

### R1. Tick Ingestion Daemon (`src/daemons/tickIngestion.ts`)
Build a Node.js background worker that dynamically subscribes to symbols on the MT5 Sidecar and pipes the raw Bid/Ask ticks into a Redis stream, segmented by broker (e.g., `stream:vantage:XAUUSD`).

### R2. OHLC Aggregator Daemon (`src/daemons/candleAggregator.ts`)
Build a worker that listens to the Redis tick streams, aggregates them into 1-minute, 5-minute, and 1-hour OHLC candles, and saves the finalized candles to the Supabase database.

### R3. AI Rewire & SSE Streaming
Refactor `src/lib/market.ts` to fetch candles from the internal database/Redis cache instead of Yahoo Finance/Twelve Data. Create a Next.js Server-Sent Events (SSE) route (`/api/price-stream`) that pushes the Redis stream to the frontend with a 250ms debounce throttle.

## Acceptance Criteria

### Ingestion & Aggregation Validation
- [ ] `npx tsx scripts/verify_ingestion.ts` successfully connects to Redis and logs live ticks arriving at < 100ms latency.
- [ ] `npx tsx scripts/verify_aggregation.ts` successfully queries Supabase and proves 1-minute candles are being generated and updated.

### Backend Rewire Validation
- [ ] `curl -N http://localhost:3000/api/price-stream` outputs a continuous stream of valid JSON price ticks.
- [ ] `market.ts` successfully generates AI market analysis without making outbound HTTP calls to Yahoo or Twelve Data.

## 2026-08-18T21:23:54Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (Content Production Team)

A content production pipeline to programmatically generate 50 SEO-optimized, 1200-word blog posts based on the `seo_50_blog_topics.md` strategy. The team will build a script that uses an LLM API to write, autonomously grade, and save the posts at scale.

Working directory: ~/teamwork_projects/blog_pipeline
Integrity mode: development

## Requirements

### R1. Content Generation Pipeline
Build a Node.js or Python script that reads the provided `seo_50_blog_topics.md` file, extracts the 50 topics, and loops through them. For each topic, it must call an LLM API (e.g., Gemini via `@google/genai` or standard fetch) to generate a 1,200+ word blog post in Markdown format.

### R2. Institutional Tone Rubric (Agent-as-Judge)
The pipeline must not blindly save the first draft. It must implement an LLM-as-a-judge evaluation step. After generating a draft, the script must pass the text back to the API to be graded against a strict "Institutional Grade" rubric (checking for professional tone, no fluff, deep financial/crypto accuracy, and proper markdown formatting). If the draft fails the rubric, it must be regenerated or refined.

### R3. Output Formatting
The script must save the approved posts as individual `.md` files in an `output/` directory, named logically based on their slug (e.g., `01_ai_crypto_trading_bot.md`).

## Acceptance Criteria

### Automated Pipeline Validation
- [ ] The pipeline script is fully written, dependency files (e.g., `package.json` or `requirements.txt`) are provided, and the script runs without syntax errors.
- [ ] The script successfully parses the exact structure of the `seo_50_blog_topics.md` file to extract topics.
- [ ] The source code clearly implements a two-step LLM process: (1) Initial Generation, and (2) Rubric Evaluation / LLM-as-a-Judge.
- [ ] Running a test execution of the script for a single topic successfully creates a `.md` file in the output directory that exceeds 1,000 words.
