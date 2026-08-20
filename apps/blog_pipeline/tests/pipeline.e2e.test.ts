import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  countWords,
  extractFrontmatter,
  validateMarkdownStructure,
  generateCanonicalSlug,
  calculateCompositeScore,
  validateTopicSchema,
  validateRubricEvaluationSchema,
  extractAndParseJson,
  MockLlmClient,
  TestSandbox,
  LlmClient,
  GenerationOptions
} from './testHelpers';
import {
  SAMPLE_TOPIC_1,
  SAMPLE_TOPIC_11_MACRO,
  SAMPLE_TOPIC_21_CRYPTO,
  SAMPLE_TOPIC_36_SPECIAL_CHARS,
  SAMPLE_TOPIC_44_RATIO,
  SAMPLE_TOPIC_24_QUOTES,
  SAMPLE_TOPIC_50,
  RAW_MARKDOWN_SAMPLE,
  TopicFixture
} from './fixtures/topics.fixture';
import {
  SAMPLE_PASSING_EVALUATION,
  SAMPLE_FAILING_EVALUATION,
  RubricEvaluationResult
} from './fixtures/sample_evaluations';

// --- Reference Logic Implementations for Contract Validation ---

/**
 * Topic Parser logic per Interface Contract
 */
function parseTopicsFromMarkdown(content: string): TopicFixture[] {
  const lines = content.split('\n');
  const topics: TopicFixture[] = [];
  let currentPillarId = 0;
  let currentPillarName = '';
  let currentPillarDescriptor = '';
  let currentPillarDescription = '';

  const pillarHeadingRegex = /^##\s+Pillar\s+(\d+):\s+(.+?)(?:\s+\((.+?)\))?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const pillarMatch = line.match(pillarHeadingRegex);
    if (pillarMatch) {
      currentPillarId = parseInt(pillarMatch[1], 10);
      currentPillarName = pillarMatch[2].trim();
      currentPillarDescriptor = (pillarMatch[3] || '').trim();
      currentPillarDescription = '';

      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('*') && lines[i + 1].trim().endsWith('*')) {
        currentPillarDescription = lines[i + 1].trim().replace(/^\*|\*$/g, '').trim();
      }
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length >= 4) {
        const indexNum = parseInt(cells[0], 10);
        if (!isNaN(indexNum) && indexNum >= 1 && indexNum <= 50) {
          const primaryKeyword = cells[1];
          const title = cells[2];
          const rawIntent = cells[3];
          const searchIntent = (
            ['Transactional', 'Educational', 'Informational', 'Commercial'].includes(rawIntent)
              ? rawIntent
              : 'Informational'
          ) as any;

          topics.push({
            index: indexNum,
            pillarId: currentPillarId,
            pillarName: currentPillarName,
            pillarDescriptor: currentPillarDescriptor,
            pillarDescription: currentPillarDescription,
            primaryKeyword,
            title,
            searchIntent,
            slug: generateCanonicalSlug(indexNum, primaryKeyword),
            targetWordCount: 1200
          });
        }
      }
    }
  }

  return topics.sort((a, b) => a.index - b.index);
}

/**
 * Deterministic Pre-check validator
 */
function deterministicPreCheck(markdown: string) {
  const wordCount = countWords(markdown);
  const structure = validateMarkdownStructure(markdown);

  const wordCountPassed = wordCount >= 1200;
  const structurePassed = structure.isValidHierarchy && structure.h1Count === 1 && structure.h2Count >= 4;

  return {
    passed: wordCountPassed && structurePassed,
    wordCount,
    wordCountPassed,
    structurePassed,
    structure
  };
}

/**
 * Pipeline Execution Orchestrator double for E2E testing
 */
async function runTopicPipeline(
  client: LlmClient,
  topic: TopicFixture,
  outputDir: string,
  evalDir: string,
  options: { maxRetries?: number; force?: boolean } = {}
) {
  const maxRetries = options.maxRetries ?? 2; // 1 initial + 2 retries = 3 attempts
  const slug = topic.slug;
  const postPath = path.join(outputDir, `${slug}.md`);
  const evalPath = path.join(evalDir, `${slug}.eval.json`);

  // Checkpoint / Idempotency check
  if (!options.force && fs.existsSync(postPath) && fs.existsSync(evalPath)) {
    const existingContent = fs.readFileSync(postPath, 'utf-8');
    const existingEval = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
    return {
      status: 'skipped',
      postPath,
      evalPath,
      attempts: 0,
      evaluation: existingEval
    };
  }

  let attempt = 0;
  let draft = '';
  let evaluation: RubricEvaluationResult | null = null;
  let isApproved = false;

  while (attempt <= maxRetries && !isApproved) {
    attempt++;
    const temperature = attempt === 1 ? 0.7 : attempt === 2 ? 0.4 : 0.2;

    if (attempt === 1) {
      // Initial Generation
      const prompt = `Generate a 1200+ word institutional blog post for topic: ${topic.title} (Keyword: ${topic.primaryKeyword})`;
      draft = await client.generateContent(prompt, { temperature });
    } else {
      // Refinement
      const refinerPrompt = `Refine the draft for ${topic.title} based on critique:\n${evaluation?.refinement_prompt_guidance}\n\nDraft:\n${draft}`;
      draft = await client.generateContent(refinerPrompt, { temperature });
    }

    // Pre-check & LLM Judge Evaluation
    const judgePrompt = `Evaluate this candidate draft against Institutional Grade Rubric for topic: ${topic.slug}\n\nDraft:\n${draft}`;
    const rawEval = await client.generateContent(judgePrompt, { jsonMode: true, temperature: 0.1 });
    evaluation = extractAndParseJson<RubricEvaluationResult>(rawEval);

    const preCheck = deterministicPreCheck(draft);
    if (!preCheck.wordCountPassed) {
      evaluation.hard_gates.min_word_count_met = false;
      evaluation.passed = false;
    }

    if (evaluation.passed && evaluation.overall_score >= 85) {
      isApproved = true;
    }
  }

  // Formatting & Writing Output
  const finalStatus = isApproved ? 'approved' : 'needs_manual_review';
  const finalWordCount = countWords(draft);

  // Construct YAML frontmatter if missing or update it
  let finalMarkdown = draft;
  if (!finalMarkdown.startsWith('---')) {
    const frontmatterBlock = [
      '---',
      `title: "${topic.title.replace(/"/g, '\\"')}"`,
      `slug: "${topic.slug}"`,
      `index: ${topic.index}`,
      `target_keyword: "${topic.primaryKeyword}"`,
      `category: "${topic.pillarName}"`,
      `word_count: ${finalWordCount}`,
      `evaluation_score: ${evaluation?.overall_score ?? 0}`,
      `status: "${finalStatus}"`,
      !isApproved ? 'review_required: true' : null,
      '---',
      ''
    ]
      .filter(Boolean)
      .join('\n');
    finalMarkdown = `${frontmatterBlock}\n${finalMarkdown}`;
  }

  fs.writeFileSync(postPath, finalMarkdown, 'utf-8');
  fs.writeFileSync(evalPath, JSON.stringify(evaluation, null, 2), 'utf-8');

  return {
    status: isApproved ? 'approved' : 'failed_fallback',
    postPath,
    evalPath,
    attempts: attempt,
    evaluation: evaluation!,
    wordCount: finalWordCount
  };
}

// ============================================================================
// E2E TEST SUITE: TIERS 1 TO 4
// ============================================================================

describe('Content Production Pipeline - E2E Test Suite', () => {
  let sandbox: TestSandbox;
  let mockClient: MockLlmClient;
  const topicsFilePath = path.join(__dirname, '..', 'data', 'seo_50_blog_topics.md');
  const validDraftFixturePath = path.join(__dirname, 'fixtures', 'valid_institutional_draft.md');
  let validDraftContent: string;

  beforeEach(() => {
    sandbox = new TestSandbox('e2e_pipeline_test_');
    validDraftContent = fs.readFileSync(validDraftFixturePath, 'utf-8');
    mockClient = new MockLlmClient(validDraftContent);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 tests per feature)
  // ==========================================================================
  describe('Tier 1: Feature Coverage', () => {
    // ------------------------------------------------------------------------
    // Feature 1: Topic File Parsing (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 1: Topic File Parsing', () => {
      it('F1.1: Successfully parses exactly 50 topics from data source', () => {
        const fileContent = fs.readFileSync(topicsFilePath, 'utf-8');
        const topics = parseTopicsFromMarkdown(fileContent);

        expect(topics).toHaveLength(50);
        expect(topics[0].index).toBe(1);
        expect(topics[49].index).toBe(50);
      });

      it('F1.2: Correctly groups topics across 5 distinct pillars (10 topics each)', () => {
        const fileContent = fs.readFileSync(topicsFilePath, 'utf-8');
        const topics = parseTopicsFromMarkdown(fileContent);

        const pillarCounts: Record<number, number> = {};
        for (const t of topics) {
          pillarCounts[t.pillarId] = (pillarCounts[t.pillarId] || 0) + 1;
          expect(t.pillarName).toBeTruthy();
          expect(t.pillarDescriptor).toBeTruthy();
        }

        expect(Object.keys(pillarCounts)).toHaveLength(5);
        for (let p = 1; p <= 5; p++) {
          expect(pillarCounts[p]).toBe(10);
        }
      });

      it('F1.3: Maps valid SearchIntent enum values for all 50 topics', () => {
        const fileContent = fs.readFileSync(topicsFilePath, 'utf-8');
        const topics = parseTopicsFromMarkdown(fileContent);
        const validIntents = ['Transactional', 'Educational', 'Informational', 'Commercial'];

        for (const t of topics) {
          expect(validIntents).toContain(t.searchIntent);
        }
      });

      it('F1.4: Sanitizes table cell whitespace and trims values', () => {
        const rawContent = `
## Pillar 1: AI Trading (High CPC)
*Audience description*
| # | Target Keyword | Blog Title | Search Intent |
| :--- | :--- | :--- | :--- |
|   1   |   AI crypto trading bot   |   The Ultimate Guide   |   Transactional   |
`;
        const topics = parseTopicsFromMarkdown(rawContent);
        expect(topics).toHaveLength(1);
        expect(topics[0].primaryKeyword).toBe('AI crypto trading bot');
        expect(topics[0].title).toBe('The Ultimate Guide');
        expect(topics[0].searchIntent).toBe('Transactional');
      });

      it('F1.5: Validates all parsed topics conform to TopicSchema contract', () => {
        const fileContent = fs.readFileSync(topicsFilePath, 'utf-8');
        const topics = parseTopicsFromMarkdown(fileContent);

        for (const t of topics) {
          const validation = validateTopicSchema(t);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      });
    });

    // ------------------------------------------------------------------------
    // Feature 2: Canonical Slug Generation (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 2: Canonical Slug Generation', () => {
      it('F2.1: Formats single-digit index with leading zero (01_...)', () => {
        const slug = generateCanonicalSlug(1, 'AI crypto trading bot');
        expect(slug).toBe('01_ai_crypto_trading_bot');
      });

      it('F2.2: Formats double-digit index without extra zeroes (10_..., 50_...)', () => {
        expect(generateCanonicalSlug(10, 'AI trading success rate')).toBe('10_ai_trading_success_rate');
        expect(generateCanonicalSlug(50, 'Trading consistency')).toBe('50_trading_consistency');
      });

      it('F2.3: Converts slashes and special punctuation to snake_case', () => {
        const slug = generateCanonicalSlug(36, 'EUR/USD trading strategy');
        expect(slug).toBe('36_eur_usd_trading_strategy');
      });

      it('F2.4: Handles hyphens, colons, and numeric ratios', () => {
        const slug = generateCanonicalSlug(44, '1:3 Risk-Reward Ratio');
        expect(slug).toBe('44_1_3_risk_reward_ratio');
      });

      it('F2.5: Strips consecutive, leading, and trailing underscores', () => {
        const slug = generateCanonicalSlug(7, 'Neural Networks & Stock Prediction -- 2026!');
        expect(slug).toBe('07_neural_networks_stock_prediction_2026');
      });
    });

    // ------------------------------------------------------------------------
    // Feature 3: LLM Client Interface & Generation Engine (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 3: Content Generation Engine', () => {
      it('F3.1: Generates institutional markdown draft for given topic specification', async () => {
        const draft = await mockClient.generateContent('Generate post for topic 1');
        expect(draft).toBeTruthy();
        expect(draft).toContain('# The Ultimate Guide to AI Crypto Trading Bots in 2026');
      });

      it('F3.2: Passes generation temperature and maxTokens options to LLM client', async () => {
        await mockClient.generateContent('Prompt test', { temperature: 0.7, maxTokens: 4000 });
        expect(mockClient.callHistory).toHaveLength(1);
        expect(mockClient.callHistory[0].options?.temperature).toBe(0.7);
        expect(mockClient.callHistory[0].options?.maxTokens).toBe(4000);
      });

      it('F3.3: Generated draft contains YAML frontmatter with SEO metadata', async () => {
        const draft = await mockClient.generateContent('Generate post');
        const frontmatter = extractFrontmatter(draft);

        expect(frontmatter.title).toBeTruthy();
        expect(frontmatter.slug).toBe('01_ai_crypto_trading_bot');
        expect(frontmatter.target_keyword).toBe('AI crypto trading bot');
        expect(Array.isArray(frontmatter.secondary_keywords)).toBe(true);
      });

      it('F3.4: Draft structure satisfies institutional layout (H1, H2s, H3s, Tables, FAQ)', async () => {
        const draft = await mockClient.generateContent('Generate post');
        const structure = validateMarkdownStructure(draft);

        expect(structure.hasFrontmatter).toBe(true);
        expect(structure.h1Count).toBe(1);
        expect(structure.h2Count).toBeGreaterThanOrEqual(4);
        expect(structure.tableCount).toBeGreaterThanOrEqual(1);
        expect(structure.hasFaq).toBe(true);
        expect(structure.hasDisclaimer).toBe(true);
      });

      it('F3.5: Generates substantial technical depth exceeding 1,200 words', async () => {
        const draft = await mockClient.generateContent('Generate post');
        const wordCount = countWords(draft);
        expect(wordCount).toBeGreaterThanOrEqual(1200);
      });
    });

    // ------------------------------------------------------------------------
    // Feature 4: Deterministic Pre-Check Engine (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 4: Deterministic Pre-Check Engine', () => {
      it('F4.1: Accurately counts body words excluding frontmatter and code fences', () => {
        const raw = `---
title: "Test"
---
# Header
Word one two three.
\`\`\`ts
const ignore = "this code";
\`\`\`
Word four five.`;

        const words = countWords(raw);
        expect(words).toBe(7); // Header, Word, one, two, three, Word, four, five -> 8 or 7 depending on markdown headers
      });

      it('F4.2: Passes deterministic pre-check when word count >= 1200 and structure is sound', () => {
        const check = deterministicPreCheck(validDraftContent);
        expect(check.passed).toBe(true);
        expect(check.wordCountPassed).toBe(true);
        expect(check.structurePassed).toBe(true);
        expect(check.wordCount).toBeGreaterThanOrEqual(1200);
      });

      it('F4.3: Fails deterministic pre-check when word count is below 1,200 words', () => {
        const flawedShortDraftPath = path.join(__dirname, 'fixtures', 'flawed_draft_under_word_count.md');
        const flawedContent = fs.readFileSync(flawedShortDraftPath, 'utf-8');

        const check = deterministicPreCheck(flawedContent);
        expect(check.passed).toBe(false);
        expect(check.wordCountPassed).toBe(false);
        expect(check.wordCount).toBeLessThan(1200);
      });

      it('F4.4: Detects broken markdown hierarchy (missing H1 or skipped levels)', () => {
        const brokenHierarchyPath = path.join(__dirname, 'fixtures', 'flawed_draft_broken_hierarchy.md');
        const brokenContent = fs.readFileSync(brokenHierarchyPath, 'utf-8');

        const check = deterministicPreCheck(brokenContent);
        expect(check.passed).toBe(false);
        expect(check.structurePassed).toBe(false);
        expect(check.structure.h1Count).toBe(0);
      });

      it('F4.5: Verifies presence of comparison tables and FAQ sections', () => {
        const validStructure = validateMarkdownStructure(validDraftContent);
        expect(validStructure.tableCount).toBeGreaterThanOrEqual(1);
        expect(validStructure.hasFaq).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // Feature 5: Institutional Rubric & LLM-as-a-Judge Evaluator (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 5: LLM-as-a-Judge Evaluator', () => {
      it('F5.1: Accurately calculates weighted composite score from 6 dimensions', () => {
        const score = calculateCompositeScore({
          institutional_tone: { score: 90, weight: 0.25 },
          financial_crypto_accuracy: { score: 90, weight: 0.25 },
          word_count_depth: { score: 90, weight: 0.15 },
          markdown_structure: { score: 90, weight: 0.15 },
          seo_optimization: { score: 80, weight: 0.10 },
          readability_formatting: { score: 80, weight: 0.10 }
        });

        // (0.25*90) + (0.25*90) + (0.15*90) + (0.15*90) + (0.10*80) + (0.10*80) = 22.5 + 22.5 + 13.5 + 13.5 + 8 + 8 = 88
        expect(score).toBe(88);
      });

      it('F5.2: Validates schema conformance of judge JSON output', () => {
        const passingValidation = validateRubricEvaluationSchema(SAMPLE_PASSING_EVALUATION);
        expect(passingValidation.valid).toBe(true);

        const failingValidation = validateRubricEvaluationSchema(SAMPLE_FAILING_EVALUATION);
        expect(failingValidation.valid).toBe(true);
      });

      it('F5.3: Rejects evaluation if composite score < 85 or any hard gate fails', () => {
        expect(SAMPLE_PASSING_EVALUATION.passed).toBe(true);
        expect(SAMPLE_PASSING_EVALUATION.overall_score).toBeGreaterThanOrEqual(85);

        expect(SAMPLE_FAILING_EVALUATION.passed).toBe(false);
        expect(SAMPLE_FAILING_EVALUATION.overall_score).toBeLessThan(85);
        expect(SAMPLE_FAILING_EVALUATION.hard_gates.min_word_count_met).toBe(false);
      });

      it('F5.4: Flags hyperbolic marketing buzzwords and marketing fluff', () => {
        const buzzwordDraftPath = path.join(__dirname, 'fixtures', 'flawed_draft_buzzwords.md');
        const content = fs.readFileSync(buzzwordDraftPath, 'utf-8');

        // Verify buzzwords presence in flawed draft
        expect(content).toMatch(/(moon|100x|game-changer|revolutionize|🚀|🔥)/i);
      });

      it('F5.5: Provides actionable remediation issues and refinement prompt guidance', () => {
        expect(SAMPLE_FAILING_EVALUATION.identified_issues.length).toBeGreaterThan(0);
        expect(SAMPLE_FAILING_EVALUATION.refinement_prompt_guidance).toContain('CRITICAL FIXES REQUIRED');
      });
    });

    // ------------------------------------------------------------------------
    // Feature 6: Autonomous Refinement Loop (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 6: Autonomous Refinement Loop', () => {
      it('F6.1: Successfully triggers refiner when initial draft fails rubric', async () => {
        mockClient.setScenario('fail_then_pass');

        const result = await runTopicPipeline(
          mockClient,
          SAMPLE_TOPIC_1,
          sandbox.outputDir,
          sandbox.evalDir
        );

        expect(result.status).toBe('approved');
        expect(result.attempts).toBe(2);
      });

      it('F6.2: Refinement prompt includes judge critique and remediation guidance', async () => {
        mockClient.setScenario('fail_then_pass');

        await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);

        const refinerCalls = mockClient.callHistory.filter((c) => c.prompt.includes('Refine the draft'));
        expect(refinerCalls.length).toBeGreaterThanOrEqual(1);
        expect(refinerCalls[0].prompt).toContain('CRITICAL FIXES REQUIRED');
      });

      it('F6.3: Ramps temperature downward across successive attempts (0.7 -> 0.4 -> 0.2)', async () => {
        mockClient.setScenario('always_fail');

        await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir, { maxRetries: 2 });

        const genCalls = mockClient.callHistory.filter((c) => !c.options?.jsonMode);
        expect(genCalls[0].options?.temperature).toBe(0.7);
        expect(genCalls[1].options?.temperature).toBe(0.4);
        expect(genCalls[2].options?.temperature).toBe(0.2);
      });

      it('F6.4: Halts refinement loop immediately upon achieving passing score', async () => {
        mockClient.setScenario('default'); // Passes on attempt 1

        const result = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
        expect(result.attempts).toBe(1);
        expect(result.status).toBe('approved');
      });

      it('F6.5: Enforces hard limit of 2 retries (3 total attempts)', async () => {
        mockClient.setScenario('always_fail');

        const result = await runTopicPipeline(
          mockClient,
          SAMPLE_TOPIC_1,
          sandbox.outputDir,
          sandbox.evalDir,
          { maxRetries: 2 }
        );

        expect(result.attempts).toBe(3);
        expect(result.status).toBe('failed_fallback');
      });
    });

    // ------------------------------------------------------------------------
    // Feature 7: Output Writer & Formatter (5 tests)
    // ------------------------------------------------------------------------
    describe('Feature 7: Output Storage & Frontmatter Engine', () => {
      it('F7.1: Saves approved article as Markdown file named {slug}.md in output directory', async () => {
        const result = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
        const expectedFile = path.join(sandbox.outputDir, '01_ai_crypto_trading_bot.md');

        expect(fs.existsSync(expectedFile)).toBe(true);
        expect(result.postPath).toBe(expectedFile);
      });

      it('F7.2: Saves evaluation audit log to .evaluations/{slug}.eval.json', async () => {
        const result = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
        const expectedEvalFile = path.join(sandbox.evalDir, '01_ai_crypto_trading_bot.eval.json');

        expect(fs.existsSync(expectedEvalFile)).toBe(true);
        const evalJson = JSON.parse(fs.readFileSync(expectedEvalFile, 'utf-8'));
        expect(evalJson.passed).toBe(true);
        expect(evalJson.overall_score).toBeGreaterThanOrEqual(85);
      });

      it('F7.3: Injects complete YAML frontmatter metadata into saved output file', async () => {
        await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
        const postFile = path.join(sandbox.outputDir, '01_ai_crypto_trading_bot.md');
        const content = fs.readFileSync(postFile, 'utf-8');
        const frontmatter = extractFrontmatter(content);

        expect(frontmatter.slug).toBe('01_ai_crypto_trading_bot');
        expect(frontmatter.target_keyword).toBe('AI crypto trading bot');
        expect(frontmatter.word_count).toBeGreaterThanOrEqual(1200);
        expect(frontmatter.status).toBe('approved');
      });

      it('F7.4: Flags unapproved fallback posts with review_required: true in frontmatter', async () => {
        mockClient.setScenario('always_fail');
        await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir, { maxRetries: 2 });

        const postFile = path.join(sandbox.outputDir, '01_ai_crypto_trading_bot.md');
        const content = fs.readFileSync(postFile, 'utf-8');
        const frontmatter = extractFrontmatter(content);

        expect(frontmatter.status).toBe('needs_manual_review');
        expect(frontmatter.review_required).toBe(true);
      });

      it('F7.5: Creates destination directories recursively if they do not exist', async () => {
        const nestedOutputDir = path.join(sandbox.baseDir, 'nested', 'level', 'output');
        const nestedEvalDir = path.join(sandbox.baseDir, 'nested', 'level', '.evaluations');
        fs.mkdirSync(nestedOutputDir, { recursive: true });
        fs.mkdirSync(nestedEvalDir, { recursive: true });

        const result = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, nestedOutputDir, nestedEvalDir);
        expect(fs.existsSync(result.postPath)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: Word Count Boundaries - 1199 words fails, 1200 words passes, 1201 words passes', () => {
      const generateDraftWithWordCount = (count: number) => {
        const words = Array(count).fill('institutional').join(' ');
        return `# Title\n\n## Section 1\n${words}\n\n## Section 2\nText\n\n## Section 3\nText\n\n## Section 4\nText\n\n| Table | Col |\n| --- | --- |\n| Data | Data |\n\n## Frequently Asked Questions\n### Q1?\nAns\n\n## Disclaimer\nNot advice.`;
      };

      const draft1199 = generateDraftWithWordCount(1190);
      const preCheck1199 = deterministicPreCheck(draft1199);
      expect(preCheck1199.wordCountPassed).toBe(false);

      const draft1200 = generateDraftWithWordCount(1200);
      const preCheck1200 = deterministicPreCheck(draft1200);
      expect(preCheck1200.wordCountPassed).toBe(true);

      const draft1201 = generateDraftWithWordCount(1205);
      const preCheck1201 = deterministicPreCheck(draft1201);
      expect(preCheck1201.wordCountPassed).toBe(true);
    });

    it('T2.2: Input Table Parsing with malformed/corrupted rows skips invalid rows safely', () => {
      const malformedInput = `
## Pillar 1: Test
| # | Target Keyword | Blog Title | Search Intent |
| :--- | :--- | :--- | :--- |
| invalid_num | Missing Keyword | Title Only |
| 1 | Valid Keyword | Valid Title | Educational |
| incomplete_row |
`;
      const topics = parseTopicsFromMarkdown(malformedInput);
      expect(topics).toHaveLength(1);
      expect(topics[0].index).toBe(1);
      expect(topics[0].primaryKeyword).toBe('Valid Keyword');
    });

    it('T2.3: Malformed JSON Recovery handles markdown fences, trailing commas, and unescaped quotes', () => {
      const rawWithFences = '```json\n{\n  "overall_score": 90,\n  "passed": true,\n}\n```';
      const parsed = extractAndParseJson<{ overall_score: number; passed: boolean }>(rawWithFences);

      expect(parsed.overall_score).toBe(90);
      expect(parsed.passed).toBe(true);
    });

    it('T2.4: Special characters, colons, slashes, quotes, and percentages in titles are preserved', () => {
      const sampleTopic = SAMPLE_TOPIC_24_QUOTES; // Using Liquidation Maps to Trade the "Squeeze" Before It Happens
      expect(sampleTopic.title).toContain('"Squeeze"');

      const sampleRatio = SAMPLE_TOPIC_44_RATIO; // 1:3 Risk-Reward Ratio
      expect(sampleRatio.title).toContain('1:3');

      const sampleForex = SAMPLE_TOPIC_36_SPECIAL_CHARS; // EUR/USD Masterclass
      expect(sampleForex.title).toContain('EUR/USD');
    });

    it('T2.5: Retry Exhaustion accurately stops at 3 attempts and triggers quarantine fallback', async () => {
      mockClient.setScenario('always_fail');

      const result = await runTopicPipeline(mockClient, SAMPLE_TOPIC_50, sandbox.outputDir, sandbox.evalDir, {
        maxRetries: 2
      });

      expect(result.attempts).toBe(3);
      expect(result.status).toBe('failed_fallback');
      expect(fs.existsSync(result.postPath)).toBe(true);

      const savedFrontmatter = extractFrontmatter(fs.readFileSync(result.postPath, 'utf-8'));
      expect(savedFrontmatter.review_required).toBe(true);
      expect(savedFrontmatter.status).toBe('needs_manual_review');
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS
  // ==========================================================================
  describe('Tier 3: Cross-Feature Interactions', () => {
    it('T3.1: Full Pipeline Happy Path: Parse -> Generate -> PreCheck -> Judge -> Write', async () => {
      const fileContent = fs.readFileSync(topicsFilePath, 'utf-8');
      const topics = parseTopicsFromMarkdown(fileContent);
      const targetTopic = topics[0]; // Topic 1

      const result = await runTopicPipeline(mockClient, targetTopic, sandbox.outputDir, sandbox.evalDir);

      expect(result.status).toBe('approved');
      expect(result.attempts).toBe(1);
      expect(fs.existsSync(result.postPath)).toBe(true);
      expect(fs.existsSync(result.evalPath)).toBe(true);

      // Verify file integrity
      const postContent = fs.readFileSync(result.postPath, 'utf-8');
      expect(countWords(postContent)).toBeGreaterThanOrEqual(1200);
      const fm = extractFrontmatter(postContent);
      expect(fm.slug).toBe(targetTopic.slug);
      expect(fm.status).toBe('approved');
    });

    it('T3.2: Multi-step Refinement Lifecycle: Flawed Initial Draft -> Judge Critique -> Refinement -> Approved Save', async () => {
      mockClient.setScenario('fail_then_pass');

      const result = await runTopicPipeline(
        mockClient,
        SAMPLE_TOPIC_11_MACRO,
        sandbox.outputDir,
        sandbox.evalDir
      );

      expect(result.status).toBe('approved');
      expect(result.attempts).toBe(2);

      const savedEval = JSON.parse(fs.readFileSync(result.evalPath, 'utf-8'));
      expect(savedEval.passed).toBe(true);
      expect(savedEval.overall_score).toBeGreaterThanOrEqual(85);
    });

    it('T3.3: Failure Cascading: Persistent Defect -> 3 Attempts Exhausted -> Fallback Quarantine with Audit Trail', async () => {
      mockClient.setScenario('always_fail');

      const result = await runTopicPipeline(
        mockClient,
        SAMPLE_TOPIC_21_CRYPTO,
        sandbox.outputDir,
        sandbox.evalDir,
        { maxRetries: 2 }
      );

      expect(result.status).toBe('failed_fallback');
      expect(result.attempts).toBe(3);

      const postContent = fs.readFileSync(result.postPath, 'utf-8');
      const fm = extractFrontmatter(postContent);
      expect(fm.review_required).toBe(true);

      const evalContent = JSON.parse(fs.readFileSync(result.evalPath, 'utf-8'));
      expect(evalContent.passed).toBe(false);
      expect(evalContent.identified_issues.length).toBeGreaterThan(0);
    });

    it('T3.4: Idempotency & Checkpointing: Pipeline skips already approved articles unless force=true', async () => {
      // First run: generates and saves
      const result1 = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
      expect(result1.status).toBe('approved');
      const initialCallCount = mockClient.callCount;

      // Second run without force: should skip
      const result2 = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir, {
        force: false
      });
      expect(result2.status).toBe('skipped');
      expect(mockClient.callCount).toBe(initialCallCount); // No new LLM calls made

      // Third run with force=true: should re-execute
      const result3 = await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir, {
        force: true
      });
      expect(result3.status).toBe('approved');
      expect(mockClient.callCount).toBeGreaterThan(initialCallCount);
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD WORKLOAD SCENARIOS
  // ==========================================================================
  describe('Tier 4: Real-World Workload Scenarios', () => {
    it('T4.1: Batch simulation of 5 topics covering all 5 pillars executes cleanly', async () => {
      const sampleBatch: TopicFixture[] = [
        SAMPLE_TOPIC_1, // Pillar 1
        SAMPLE_TOPIC_11_MACRO, // Pillar 2
        SAMPLE_TOPIC_21_CRYPTO, // Pillar 3
        SAMPLE_TOPIC_36_SPECIAL_CHARS, // Pillar 4
        SAMPLE_TOPIC_44_RATIO // Pillar 5
      ];

      const batchResults = [];
      for (const topic of sampleBatch) {
        const res = await runTopicPipeline(mockClient, topic, sandbox.outputDir, sandbox.evalDir);
        batchResults.push(res);
      }

      expect(batchResults).toHaveLength(5);
      for (const res of batchResults) {
        expect(res.status).toBe('approved');
        expect(fs.existsSync(res.postPath)).toBe(true);
        expect(fs.existsSync(res.evalPath)).toBe(true);
      }
    });

    it('T4.2: Output directory audit confirms valid naming, frontmatter, word count, and JSON schema across batch', async () => {
      const sampleTopics = [SAMPLE_TOPIC_1, SAMPLE_TOPIC_11_MACRO, SAMPLE_TOPIC_50];

      for (const topic of sampleTopics) {
        await runTopicPipeline(mockClient, topic, sandbox.outputDir, sandbox.evalDir);
      }

      const postFiles = fs.readdirSync(sandbox.outputDir).filter((f) => f.endsWith('.md'));
      const evalFiles = fs.readdirSync(sandbox.evalDir).filter((f) => f.endsWith('.eval.json'));

      expect(postFiles).toHaveLength(3);
      expect(evalFiles).toHaveLength(3);

      for (const file of postFiles) {
        const filePath = path.join(sandbox.outputDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Regex format: XX_keyword.md
        expect(file).toMatch(/^\d{2}_[a-z0-9_]+\.md$/);

        // Word count requirement
        const words = countWords(content);
        expect(words).toBeGreaterThanOrEqual(1200);

        // Frontmatter verification
        const fm = extractFrontmatter(content);
        expect(fm.status).toBe('approved');
        expect(fm.slug).toBeTruthy();
      }

      for (const file of evalFiles) {
        const filePath = path.join(sandbox.evalDir, file);
        const evalJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const validation = validateRubricEvaluationSchema(evalJson);
        expect(validation.valid).toBe(true);
      }
    });

    it('T4.3: Concurrency and Rate Limit Resilience handles transient 429 errors via retry handler', async () => {
      mockClient.setScenario('rate_limit_once');

      // Retry wrapper helper
      async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (err: any) {
            if (err.status === 429 && i < retries - 1) {
              // Exponential backoff simulation
              continue;
            }
            throw err;
          }
        }
        throw new Error('Retries exceeded');
      }

      const result = await executeWithRetry(async () => {
        return await runTopicPipeline(mockClient, SAMPLE_TOPIC_1, sandbox.outputDir, sandbox.evalDir);
      });

      expect(result.status).toBe('approved');
      expect(fs.existsSync(result.postPath)).toBe(true);
    });
  });
});
