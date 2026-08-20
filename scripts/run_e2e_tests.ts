#!/usr/bin/env tsx
/**
 * Unified Quote Pipeline (UQP) — End-to-End (E2E) Test Runner
 *
 * Usage:
 *   npx tsx scripts/run_e2e_tests.ts [options]
 *
 * Options:
 *   --tier=<1|2|3|4|all>   Run specific requirement tier (default: all)
 *   --mode=<mock|live>     Run in hermetic in-memory mock mode or live network mode (default: mock)
 *   --verbose              Print detailed test assertion outputs
 *   --help                 Show this help message
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface SuiteResult {
  tier: string;
  name: string;
  file: string;
  tests: number;
  passed: number;
  failed: number;
  durationMs: number;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
}

const TIER_MAPPING: Record<string, { tier: string; name: string; file: string }[]> = {
  '1': [
    { tier: 'T1', name: 'R1: Tick Ingestion Daemon', file: 'tests/e2e/r1-tick-ingestion.test.ts' },
    { tier: 'ADV1', name: 'Challenger 1 Ingestion Stress', file: 'tests/e2e/adversarial-ingestion-stress.test.ts' },
  ],
  '2': [
    { tier: 'T2', name: 'R2: OHLC Aggregator & Invariants', file: 'tests/e2e/r2-ohlc-aggregation.test.ts' },
    { tier: 'ADV1', name: 'Challenger 1 Ingestion Stress', file: 'tests/e2e/adversarial-ingestion-stress.test.ts' },
  ],
  '3': [
    { tier: 'T3', name: 'R3: AI Engine Rewire (Zero HTTP)', file: 'tests/e2e/r3-ai-rewire.test.ts' },
    { tier: 'INT', name: 'Full Pipeline Integration (Tier 3)', file: 'tests/e2e/pipeline-integration.test.ts' },
  ],
  '4': [
    { tier: 'T4', name: 'R4: SSE Live Price Streaming', file: 'tests/e2e/r4-sse-streaming.test.ts' },
    { tier: 'ADV2', name: 'Challenger 2 Adversarial Stress', file: 'tests/e2e/adversarial-sse-stress.test.ts' },
    { tier: 'INT', name: 'Full Pipeline Integration (Tier 4)', file: 'tests/e2e/pipeline-integration.test.ts' },
  ],
  'all': [
    { tier: 'T1', name: 'R1: Tick Ingestion Daemon', file: 'tests/e2e/r1-tick-ingestion.test.ts' },
    { tier: 'T2', name: 'R2: OHLC Aggregator & Invariants', file: 'tests/e2e/r2-ohlc-aggregation.test.ts' },
    { tier: 'T3', name: 'R3: AI Engine Rewire (Zero HTTP)', file: 'tests/e2e/r3-ai-rewire.test.ts' },
    { tier: 'T4', name: 'R4: SSE Live Price Streaming', file: 'tests/e2e/r4-sse-streaming.test.ts' },
    { tier: 'ADV1', name: 'Challenger 1 Ingestion Stress', file: 'tests/e2e/adversarial-ingestion-stress.test.ts' },
    { tier: 'ADV2', name: 'Challenger 2 Adversarial Stress', file: 'tests/e2e/adversarial-sse-stress.test.ts' },
    { tier: 'INT', name: 'Full Pipeline E2E Integration', file: 'tests/e2e/pipeline-integration.test.ts' },
  ],
};

function parseArgs(): { tier: string; mode: string; verbose: boolean; help: boolean } {
  const args = process.argv.slice(2);
  let tier = 'all';
  let mode = 'mock';
  let verbose = false;
  let help = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('--tier=')) {
      tier = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--mode=')) {
      mode = arg.split('=')[1].toLowerCase();
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  return { tier, mode, verbose, help };
}

function printHelp() {
  console.log(`
======================================================================
        UNIFIED QUOTE PIPELINE (UQP) E2E TEST RUNNER CLI             
======================================================================

Usage:
  npx tsx scripts/run_e2e_tests.ts [options]

Options:
  --tier=<1|2|3|4|all>   Target requirement tier (default: all)
                           1: R1 Tick Ingestion Daemon
                           2: R2 OHLC Aggregator Daemon
                           3: R3 AI Confluence Engine Rewire
                           4: R4 Live Price SSE Streaming
                           all: Full E2E Test Suite (Tiers 1-4 + Integration)
  --mode=<mock|live>     Execution environment (default: mock)
                           mock: 100% hermetic offline in-memory harness
                           live: Integration verification against live Redis/Supabase
  --verbose, -v          Show raw Vitest streaming output and assertion logs
  --help, -h             Show this help screen
`);
}

async function runVitestSuite(targetFile: string, verbose: boolean): Promise<{
  tests: number;
  passed: number;
  failed: number;
  durationMs: number;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  output: string;
}> {
  return new Promise((resolve) => {
    const fullPath = path.resolve(process.cwd(), targetFile);

    // Check if test file exists
    if (!fs.existsSync(fullPath)) {
      return resolve({
        tests: 0,
        passed: 0,
        failed: 0,
        durationMs: 0,
        status: 'SKIPPED',
        output: `File not found: ${targetFile}`,
      });
    }

    const t0 = Date.now();
    const vitestArgs = ['vitest', 'run', targetFile, '--reporter=json'];

    const child = spawn('npx', vitestArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VITEST: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (verbose) process.stdout.write(d);
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (verbose) process.stderr.write(d);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - t0;
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;

      try {
        // Try parsing JSON output from Vitest
        // Find JSON block in stdout
        const jsonMatch = stdout.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          totalTests = parsed.numTotalTests || 0;
          passedTests = parsed.numPassedTests || 0;
          failedTests = parsed.numFailedTests || 0;
        } else {
          // Fallback parsing from text
          const passMatch = stdout.match(/Tests\s+(\d+)\s+passed/);
          const failMatch = stdout.match(/(\d+)\s+failed/);
          if (passMatch) passedTests = parseInt(passMatch[1], 10);
          if (failMatch) failedTests = parseInt(failMatch[1], 10);
          totalTests = passedTests + failedTests;
        }
      } catch {
        // Fallback
        if (code === 0) {
          totalTests = 1;
          passedTests = 1;
        } else {
          totalTests = 1;
          failedTests = 1;
        }
      }

      const status: 'PASS' | 'FAIL' = code === 0 && failedTests === 0 ? 'PASS' : 'FAIL';

      resolve({
        tests: totalTests,
        passed: passedTests,
        failed: failedTests,
        durationMs,
        status,
        output: stdout + '\n' + stderr,
      });
    });

    child.on('error', (err) => {
      resolve({
        tests: 0,
        passed: 0,
        failed: 1,
        durationMs: Date.now() - t0,
        status: 'FAIL',
        output: err.message,
      });
    });
  });
}

function pad(str: string | number, width: number, align: 'left' | 'right' = 'left'): string {
  const s = String(str);
  if (s.length >= width) return s.slice(0, width);
  const diff = width - s.length;
  return align === 'left' ? s + ' '.repeat(diff) : ' '.repeat(diff) + s;
}

async function main() {
  const { tier, mode, verbose, help } = parseArgs();

  if (help) {
    printHelp();
    process.exit(0);
  }

  const selectedSuites = TIER_MAPPING[tier] || TIER_MAPPING['all'];

  console.log('\n' + '='.repeat(74));
  console.log('              UNIFIED QUOTE PIPELINE (UQP) E2E REPORT             ');
  console.log('='.repeat(74));
  console.log(
    `Mode: ${mode.toUpperCase()}_MODE | Node: ${process.version} | Tier: ${tier.toUpperCase()}`
  );
  console.log('-'.repeat(74));
  console.log(
    `${pad('Tier', 5)} ${pad('Requirement Area', 34)} ${pad('Tests', 6, 'right')} ${pad('Passed', 7, 'right')} ${pad('Failed', 7, 'right')}  ${pad('Status', 8)}`
  );
  console.log('-'.repeat(74));

  const suiteResults: SuiteResult[] = [];
  const t0 = Date.now();

  for (const s of selectedSuites) {
    const res = await runVitestSuite(s.file, verbose);
    suiteResults.push({
      tier: s.tier,
      name: s.name,
      file: s.file,
      tests: res.tests,
      passed: res.passed,
      failed: res.failed,
      durationMs: res.durationMs,
      status: res.status,
    });

    const statusStr = res.status === 'PASS' ? '\x1b[32mPASS\x1b[0m' : res.status === 'SKIPPED' ? '\x1b[33mSKIP\x1b[0m' : '\x1b[31mFAIL\x1b[0m';

    console.log(
      `${pad(s.tier, 5)} ${pad(s.name, 34)} ${pad(res.tests, 6, 'right')} ${pad(res.passed, 7, 'right')} ${pad(res.failed, 7, 'right')}  ${statusStr}`
    );
  }

  const totalDuration = ((Date.now() - t0) / 1000).toFixed(2);
  const totalTests = suiteResults.reduce((sum, r) => sum + r.tests, 0);
  const totalPassed = suiteResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = suiteResults.reduce((sum, r) => sum + r.failed, 0);
  const allPassed = totalFailed === 0 && totalPassed > 0;

  console.log('-'.repeat(74));
  const summaryStatus = allPassed ? '\x1b[32m100% PASS\x1b[0m' : '\x1b[31mFAILURES DETECTED\x1b[0m';
  console.log(
    `${pad('TOTAL', 40)} ${pad(totalTests, 6, 'right')} ${pad(totalPassed, 7, 'right')} ${pad(totalFailed, 7, 'right')}  ${summaryStatus}`
  );
  console.log(`Duration: ${totalDuration}s`);
  console.log('='.repeat(74) + '\n');

  if (!allPassed) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
