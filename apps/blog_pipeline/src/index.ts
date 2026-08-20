import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Re-export all sub-modules
export * from './types.js';
export * from './parser/topicParser.js';
export * from './rubric/deterministic.js';
export * from './rubric/institutionalGrade.js';
export * from './llm/client.js';
export * from './llm/mockClient.js';
export * from './llm/generator.js';
export * from './llm/judge.js';
export * from './llm/refiner.js';
export * from './storage/writer.js';
export * from './utils/rateLimiter.js';
export * from './utils/logger.js';
export * from './config.js';

import { Topic, PipelineConfig } from './types.js';
import { parseBlogTopics } from './parser/topicParser.js';
import { createLlmClient } from './llm/client.js';
import { executeGenerationAndEvaluationLoop } from './llm/refiner.js';
import { saveApprovedPost, isPostAlreadyApproved } from './storage/writer.js';
import { executeWithRetry, runWithConcurrencyLimit } from './utils/rateLimiter.js';
import { logger } from './utils/logger.js';
import { parseCliArgs, loadConfig, printHelp } from './config.js';
import { countWords, extractFrontmatter } from './rubric/deterministic.js';

export interface TopicExecutionResult {
  topic: Topic;
  status: 'approved' | 'needs_manual_review' | 'skipped' | 'error';
  attempts: number;
  score: number;
  wordCount: number;
  postPath?: string;
  evalPath?: string;
  durationMs: number;
  error?: string;
}

export interface PipelineSummary {
  totalTopics: number;
  processedCount: number;
  approvedCount: number;
  reviewRequiredCount: number;
  skippedCount: number;
  totalDurationMs: number;
  results: TopicExecutionResult[];
  summaryReportPath: string;
}

/**
 * Main programmatic runner for the Content Production Pipeline.
 */
export async function runPipeline(userConfig?: Partial<PipelineConfig>): Promise<PipelineSummary> {
  const config = loadConfig(userConfig as any);
  const startTime = Date.now();

  logger.banner(
    'HeroPips Content Production Pipeline',
    `Target: 50 SEO Blog Topics | Model: ${config.geminiModel} | Concurrency: ${config.concurrency} | Mock: ${config.mockLlm}`
  );

  // 1. Parse and validate topics from markdown source
  logger.info(`Loading topic catalog from: ${config.topicsFilePath}`);
  if (!fs.existsSync(config.topicsFilePath)) {
    throw new Error(`Topics source file not found at: ${config.topicsFilePath}`);
  }

  const allTopics = parseBlogTopics(config.topicsFilePath);
  logger.info(`Successfully parsed ${allTopics.length} topics across 5 pillars.`);

  // 2. Filter topics based on execution criteria
  let topicsToRun = [...allTopics];

  if (config.targetTopicIndex !== undefined) {
    topicsToRun = allTopics.filter((t) => t.index === config.targetTopicIndex);
    if (topicsToRun.length === 0) {
      throw new Error(`Topic index #${config.targetTopicIndex} not found in catalog (range 1-50).`);
    }
  } else if (config.targetPillarId !== undefined) {
    topicsToRun = allTopics.filter((t) => t.pillarId === config.targetPillarId);
    if (topicsToRun.length === 0) {
      throw new Error(`Pillar ID #${config.targetPillarId} not found in catalog (range 1-5).`);
    }
  } else if (config.targetSlug) {
    topicsToRun = allTopics.filter((t) => t.slug === config.targetSlug);
    if (topicsToRun.length === 0) {
      throw new Error(`Topic slug "${config.targetSlug}" not found in catalog.`);
    }
  }

  logger.info(`Selected ${topicsToRun.length} topic(s) for pipeline execution.`);

  // If dry-run, output topic list and exit early
  if (config.dryRun) {
    logger.info('Dry-run enabled: skipping generation and evaluation.');
    for (const t of topicsToRun) {
      console.log(` - Topic #${t.index}: ${t.slug} (Pillar ${t.pillarId}: ${t.primaryKeyword})`);
    }
    return {
      totalTopics: allTopics.length,
      processedCount: 0,
      approvedCount: 0,
      reviewRequiredCount: 0,
      skippedCount: 0,
      totalDurationMs: Date.now() - startTime,
      results: [],
      summaryReportPath: ''
    };
  }

  // 3. Initialize LLM Client
  const client = createLlmClient(config);

  // 4. Ensure output & eval directories exist
  await fs.promises.mkdir(config.outputDir, { recursive: true });
  await fs.promises.mkdir(config.evalDir, { recursive: true });

  // 5. Worker task processor for a single topic
  const processSingleTopic = async (topic: Topic, currentIndex: number, total: number): Promise<TopicExecutionResult> => {
    const topicStartTime = Date.now();

    // Check idempotency checkpoint
    if (!config.force && (await isPostAlreadyApproved(config.outputDir, topic, config.evalDir))) {
      const postPath = path.join(config.outputDir, `${topic.slug}.md`);
      const evalPath = path.join(config.evalDir, `${topic.slug}.eval.json`);
      let existingScore = 90;
      let existingWords = 1400;

      try {
        const postContent = await fs.promises.readFile(postPath, 'utf-8');
        existingWords = countWords(postContent);
        const fm = extractFrontmatter(postContent);
        if (fm.evaluation_score) existingScore = Number(fm.evaluation_score);
      } catch {
        // Fallback to defaults
      }

      logger.topicComplete(topic, {
        status: 'skipped',
        attempts: 0,
        score: existingScore,
        wordCount: existingWords,
        durationMs: 0
      });

      return {
        topic,
        status: 'skipped',
        attempts: 0,
        score: existingScore,
        wordCount: existingWords,
        postPath,
        evalPath,
        durationMs: 0
      };
    }

    logger.topicStart(topic, currentIndex, total);

    try {
      // Execute the Generation & LLM-as-a-Judge Refinement Loop with 429 retry protection
      const loopResult = await executeWithRetry(
        async () => {
          return await executeGenerationAndEvaluationLoop(client, topic, {
            maxRetries: Math.max(0, config.maxRetries - 1),
            onAttemptComplete: (attempt, _draft, evalRes) => {
              logger.topicProgress(
                topic,
                attempt,
                config.maxRetries,
                `Evaluation Score: ${evalRes.overall_score.toFixed(1)}/100 | Passed: ${evalRes.passed}`
              );
            }
          });
        },
        {
          maxRetries: 3,
          initialDelayMs: 1500,
          onRetry: (err, attempt, delay) => {
            logger.warn(
              `Rate limit / network glitch on Topic #${topic.index} (${topic.slug}). Retrying in ${delay}ms (Attempt ${attempt}/3)... [${err.message || err}]`
            );
          }
        }
      );

      // Save formatted article with frontmatter and save evaluation JSON
      const saveRes = await saveApprovedPost({
        outputDir: config.outputDir,
        evalDir: config.evalDir,
        topic,
        content: loopResult.finalDraft,
        evaluation: loopResult.finalEvaluation,
        modelUsed: config.geminiModel
      });

      const durationMs = Date.now() - topicStartTime;
      const status = loopResult.isApproved ? 'approved' : 'needs_manual_review';

      logger.topicComplete(topic, {
        status,
        attempts: loopResult.attempts,
        score: saveRes.score,
        wordCount: saveRes.wordCount,
        durationMs
      });

      return {
        topic,
        status: status as 'approved' | 'needs_manual_review',
        attempts: loopResult.attempts,
        score: saveRes.score,
        wordCount: saveRes.wordCount,
        postPath: saveRes.postPath,
        evalPath: saveRes.evalPath,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - topicStartTime;
      logger.error(`Failed to process Topic #${topic.index} (${topic.slug}): ${err.message || err}`, err);
      return {
        topic,
        status: 'error',
        attempts: 1,
        score: 0,
        wordCount: 0,
        durationMs,
        error: err.message || String(err)
      };
    }
  };

  // 6. Run all topics with rate limiting and concurrency management
  const executionResults = await runWithConcurrencyLimit(
    topicsToRun,
    config.concurrency,
    (topic, idx) => processSingleTopic(topic, idx + 1, topicsToRun.length),
    config.requestDelayMs
  );

  const totalDurationMs = Date.now() - startTime;

  // 7. Calculate aggregate statistics
  const approvedCount = executionResults.filter((r) => r.status === 'approved').length;
  const reviewRequiredCount = executionResults.filter((r) => r.status === 'needs_manual_review' || r.status === 'error').length;
  const skippedCount = executionResults.filter((r) => r.status === 'skipped').length;

  // 8. Generate Summary Report JSON
  const summaryReport = {
    generated_at: new Date().toISOString(),
    total_topics_in_catalog: allTopics.length,
    topics_targeted: topicsToRun.length,
    approved_count: approvedCount,
    review_required_count: reviewRequiredCount,
    skipped_count: skippedCount,
    total_duration_seconds: Math.round(totalDurationMs / 1000),
    pipeline_configuration: {
      model: config.geminiModel,
      mock_llm: config.mockLlm,
      concurrency: config.concurrency,
      max_retries: config.maxRetries,
      output_dir: config.outputDir,
      eval_dir: config.evalDir
    },
    results: executionResults.map((r) => ({
      index: r.topic.index,
      pillar: r.topic.pillarName,
      slug: r.topic.slug,
      primary_keyword: r.topic.primaryKeyword,
      status: r.status,
      score: r.score,
      word_count: r.wordCount,
      attempts: r.attempts,
      duration_seconds: Number((r.durationMs / 1000).toFixed(2)),
      post_path: r.postPath,
      eval_path: r.evalPath,
      error: r.error
    }))
  };

  const summaryReportPath = path.join(config.outputDir, 'summary_report.json');
  await fs.promises.writeFile(summaryReportPath, JSON.stringify(summaryReport, null, 2), 'utf-8');

  // 9. Log final table and summary stats
  logger.summaryTable(
    executionResults.map((r) => ({
      index: r.topic.index,
      slug: r.topic.slug,
      status: r.status,
      score: r.score,
      words: r.wordCount,
      attempts: r.attempts
    }))
  );

  logger.stats({
    total: topicsToRun.length,
    approved: approvedCount,
    reviewRequired: reviewRequiredCount,
    skipped: skippedCount,
    totalDurationMs
  });

  logger.success(`Pipeline run complete. Summary report saved to: ${summaryReportPath}`);

  return {
    totalTopics: allTopics.length,
    processedCount: topicsToRun.length,
    approvedCount,
    reviewRequiredCount,
    skippedCount,
    totalDurationMs,
    results: executionResults,
    summaryReportPath
  };
}

/**
 * CLI Entrypoint Function
 */
export async function main(): Promise<void> {
  const cliArgs = parseCliArgs();

  if (cliArgs.help) {
    printHelp();
    process.exit(0);
  }

  if (cliArgs.version) {
    console.log('HeroPips Blog Pipeline v1.0.0');
    process.exit(0);
  }

  try {
    const summary = await runPipeline(cliArgs as any);
    if (summary.reviewRequiredCount > 0) {
      process.exitCode = 1;
    }
  } catch (error: any) {
    logger.error(`Pipeline execution failed: ${error.message || error}`, error);
    process.exit(1);
  }
}

// Auto-run if executed directly as a script
if (process.argv[1] && !process.env.VITEST && process.env.NODE_ENV !== 'test') {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const invokedScript = fs.existsSync(process.argv[1]) ? fs.realpathSync(process.argv[1]) : process.argv[1];
    if (
      thisFile === invokedScript ||
      process.argv[1].endsWith('src/index.ts') ||
      process.argv[1].endsWith('src/index.js')
    ) {
      main();
    }
  } catch {
    // If path resolution fails, avoid crash
  }
}

