# HeroPips SEO Content Production Pipeline

Institutional-grade, automated content production system designed to programmatically generate 50 SEO-optimized, 1,200+ word Markdown blog posts across 5 strategic pillars from `data/seo_50_blog_topics.md`.

## Features

- **Multi-Pillar Topic Parser**: Parses 50 topics across 5 pillars with search intents, canonical slugs (`01_ai_crypto_trading_bot`), and target word count quotas.
- **Institutional Content Generator**: Quantitative Strategist persona prompt enforcing deep market mechanics, comparison tables, LaTeX formulas, FAQs, and risk disclaimers.
- **Deterministic Pre-Checker**: Zero-latency word counter (`>= 1,200` body words) and markdown hierarchy validator.
- **Institutional Rubric & LLM-as-a-Judge**: 6-dimension weighted grading (Institutional Tone, Accuracy, Depth, Markdown Structure, SEO, Readability) and 5 non-negotiable hard gates.
- **Autonomous Refinement Loop**: Critique-driven prompt feedback with downward temperature ramping (0.7 -> 0.4 -> 0.2) and max 2 retries (3 total attempts).
- **Atomic Output Storage**: Frontmatter injection (`status: "approved"`, `slug`, `word_count`, `evaluation_score`), audit logs (`.evaluations/{slug}.eval.json`), and temporary file swap to prevent corruption.
- **Production CLI & Batch Runner**: Concurrency pooling, request throttling, idempotency checkpointing, and execution summary reports.

---

## Installation & Setup

```bash
cd apps/blog_pipeline
npm install
```

### Environment Configuration

Create a `.env` or `.env.local` file:

```env
# Gemini API Key (Required for live generation)
GEMINI_API_KEY="your-gemini-api-key-here"

# Model Selection (Default: gemini-2.5-flash)
GEMINI_MODEL="gemini-2.5-flash"

# Batch Pipeline Concurrency (Default: 2)
PIPELINE_CONCURRENCY=2

# Throttle Delay Between Requests in Milliseconds (Default: 1500)
REQUEST_DELAY_MS=1500

# Mock LLM for Offline Testing (true/false)
MOCK_LLM=false
```

---

## CLI Usage

### 1. Run a Single Topic with Mock LLM
```bash
npx tsx src/index.ts --topic=1 --mock
```

### 2. Run All Topics in a Specific Pillar (e.g. Pillar 1)
```bash
npx tsx src/index.ts --pillar=1 --mock
```

### 3. Run the Full 50-Topic Production Batch
```bash
npx tsx src/index.ts --all --concurrency=4
```

### 4. Force Regeneration of Existing Posts
```bash
npx tsx src/index.ts --all --force
```

### 5. Dry Run (Validate Catalog without LLM Calls)
```bash
npx tsx src/index.ts --all --dry-run
```

---

## CLI Options Reference

| Flag | Short | Default | Description |
|---|---|---|---|
| `--topic=<index>` | `-t` | - | Run pipeline for a specific topic index (1–50) |
| `--slug=<slug>` | - | - | Run pipeline for a specific topic slug |
| `--pillar=<id>` | `-p` | - | Run pipeline for all topics in a pillar (1–5) |
| `--all` | `-a` | - | Run pipeline across all 50 topics in catalog |
| `--mock` | `-m` | `false` | Run offline using deterministic mock LLM |
| `--concurrency=<N>` | `-c` | `2` | Number of parallel worker threads |
| `--output-dir=<path>`| `-o` | `output` | Directory for approved Markdown posts |
| `--eval-dir=<path>` | `-e` | `.evaluations` | Directory for evaluation audit JSONs |
| `--topics-file=<path>`| `-f` | `data/seo_50_blog_topics.md` | Source topics markdown file |
| `--model=<name>` | - | `gemini-2.5-flash` | Gemini model name |
| `--max-retries=<N>` | - | `3` | Maximum attempts per topic before fallback |
| `--delay=<ms>` | - | `1500` | Delay between request dispatches in ms |
| `--force` | - | `false` | Force regeneration of existing approved posts |
| `--dry-run` | - | `false` | Parse and list topics without LLM generation |
| `--help` | `-h` | - | Display help menu |
| `--version` | `-v` | - | Display version |

---

## Running Tests

Run the complete test suite with Vitest:

```bash
# From apps/blog_pipeline
npm test

# Run specific test suites
npx vitest run tests/writer.test.ts
npx vitest run tests/cli.test.ts
npx vitest run tests/pipeline.e2e.test.ts
```
