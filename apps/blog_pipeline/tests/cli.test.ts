import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseCliArgs, loadConfig } from '../src/config.js';
import { runPipeline } from '../src/index.js';
import { countWords, extractFrontmatter } from '../src/rubric/deterministic.js';

describe('CLI & Pipeline Orchestrator (config.ts & index.ts)', () => {
  const testDir = path.resolve(__dirname, 'sandbox_cli_' + Date.now());
  const outputDir = path.join(testDir, 'output');
  const evalDir = path.join(testDir, '.evaluations');
  const topicsFilePath = path.resolve(__dirname, '../data/seo_50_blog_topics.md');

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

  describe('parseCliArgs()', () => {
    it('parses --flag=value arguments correctly', () => {
      const args = [
        '--topic=5',
        '--slug=05_custom_slug',
        '--pillar=2',
        '--concurrency=4',
        '--output-dir=custom_out',
        '--eval-dir=custom_eval',
        '--topics-file=custom_topics.md',
        '--model=gemini-2.5-pro',
        '--max-retries=2',
        '--delay=500'
      ];
      const parsed = parseCliArgs(args);

      expect(parsed.topic).toBe(5);
      expect(parsed.slug).toBe('05_custom_slug');
      expect(parsed.pillar).toBe(2);
      expect(parsed.concurrency).toBe(4);
      expect(parsed.outputDir).toBe('custom_out');
      expect(parsed.evalDir).toBe('custom_eval');
      expect(parsed.topicsFile).toBe('custom_topics.md');
      expect(parsed.model).toBe('gemini-2.5-pro');
      expect(parsed.maxRetries).toBe(2);
      expect(parsed.delay).toBe(500);
    });

    it('parses space-separated short flags and boolean toggles', () => {
      const args = [
        '-t', '10',
        '-p', '3',
        '-c', '8',
        '-o', 'out_dir',
        '-e', 'eval_dir',
        '-f', 'topics.md',
        '--all',
        '--mock',
        '--force',
        '--dry-run'
      ];
      const parsed = parseCliArgs(args);

      expect(parsed.topic).toBe(10);
      expect(parsed.pillar).toBe(3);
      expect(parsed.concurrency).toBe(8);
      expect(parsed.outputDir).toBe('out_dir');
      expect(parsed.evalDir).toBe('eval_dir');
      expect(parsed.topicsFile).toBe('topics.md');
      expect(parsed.all).toBe(true);
      expect(parsed.mock).toBe(true);
      expect(parsed.force).toBe(true);
      expect(parsed.dryRun).toBe(true);
    });
  });

  describe('loadConfig()', () => {
    it('applies standard defaults when no arguments are provided', () => {
      const config = loadConfig();

      expect(config.concurrency).toBeGreaterThanOrEqual(1);
      expect(config.geminiModel).toBe('gemini-2.5-flash');
      expect(config.outputDir).toBe('output');
      expect(config.evalDir).toBe('.evaluations');
      expect(config.maxRetries).toBe(3);
      expect(config.requestDelayMs).toBe(1500);
    });

    it('overrides defaults with provided CLI options', () => {
      const config = loadConfig({
        topic: 12,
        concurrency: 5,
        mock: true,
        outputDir: 'test_output'
      });

      expect(config.targetTopicIndex).toBe(12);
      expect(config.concurrency).toBe(5);
      expect(config.mockLlm).toBe(true);
      expect(config.outputDir).toBe('test_output');
    });
  });

  describe('runPipeline() Execution', () => {
    it('executes single-topic pipeline (#1) with Mock LLM and produces approved >1,000 word post', async () => {
      const summary = await runPipeline({
        targetTopicIndex: 1,
        mockLlm: true,
        outputDir,
        evalDir,
        topicsFilePath
      });

      expect(summary.totalTopics).toBe(50);
      expect(summary.processedCount).toBe(1);
      expect(summary.approvedCount).toBe(1);
      expect(summary.reviewRequiredCount).toBe(0);

      // Verify file was written to disk
      const expectedPostPath = path.join(outputDir, '01_ai_crypto_trading_bot.md');
      expect(fs.existsSync(expectedPostPath)).toBe(true);

      const content = await fs.promises.readFile(expectedPostPath, 'utf-8');
      const wordCount = countWords(content);
      expect(wordCount).toBeGreaterThanOrEqual(1200); // Exceeds required 1000 words

      const fm = extractFrontmatter(content);
      expect(fm.status).toBe('approved');
      expect(fm.slug).toBe('01_ai_crypto_trading_bot');
      expect(fm.primary_keyword).toBe('AI crypto trading bot');

      // Verify evaluation audit file exists
      const expectedEvalPath = path.join(evalDir, '01_ai_crypto_trading_bot.eval.json');
      expect(fs.existsSync(expectedEvalPath)).toBe(true);

      // Verify summary_report.json
      const summaryFile = path.join(outputDir, 'summary_report.json');
      expect(fs.existsSync(summaryFile)).toBe(true);
      const summaryJson = JSON.parse(await fs.promises.readFile(summaryFile, 'utf-8'));
      expect(summaryJson.approved_count).toBe(1);
      expect(summaryJson.results).toHaveLength(1);
      expect(summaryJson.results[0].slug).toBe('01_ai_crypto_trading_bot');
    });

    it('handles dry-run mode without generating files or invoking LLM', async () => {
      const summary = await runPipeline({
        targetTopicIndex: 1,
        dryRun: true,
        outputDir,
        evalDir,
        topicsFilePath
      });

      expect(summary.totalTopics).toBe(50);
      expect(summary.processedCount).toBe(0);
      const expectedPostPath = path.join(outputDir, '01_ai_crypto_trading_bot.md');
      expect(fs.existsSync(expectedPostPath)).toBe(false);
    });

    it('demonstrates idempotency by skipping already approved posts on subsequent runs', async () => {
      // First run: generate and save Topic #2
      const firstRun = await runPipeline({
        targetTopicIndex: 2,
        mockLlm: true,
        outputDir,
        evalDir,
        topicsFilePath,
        force: false
      });
      expect(firstRun.approvedCount).toBe(1);
      expect(firstRun.skippedCount).toBe(0);

      // Second run without force: should skip
      const secondRun = await runPipeline({
        targetTopicIndex: 2,
        mockLlm: true,
        outputDir,
        evalDir,
        topicsFilePath,
        force: false
      });
      expect(secondRun.skippedCount).toBe(1);
      expect(secondRun.results[0].status).toBe('skipped');

      // Third run with force: should regenerate
      const thirdRun = await runPipeline({
        targetTopicIndex: 2,
        mockLlm: true,
        outputDir,
        evalDir,
        topicsFilePath,
        force: true
      });
      expect(thirdRun.approvedCount).toBe(1);
      expect(thirdRun.skippedCount).toBe(0);
    });

    it('filters and processes all topics in a specified pillar', async () => {
      const summary = await runPipeline({
        targetPillarId: 2, // Pillar 2 has 10 topics
        mockLlm: true,
        outputDir,
        evalDir,
        topicsFilePath,
        concurrency: 5,
        requestDelayMs: 0
      });

      expect(summary.processedCount).toBe(10);
      expect(summary.approvedCount).toBe(10);

      const files = await fs.promises.readdir(outputDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));
      expect(mdFiles).toHaveLength(10);
    });
  });
});
