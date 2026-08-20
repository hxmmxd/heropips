# Test Infrastructure: Content Production Pipeline

## 1. Test Philosophy

The Content Production Pipeline test infrastructure is engineered around three foundational pillars:
1. **Opaque-Box Contract Verification**: Tests evaluate system behavior, data integrity, markdown schema conformity, and rubric evaluation outputs strictly against interface contracts (`PROJECT.md`) and user requirements (`ORIGINAL_REQUEST.md`), without coupling to private internal implementation methods.
2. **Deterministic & Offline Testability**: All E2E pipelines, retry loops, and evaluation chains are verifiable offline using isolated mock doubles (`MockLlmClient`), eliminating flakiness, external API latency, and quota exhaustion during automated regression testing.
3. **Multi-Tiered Depth (Tiers 1–4)**: Progressive test coverage guarantees feature correctness (Tier 1), boundary/corner case safety (Tier 2), complex multi-stage lifecycle interactions (Tier 3), and batch workload/filesystem performance (Tier 4).

---

## 2. Feature Inventory Coverage Matrix

| Feature # | Feature Name | Mapped Milestone | Test Coverage Tier | Test Count | Key Test Assertions |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **F1** | Topic File Parsing | M1 | Tier 1, Tier 2 | 6 | Exact 50 topics parsed, 5 pillars (10 each), search intent enums, whitespace trimming, schema validity. |
| **F2** | Canonical Slug Generation | M1 | Tier 1, Tier 2 | 6 | `{padZero2(index)}_{snake_case(keyword)}`, slash/colon/ratio sanitization, special character preservation. |
| **F3** | Data Schema & Type Safety | M1 | Tier 1, Tier 2 | 5 | Zod/TS contracts for `Topic`, `RubricEvaluationResult`, `DimensionScore`, `Frontmatter`. |
| **F4** | Unified LLM Client Architecture | M2 | Tier 1, Tier 4 | 5 | `generateContent` contract, temperature/token options, structured JSON extraction, retry handling. |
| **F5** | Content Generation Engine | M2 | Tier 1, Tier 2 | 5 | 1,200+ word output, YAML frontmatter, H1/H2/H3 blueprint, comparison table, FAQ, disclaimer. |
| **F6** | Deterministic Pre-Check Engine | M2 | Tier 1, Tier 2 | 5 | Regex body word counter (`>= 1200`), heading hierarchy check, table/FAQ presence guards. |
| **F7** | Institutional Grade Rubric | M3 | Tier 1, Tier 2 | 5 | 6 weighted dimensions (Tone 25%, Accuracy 25%, Depth 15%, Structure 15%, SEO 10%, Readability 10%), composite score formula. |
| **F8** | LLM-as-a-Judge Evaluator | M3 | Tier 1, Tier 2 | 5 | 5 hard gates evaluation, JSON schema adherence, itemized issues, remediation prompt synthesis. |
| **F9** | Autonomous Refinement Loop | M3 | Tier 1, Tier 3 | 5 | Critique-driven prompt loop, temperature ramp (0.7 -> 0.4 -> 0.2), max 2 retries (3 total attempts). |
| **F10** | Output Writer & Formatter | M4 | Tier 1, Tier 4 | 5 | `output/{slug}.md` formatting, `.evaluations/{slug}.eval.json` audit trail, recursive directory creation. |
| **F11** | CLI Orchestration & Batch Runner | M4 | Tier 3, Tier 4 | 4 | Batch processing, idempotency checkpointing (`--force`), concurrency throttling. |
| **F12** | Opaque E2E Test Suite | M-TEST | Tiers 1–4 | 47 | End-to-end execution of all pipeline tiers in `pipeline.e2e.test.ts`. |
| **F13** | Live Single-Topic Verification | M-FINAL | Tier 3, Tier 4 | 2 | End-to-end single-topic generation producing approved >1,000 word markdown file. |

---

## 3. Test Architecture & Layout

```
apps/blog_pipeline/
├── data/
│   └── seo_50_blog_topics.md             # Authoritative 50 topics data source
└── tests/
    ├── fixtures/
    │   ├── topics.fixture.ts             # Topic objects across 5 pillars & edge cases
    │   ├── valid_institutional_draft.md  # 1,465-word passing institutional draft
    │   ├── flawed_draft_under_word_count.md # 540-word short draft failing word count gate
    │   ├── flawed_draft_buzzwords.md     # Flawed draft with marketing hype & emojis
    │   ├── flawed_draft_broken_hierarchy.md # Flawed draft with skipped heading levels
    │   ├── flawed_draft_ai_artifacts.md  # Flawed draft with conversational AI wrappers
    │   └── sample_evaluations.ts         # Passing/failing RubricEvaluationResult JSON fixtures
    ├── testHelpers.ts                    # Word counter, markdown validator, schemas, mock doubles
    └── pipeline.e2e.test.ts              # Comprehensive Tiers 1–4 E2E test suite
```

### Mock LLM Client Double (`MockLlmClient`)
The test suite utilizes a decoupled `MockLlmClient` that implements the `LlmClient` interface and provides configurable scenario simulations:
- `default`: Returns passing 1,400+ word institutional drafts and passing judge evaluations (`overall_score >= 85`, all hard gates `true`).
- `fail_then_pass`: Simulates a flawed initial draft triggering the judge critique on attempt 1, followed by an approved refined draft on attempt 2.
- `always_fail`: Simulates persistent defects across all 3 attempts to test retry exhaustion and fallback quarantine (`review_required: true`).
- `malformed_json`: Simulates LLM responses wrapped in markdown code fences (````json ... ````) or with trailing commas to verify the resilient JSON repair parser.
- `rate_limit_once`: Simulates a transient HTTP 429 rate limit error to test backoff and retry handlers.

---

## 4. Tier 1–4 Scenario Matrix

### Tier 1: Feature Coverage (35 Tests)
- **F1 (Topic Parsing)**:
  - `F1.1`: Parses all 50 topics from `seo_50_blog_topics.md` (indices 1–50).
  - `F1.2`: Verifies 5 distinct pillars containing exactly 10 topics each.
  - `F1.3`: Verifies mapping of `SearchIntent` enum for all 50 topics.
  - `F1.4`: Verifies table cell whitespace trimming.
  - `F1.5`: Verifies all parsed topics conform to `TopicSchema`.
- **F2 (Canonical Slug Generation)**:
  - `F2.1`: Single-digit leading zero format (`01_ai_crypto_trading_bot`).
  - `F2.2`: Double-digit indexing format (`10_...`, `50_...`).
  - `F2.3`: Slash & special character conversion (`EUR/USD` $\to$ `36_eur_usd_trading_strategy`).
  - `F2.4`: Numeric ratio formatting (`1:3 Risk-Reward Ratio` $\to$ `44_1_3_risk_reward_ratio`).
  - `F2.5`: Underscore sanitization (no consecutive, leading, or trailing underscores).
- **F3 (Content Generation Engine)**:
  - `F3.1`: Generates complete institutional markdown draft.
  - `F3.2`: Passes generation options (temperature, tokens) to client.
  - `F3.3`: Injects YAML frontmatter with SEO and taxonomy metadata.
  - `F3.4`: Verifies institutional structural blueprint (H1, H2s, H3s, Tables, FAQ).
  - `F3.5`: Enforces word count depth exceeding 1,200 words.
- **F4 (Deterministic Pre-Check Engine)**:
  - `F4.1`: Accurate body word counting excluding frontmatter and code blocks.
  - `F4.2`: Passes pre-check when word count >= 1200 and hierarchy is valid.
  - `F4.3`: Fails pre-check when word count < 1200.
  - `F4.4`: Detects broken markdown hierarchy (missing H1 or skipped levels).
  - `F4.5`: Verifies presence of comparison tables and FAQ sections.
- **F5 (LLM-as-a-Judge Evaluator)**:
  - `F5.1`: Calculates 6-dimension weighted composite score.
  - `F5.2`: Validates schema conformance of judge JSON output.
  - `F5.3`: Rejects drafts when composite score < 85 or any hard gate fails.
  - `F5.4`: Flags marketing hype, buzzwords, and promotional claims.
  - `F5.5`: Provides structured remediation guidance and critique prompt injection.
- **F6 (Autonomous Refinement Loop)**:
  - `F6.1`: Triggers refiner on failing draft.
  - `F6.2`: Injects judge critique into refiner prompt.
  - `F6.3`: Ramps temperature downward across attempts (0.7 $\to$ 0.4 $\to$ 0.2).
  - `F6.4`: Halts refinement loop immediately upon passing.
  - `F6.5`: Enforces maximum 2 retries (3 total attempts) limit.
- **F7 (Output Storage & Frontmatter Engine)**:
  - `F7.1`: Saves approved post to `output/{slug}.md`.
  - `F7.2`: Saves audit log to `.evaluations/{slug}.eval.json`.
  - `F7.3`: Injects enriched YAML frontmatter into saved article.
  - `F7.4`: Flags unapproved fallback posts with `review_required: true`.
  - `F7.5`: Creates destination directories recursively.

### Tier 2: Boundary & Corner Cases (5 Tests)
- `T2.1`: Word Count Boundaries (1199 words fails, 1200 words passes, 1201 words passes).
- `T2.2`: Input Table Parsing with malformed/corrupted rows skips invalid entries safely.
- `T2.3`: Malformed JSON recovery handles markdown code fences and trailing commas.
- `T2.4`: Special characters, quotes, colons, percentages in titles and keywords preserved.
- `T2.5`: Retry exhaustion halts cleanly at 3 attempts and triggers fallback quarantine.

### Tier 3: Cross-Feature Interactions (4 Tests)
- `T3.1`: Full pipeline happy path (Parse $\to$ Generate $\to$ PreCheck $\to$ Judge $\to$ Save).
- `T3.2`: Multi-step refinement lifecycle (Flawed draft $\to$ Judge critique $\to$ Refinement $\to$ Approved save).
- `T3.3`: Failure cascading (Persistent defect $\to$ 3 attempts exhausted $\to$ Fallback quarantine).
- `T3.4`: Idempotency & Checkpointing (Pipeline skips already approved output unless forced).

### Tier 4: Real-World Workload Scenarios (3 Tests)
- `T4.1`: Batch simulation of 5 topics covering all 5 pillars executes cleanly.
- `T4.2`: Directory audit confirms valid naming, frontmatter, word count, and JSON schema across batch.
- `T4.3`: Concurrency and rate limit resilience handles transient 429 errors via retry handler.

---

## 5. Quality & Coverage Thresholds

| Metric | Target Threshold |
| :--- | :--- |
| **Total Test Count** | $\ge 45$ automated tests |
| **Feature Coverage** | $\ge 5$ tests per core feature |
| **Minimum Word Count** | 1,200 words (Institutional target: 1,350–1,700 words) |
| **Passing Score Gate** | Composite Score $\ge 85 / 100$ |
| **Hard Gates Pass Rate** | 100% required for approval (5/5 hard gates) |
| **Max Refinement Retries** | 2 retries (3 attempts total) |
| **Test Execution Speed** | $< 5$ seconds for full offline E2E test suite |

---

## 6. How to Run the Test Suite

Run the full E2E test suite using Vitest:

```bash
npx vitest run apps/blog_pipeline/tests/pipeline.e2e.test.ts
```

To run with coverage:
```bash
npx vitest run apps/blog_pipeline/tests/ --coverage
```
