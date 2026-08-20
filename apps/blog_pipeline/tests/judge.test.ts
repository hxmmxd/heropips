import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  countWords,
  extractFrontmatter,
  parseFrontmatter,
  stripFrontmatter,
  validateMarkdownStructure,
  deterministicPreCheck,
  calculateCompositeScore,
  buildJudgePrompt,
  extractAndParseJson,
  evaluateDraft,
  buildRefinementPrompt,
  refineDraft,
  executeGenerationAndEvaluationLoop,
  MockLlmClient,
  Topic,
  RubricEvaluationResult,
  RubricEvaluationResultSchema
} from '../src/index.js';

const MOCK_TOPIC_1: Topic = {
  index: 1,
  pillarId: 1,
  pillarName: 'AI Trading & Algorithmic Automation',
  pillarDescriptor: 'High CPC / High Trend',
  pillarDescription: 'Institutional traders seeking systematic automation',
  primaryKeyword: 'AI crypto trading bot',
  title: 'The Ultimate Guide to AI Crypto Trading Bots in 2026',
  searchIntent: 'Transactional',
  slug: '01_ai_crypto_trading_bot',
  targetWordCount: 1200
};

describe('Deterministic Pre-Checks, Rubric & LLM-as-a-Judge (Milestone 3)', () => {
  let mockClient: MockLlmClient;
  const fixturesDir = path.join(__dirname, 'fixtures');
  let validDraft: string;
  let shortDraft: string;
  let brokenHierarchyDraft: string;
  let buzzwordDraft: string;

  beforeEach(() => {
    mockClient = new MockLlmClient();
    validDraft = fs.readFileSync(path.join(fixturesDir, 'valid_institutional_draft.md'), 'utf-8');
    shortDraft = fs.readFileSync(path.join(fixturesDir, 'flawed_draft_under_word_count.md'), 'utf-8');
    brokenHierarchyDraft = fs.readFileSync(path.join(fixturesDir, 'flawed_draft_broken_hierarchy.md'), 'utf-8');
    buzzwordDraft = fs.readFileSync(path.join(fixturesDir, 'flawed_draft_buzzwords.md'), 'utf-8');
  });

  describe('Deterministic Analysis (src/rubric/deterministic.ts)', () => {
    it('countWords: excludes YAML frontmatter, code blocks, and markdown syntax symbols', () => {
      const sample = `---
title: "Test Post"
slug: "test"
---
# Header Title
First body paragraph with meaningful quantitative words.
\`\`\`typescript
const a = 1;
const b = 2;
\`\`\`
Second body paragraph here.`;

      const words = countWords(sample);
      // Header, Title, First, body, paragraph, with, meaningful, quantitative, words, Second, body, paragraph, here -> 13 words
      expect(words).toBe(13);
    });

    it('extractFrontmatter & parseFrontmatter: cleanly extracts YAML metadata and separates body content', () => {
      const { data, content, hasFrontmatter } = parseFrontmatter(validDraft);

      expect(hasFrontmatter).toBe(true);
      expect(data.slug).toBe('01_ai_crypto_trading_bot');
      expect(data.target_keyword).toBe('AI crypto trading bot');
      expect(content).not.toContain('slug: "01_ai_crypto_trading_bot"');
      expect(content).toContain('# The Ultimate Guide to AI Crypto Trading Bots in 2026');
    });

    it('validateMarkdownStructure: validates H1, H2 count, heading jumps, tables, FAQ, and disclaimer', () => {
      const result = validateMarkdownStructure(validDraft);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.h1Count).toBe(1);
      expect(result.h2Count).toBeGreaterThanOrEqual(4);
      expect(result.tableCount).toBeGreaterThanOrEqual(1);
      expect(result.hasFaq).toBe(true);
      expect(result.hasDisclaimer).toBe(true);
      expect(result.isValidHierarchy).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validateMarkdownStructure: detects missing H1 and skipped heading levels in flawed drafts', () => {
      const result = validateMarkdownStructure(brokenHierarchyDraft);

      expect(result.h1Count).toBe(0);
      expect(result.isValidHierarchy).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deterministicPreCheck: passes on valid institutional draft and fails on short draft', () => {
      const passResult = deterministicPreCheck(validDraft);
      expect(passResult.passed).toBe(true);
      expect(passResult.wordCountPassed).toBe(true);
      expect(passResult.wordCount).toBeGreaterThanOrEqual(1200);

      const failResult = deterministicPreCheck(shortDraft);
      expect(failResult.passed).toBe(false);
      expect(failResult.wordCountPassed).toBe(false);
      expect(failResult.wordCount).toBeLessThan(1200);
      expect(failResult.errors.some((e) => e.includes('below the required minimum'))).toBe(true);
    });
  });

  describe('Institutional Rubric & Composite Scoring (src/rubric/institutionalGrade.ts)', () => {
    it('calculateCompositeScore: accurately computes normalized weighted score across 6 dimensions', () => {
      const dimensions = {
        institutional_tone: { score: 96, weight: 0.25 },
        financial_crypto_accuracy: { score: 95, weight: 0.25 },
        word_count_depth: { score: 98, weight: 0.15 },
        markdown_structure: { score: 94, weight: 0.15 },
        seo_optimization: { score: 92, weight: 0.10 },
        readability_formatting: { score: 95, weight: 0.10 }
      };

      // (96*0.25) + (95*0.25) + (98*0.15) + (94*0.15) + (92*0.10) + (95*0.10)
      // = 24.0 + 23.75 + 14.7 + 14.1 + 9.2 + 9.5 = 95.25 -> 95.25
      const score = calculateCompositeScore(dimensions);
      expect(score).toBe(95.25);
    });

    it('buildJudgePrompt: generates comprehensive institutional review prompt for LLM judge', () => {
      const prompt = buildJudgePrompt(MOCK_TOPIC_1, validDraft);

      expect(prompt).toContain('Chief Editorial Auditor');
      expect(prompt).toContain('5 MANDATORY HARD GATES');
      expect(prompt).toContain('min_word_count_met');
      expect(prompt).toContain('no_hyperbolic_marketing_fluff');
      expect(prompt).toContain('6 WEIGHTED DIMENSIONS');
      expect(prompt).toContain('01_ai_crypto_trading_bot');
    });
  });

  describe('JSON Extractor & Repair (extractAndParseJson)', () => {
    it('extracts JSON cleanly from markdown code fences', () => {
      const fenced = '```json\n{\n  "overall_score": 92,\n  "passed": true\n}\n```';
      const parsed = extractAndParseJson<{ overall_score: number; passed: boolean }>(fenced);

      expect(parsed.overall_score).toBe(92);
      expect(parsed.passed).toBe(true);
    });

    it('repairs trailing commas in objects and arrays', () => {
      const withTrailingCommas = `{\n  "name": "audit",\n  "tags": ["alpha", "beta",],\n  "passed": true,\n}`;
      const parsed = extractAndParseJson<{ name: string; tags: string[]; passed: boolean }>(withTrailingCommas);

      expect(parsed.name).toBe('audit');
      expect(parsed.tags).toEqual(['alpha', 'beta']);
      expect(parsed.passed).toBe(true);
    });
  });

  describe('LLM-as-a-Judge Evaluator (evaluateDraft)', () => {
    it('evaluates a valid draft and returns a passing RubricEvaluationResult conforming to Zod schema', async () => {
      const evalResult = await evaluateDraft(mockClient, MOCK_TOPIC_1, validDraft);

      expect(evalResult.passed).toBe(true);
      expect(evalResult.overall_score).toBeGreaterThanOrEqual(85);
      expect(evalResult.hard_gates.min_word_count_met).toBe(true);
      expect(evalResult.hard_gates.no_critical_factual_errors).toBe(true);
      expect(evalResult.hard_gates.no_hyperbolic_marketing_fluff).toBe(true);
      expect(evalResult.hard_gates.valid_markdown_hierarchy).toBe(true);
      expect(evalResult.hard_gates.no_llm_boilerplate_artifacts).toBe(true);

      const zodCheck = RubricEvaluationResultSchema.safeParse(evalResult);
      expect(zodCheck.success).toBe(true);
    });

    it('automatically fails min_word_count_met hard gate and sets passed to false when draft is under 1,200 words', async () => {
      const evalResult = await evaluateDraft(mockClient, MOCK_TOPIC_1, shortDraft);

      expect(evalResult.passed).toBe(false);
      expect(evalResult.hard_gates.min_word_count_met).toBe(false);
      expect(evalResult.identified_issues.some((i) => i.dimension === 'word_count_depth')).toBe(true);
    });

    it('detects marketing fluff and buzzwords in candidate drafts', async () => {
      const evalResult = await evaluateDraft(mockClient, MOCK_TOPIC_1, buzzwordDraft);

      expect(evalResult.hard_gates.no_hyperbolic_marketing_fluff).toBe(false);
      expect(evalResult.passed).toBe(false);
    });
  });

  describe('Autonomous Refinement Loop (src/llm/refiner.ts)', () => {
    it('buildRefinementPrompt: includes topic details, failed gates, itemized issues, and remediation instructions', () => {
      const mockFailingEval: RubricEvaluationResult = {
        evaluation_timestamp: new Date().toISOString(),
        topic_slug: '01_ai_crypto_trading_bot',
        topic_index: 1,
        word_count_actual: 600,
        overall_score: 55,
        passed: false,
        hard_gates: {
          min_word_count_met: false,
          no_critical_factual_errors: true,
          no_hyperbolic_marketing_fluff: false,
          valid_markdown_hierarchy: true,
          no_llm_boilerplate_artifacts: true
        },
        dimension_scores: {
          institutional_tone: { score: 50, passed: false, weight: 0.25, critique: 'Fluff', actionable_remediation: ['Remove hype'] },
          financial_crypto_accuracy: { score: 70, passed: false, weight: 0.25, critique: 'Light', actionable_remediation: [] },
          word_count_depth: { score: 40, passed: false, weight: 0.15, critique: 'Short', actionable_remediation: [] },
          markdown_structure: { score: 85, passed: true, weight: 0.15, critique: 'OK', actionable_remediation: [] },
          seo_optimization: { score: 80, passed: false, weight: 0.10, critique: 'OK', actionable_remediation: [] },
          readability_formatting: { score: 85, passed: true, weight: 0.10, critique: 'OK', actionable_remediation: [] }
        },
        identified_issues: [
          {
            severity: 'fatal',
            dimension: 'word_count_depth',
            location: 'Full Document',
            issue_description: 'Word count 600 is below 1,200',
            suggested_fix: 'Expand technical discussion'
          }
        ],
        refinement_prompt_guidance: 'CRITICAL FIXES: 1) Expand word count. 2) Remove retail hype.'
      };

      const prompt = buildRefinementPrompt(MOCK_TOPIC_1, shortDraft, mockFailingEval, 2);

      expect(prompt).toContain('FAILED HARD GATE: min_word_count_met');
      expect(prompt).toContain('FAILED HARD GATE: no_hyperbolic_marketing_fluff');
      expect(prompt).toContain('CRITICAL FIXES');
      expect(prompt).toContain('EXPAND THIN SECTIONS (Word Count >= 1,200 words)');
      expect(prompt).toContain('PURGE ALL MARKETING HYPE');
    });

    it('refineDraft: applies downward temperature ramp (attempt 2 @ 0.4, attempt 3 @ 0.2)', async () => {
      const mockEval: RubricEvaluationResult = {
        evaluation_timestamp: new Date().toISOString(),
        topic_slug: '01_ai_crypto_trading_bot',
        topic_index: 1,
        word_count_actual: 600,
        overall_score: 55,
        passed: false,
        hard_gates: {
          min_word_count_met: false,
          no_critical_factual_errors: true,
          no_hyperbolic_marketing_fluff: true,
          valid_markdown_hierarchy: true,
          no_llm_boilerplate_artifacts: true
        },
        dimension_scores: {
          institutional_tone: { score: 80, passed: false, weight: 0.25, critique: 'OK' },
          financial_crypto_accuracy: { score: 80, passed: false, weight: 0.25, critique: 'OK' },
          word_count_depth: { score: 40, passed: false, weight: 0.15, critique: 'Short' },
          markdown_structure: { score: 85, passed: true, weight: 0.15, critique: 'OK' },
          seo_optimization: { score: 85, passed: true, weight: 0.10, critique: 'OK' },
          readability_formatting: { score: 85, passed: true, weight: 0.10, critique: 'OK' }
        },
        identified_issues: [],
        refinement_prompt_guidance: 'Expand word count'
      };

      await refineDraft(mockClient, MOCK_TOPIC_1, shortDraft, mockEval, 2);
      expect(mockClient.callHistory[0].options?.temperature).toBe(0.4);

      mockClient.reset();
      await refineDraft(mockClient, MOCK_TOPIC_1, shortDraft, mockEval, 3);
      expect(mockClient.callHistory[0].options?.temperature).toBe(0.2);
    });

    it('executeGenerationAndEvaluationLoop: completes on attempt 1 when initial draft is valid and passes', async () => {
      const result = await executeGenerationAndEvaluationLoop(mockClient, MOCK_TOPIC_1);

      expect(result.isApproved).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.finalEvaluation.passed).toBe(true);
      expect(result.finalEvaluation.overall_score).toBeGreaterThanOrEqual(85);
    });

    it('executeGenerationAndEvaluationLoop: retries and passes in fail_then_pass scenario', async () => {
      mockClient.setScenario('fail_then_pass');

      const result = await executeGenerationAndEvaluationLoop(mockClient, MOCK_TOPIC_1);

      expect(result.isApproved).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.history).toHaveLength(2);
    });

    it('executeGenerationAndEvaluationLoop: halts after maxRetries (3 attempts total) if draft continues to fail', async () => {
      mockClient.setScenario('always_fail');

      const result = await executeGenerationAndEvaluationLoop(mockClient, MOCK_TOPIC_1, {
        maxRetries: 2
      });

      expect(result.isApproved).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.history).toHaveLength(3);
    });
  });
});
