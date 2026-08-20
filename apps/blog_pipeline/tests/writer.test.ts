import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  formatFrontmatter,
  saveApprovedPost,
  saveEvaluationAudit,
  isPostAlreadyApproved
} from '../src/storage/writer.js';
import { countWords, extractFrontmatter } from '../src/rubric/deterministic.js';
import { Topic, RubricEvaluationResult } from '../src/types.js';

const SAMPLE_TOPIC: Topic = {
  index: 1,
  pillarId: 1,
  pillarName: 'AI Trading & Algorithmic Automation',
  pillarDescriptor: 'High CPC / High Trend',
  pillarDescription: 'Algorithmic trading systems and bots',
  primaryKeyword: 'AI crypto trading bot',
  title: 'The Ultimate Guide to AI Crypto Trading Bots in 2026',
  searchIntent: 'Transactional',
  slug: '01_ai_crypto_trading_bot',
  targetWordCount: 1200
};

const SAMPLE_PASSING_EVAL: RubricEvaluationResult = {
  evaluation_timestamp: '2026-08-19T00:00:00.000Z',
  topic_slug: '01_ai_crypto_trading_bot',
  topic_index: 1,
  word_count_actual: 1450,
  overall_score: 94.5,
  passed: true,
  hard_gates: {
    min_word_count_met: true,
    no_critical_factual_errors: true,
    no_hyperbolic_marketing_fluff: true,
    valid_markdown_hierarchy: true,
    no_llm_boilerplate_artifacts: true
  },
  dimension_scores: {
    institutional_tone: { score: 95, weight: 25, critique: 'Excellent tone.' },
    financial_crypto_accuracy: { score: 96, weight: 25, critique: 'Accurate formulas.' },
    word_count_depth: { score: 92, weight: 15, critique: 'Deep analysis.' },
    markdown_structure: { score: 95, weight: 15, critique: 'Flawless structure.' },
    seo_optimization: { score: 92, weight: 10, critique: 'Target keywords placed.' },
    readability_formatting: { score: 92, weight: 10, critique: 'Clear tables and math.' }
  },
  identified_issues: [],
  refinement_prompt_guidance: 'No further refinement required.'
};

const SAMPLE_FAILING_EVAL: RubricEvaluationResult = {
  evaluation_timestamp: '2026-08-19T00:00:00.000Z',
  topic_slug: '01_ai_crypto_trading_bot',
  topic_index: 1,
  word_count_actual: 750,
  overall_score: 68.0,
  passed: false,
  hard_gates: {
    min_word_count_met: false,
    no_critical_factual_errors: true,
    no_hyperbolic_marketing_fluff: false,
    valid_markdown_hierarchy: true,
    no_llm_boilerplate_artifacts: true
  },
  dimension_scores: {
    institutional_tone: { score: 65, weight: 25, critique: 'Contains hype words.' },
    financial_crypto_accuracy: { score: 75, weight: 25, critique: 'Lacks quantitative depth.' },
    word_count_depth: { score: 50, weight: 15, critique: 'Too short (750 words).' },
    markdown_structure: { score: 85, weight: 15, critique: 'Adequate headings.' },
    seo_optimization: { score: 70, weight: 10, critique: 'Missing keywords in H2s.' },
    readability_formatting: { score: 70, weight: 10, critique: 'Missing comparison table.' }
  },
  identified_issues: [
    {
      severity: 'fatal',
      dimension: 'word_count_depth',
      location: 'Entire draft',
      issue_description: 'Draft is only 750 words, failing minimum 1200 words gate.',
      suggested_fix: 'Expand technical mechanics and architecture.'
    }
  ],
  refinement_prompt_guidance: 'CRITICAL: Expand to at least 1,300 words and remove all marketing buzzwords.'
};

const SAMPLE_BODY_CONTENT = `# The Ultimate Guide to AI Crypto Trading Bots in 2026

## 1. Executive Summary & Market Architecture
Algorithmic trading in cryptocurrency markets has evolved from simple rule-based systems to sophisticated reinforcement learning agents capable of processing multi-exchange order books in real time.

## 2. High-Frequency Market Microstructure
Market makers optimize the bid-ask spread:
$$\\delta = \\frac{2}{\\gamma} \\ln\\left(1 + \\frac{\\gamma}{\\kappa}\\right)$$

## 3. Quantitative Risk Management
Risk-adjusted returns must exceed risk-free benchmarks.

## 4. Architectural Comparison
| Architecture | Latency | Complexity | Capital Efficiency |
| :--- | :--- | :--- | :--- |
| Rule-Based | < 1ms | Low | Moderate |
| Reinforcement Learning | 5-15ms | High | Maximum |

## Frequently Asked Questions
### What is the primary risk of AI bots?
Overfitting to historical market regimes.

## Institutional Disclaimer
This material is for informational purposes only.`;

describe('Storage Writer Module (writer.ts)', () => {
  const testDir = path.resolve(__dirname, 'sandbox_writer_' + Date.now());
  const outputDir = path.join(testDir, 'output');
  const evalDir = path.join(testDir, '.evaluations');

  beforeEach(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  describe('formatFrontmatter()', () => {
    it('generates canonical YAML frontmatter for approved articles', () => {
      const result = formatFrontmatter(SAMPLE_TOPIC, SAMPLE_BODY_CONTENT, SAMPLE_PASSING_EVAL, 'gemini-2.5-flash');

      expect(result).toMatch(/^---\n[\s\S]+?\n---\n/);
      expect(result).toContain('title: "The Ultimate Guide to AI Crypto Trading Bots in 2026"');
      expect(result).toContain('slug: "01_ai_crypto_trading_bot"');
      expect(result).toContain('index: 1');
      expect(result).toContain('primary_keyword: "AI crypto trading bot"');
      expect(result).toContain('target_keyword: "AI crypto trading bot"');
      expect(result).toContain('status: "approved"');
      expect(result).toContain('model_used: "gemini-2.5-flash"');
      expect(result).not.toContain('review_required: true');

      const fm = extractFrontmatter(result);
      expect(fm.status).toBe('approved');
      expect(fm.slug).toBe('01_ai_crypto_trading_bot');
    });

    it('flags unapproved drafts with needs_manual_review and review_required: true', () => {
      const result = formatFrontmatter(SAMPLE_TOPIC, SAMPLE_BODY_CONTENT, SAMPLE_FAILING_EVAL);

      expect(result).toContain('status: "needs_manual_review"');
      expect(result).toContain('review_required: true');

      const fm = extractFrontmatter(result);
      expect(fm.status).toBe('needs_manual_review');
      expect(fm.review_required).toBe(true);
    });

    it('strips pre-existing frontmatter before prepending canonical frontmatter', () => {
      const draftWithOldFm = `---\ntitle: "Old Title"\nold_field: "remove_me"\n---\n\n${SAMPLE_BODY_CONTENT}`;
      const result = formatFrontmatter(SAMPLE_TOPIC, draftWithOldFm, SAMPLE_PASSING_EVAL);

      expect(result).not.toContain('old_field: "remove_me"');
      expect(result).toContain('title: "The Ultimate Guide to AI Crypto Trading Bots in 2026"');
      const occurrences = result.match(/---/g);
      expect(occurrences?.length).toBe(2); // Exactly opening and closing frontmatter markers
    });
  });

  describe('saveApprovedPost() and saveEvaluationAudit()', () => {
    it('creates directories recursively and saves post with audit JSON', async () => {
      const nestedOutput = path.join(testDir, 'nested', 'deep', 'output');
      const nestedEval = path.join(testDir, 'nested', 'deep', '.evaluations');

      const saveRes = await saveApprovedPost({
        outputDir: nestedOutput,
        evalDir: nestedEval,
        topic: SAMPLE_TOPIC,
        content: SAMPLE_BODY_CONTENT,
        evaluation: SAMPLE_PASSING_EVAL
      });

      expect(fs.existsSync(saveRes.postPath)).toBe(true);
      expect(saveRes.postPath).toBe(path.join(nestedOutput, '01_ai_crypto_trading_bot.md'));
      expect(saveRes.status).toBe('approved');

      expect(saveRes.evalPath).toBeDefined();
      expect(fs.existsSync(saveRes.evalPath!)).toBe(true);

      const savedEval = JSON.parse(await fs.promises.readFile(saveRes.evalPath!, 'utf-8'));
      expect(savedEval.passed).toBe(true);
      expect(savedEval.overall_score).toBe(94.5);
    });

    it('performs atomic writes leaving no leftover temporary files', async () => {
      await saveApprovedPost({
        outputDir,
        evalDir,
        topic: SAMPLE_TOPIC,
        content: SAMPLE_BODY_CONTENT,
        evaluation: SAMPLE_PASSING_EVAL
      });

      const outputFiles = await fs.promises.readdir(outputDir);
      const tmpFiles = outputFiles.filter((f) => f.includes('.tmp'));
      expect(tmpFiles).toHaveLength(0);
      expect(outputFiles).toContain('01_ai_crypto_trading_bot.md');
    });
  });

  describe('isPostAlreadyApproved()', () => {
    it('returns false when output file does not exist', async () => {
      const isApproved = await isPostAlreadyApproved(outputDir, SAMPLE_TOPIC);
      expect(isApproved).toBe(false);
    });

    it('returns false when existing file is marked with review_required', async () => {
      await saveApprovedPost({
        outputDir,
        evalDir,
        topic: SAMPLE_TOPIC,
        content: SAMPLE_BODY_CONTENT,
        evaluation: SAMPLE_FAILING_EVAL
      });

      const isApproved = await isPostAlreadyApproved(outputDir, SAMPLE_TOPIC);
      expect(isApproved).toBe(false);
    });

    it('returns true when existing file is approved and meets word count', async () => {
      // Generate a substantive post exceeding 1200 words
      const longBody = Array(1250).fill('institutional').join(' ');
      const substantiveContent = `# ${SAMPLE_TOPIC.title}\n\n## Section 1\n${longBody}`;

      await saveApprovedPost({
        outputDir,
        evalDir,
        topic: SAMPLE_TOPIC,
        content: substantiveContent,
        evaluation: SAMPLE_PASSING_EVAL
      });

      const isApproved = await isPostAlreadyApproved(outputDir, SAMPLE_TOPIC, evalDir);
      expect(isApproved).toBe(true);
    });
  });
});
