import { Topic } from '../types.js';

export interface LoggerOptions {
  silent?: boolean;
  verbose?: boolean;
}

export class Logger {
  private silent: boolean;
  private verbose: boolean;

  constructor(options: LoggerOptions = {}) {
    this.silent = options.silent ?? false;
    this.verbose = options.verbose ?? true;
  }

  banner(title: string, subtitle?: string): void {
    if (this.silent) return;
    const border = '='.repeat(70);
    console.log(`\n${border}`);
    console.log(`  ${title.toUpperCase()}`);
    if (subtitle) {
      console.log(`  ${subtitle}`);
    }
    console.log(`${border}\n`);
  }

  info(msg: string): void {
    if (this.silent) return;
    console.log(`ℹ️  [INFO] ${msg}`);
  }

  success(msg: string): void {
    if (this.silent) return;
    console.log(`✅ [SUCCESS] ${msg}`);
  }

  warn(msg: string): void {
    if (this.silent) return;
    console.warn(`⚠️  [WARN] ${msg}`);
  }

  error(msg: string, err?: any): void {
    if (this.silent) return;
    console.error(`❌ [ERROR] ${msg}`);
    if (err && this.verbose) {
      if (err.stack) {
        console.error(`   ${err.stack}`);
      } else {
        console.error(`   ${String(err)}`);
      }
    }
  }

  step(stepName: string, detail?: string): void {
    if (this.silent || !this.verbose) return;
    const detailStr = detail ? ` - ${detail}` : '';
    console.log(`   ➔ [${stepName}]${detailStr}`);
  }

  topicStart(topic: Topic, current: number, total: number): void {
    if (this.silent) return;
    console.log(
      `\n----------------------------------------------------------------------\n` +
      `📌 [${current}/${total}] Topic #${topic.index}: "${topic.title}"\n` +
      `   Keyword: "${topic.primaryKeyword}" | Pillar: ${topic.pillarName} | Intent: ${topic.searchIntent}`
    );
  }

  topicProgress(topic: Topic, attempt: number, maxAttempts: number, message: string): void {
    if (this.silent || !this.verbose) return;
    console.log(`   [Topic #${topic.index} | Attempt ${attempt}/${maxAttempts}] ${message}`);
  }

  topicComplete(
    topic: Topic,
    result: {
      status: string;
      attempts: number;
      score: number;
      wordCount: number;
      durationMs?: number;
    }
  ): void {
    if (this.silent) return;
    const statusIcon = result.status === 'approved' ? '✅' : result.status === 'skipped' ? '⏩' : '⚠️';
    const durStr = result.durationMs ? ` in ${(result.durationMs / 1000).toFixed(1)}s` : '';
    console.log(
      `   ${statusIcon} Finished Topic #${topic.index} (${topic.slug}): ` +
      `Status=${result.status.toUpperCase()} | Score=${result.score.toFixed(1)}/100 | ` +
      `Words=${result.wordCount} | Attempts=${result.attempts}${durStr}`
    );
  }

  summaryTable(
    rows: Array<{
      index: number;
      slug: string;
      status: string;
      score: number;
      words: number;
      attempts: number;
    }>
  ): void {
    if (this.silent || rows.length === 0) return;

    console.log(`\n============================ EXECUTION SUMMARY ============================`);
    console.log(
      `${'#'.padEnd(4)} | ${'Slug'.padEnd(36)} | ${'Status'.padEnd(14)} | ${'Score'.padEnd(6)} | ${'Words'.padEnd(6)} | ${'Attempts'}`
    );
    console.log('-'.repeat(75));

    for (const r of rows) {
      const idxStr = String(r.index).padEnd(4);
      const slugStr = (r.slug.length > 36 ? r.slug.substring(0, 33) + '...' : r.slug).padEnd(36);
      const statusStr = r.status.padEnd(14);
      const scoreStr = r.score.toFixed(1).padEnd(6);
      const wordsStr = String(r.words).padEnd(6);
      console.log(`${idxStr} | ${slugStr} | ${statusStr} | ${scoreStr} | ${wordsStr} | ${r.attempts}`);
    }
    console.log('-'.repeat(75));
  }

  stats(stats: {
    total: number;
    approved: number;
    reviewRequired: number;
    skipped: number;
    totalDurationMs: number;
  }): void {
    if (this.silent) return;
    const minutes = (stats.totalDurationMs / 60000).toFixed(2);
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`   - Total Topics Processed:   ${stats.total}`);
    console.log(`   - Approved (Passed Rubric): ${stats.approved} (${((stats.approved / (stats.total || 1)) * 100).toFixed(1)}%)`);
    console.log(`   - Review Required (Failed): ${stats.reviewRequired}`);
    console.log(`   - Skipped (Already Done):   ${stats.skipped}`);
    console.log(`   - Total Execution Time:     ${minutes} minutes (${(stats.totalDurationMs / 1000).toFixed(1)}s)\n`);
  }
}

export const logger = new Logger();
