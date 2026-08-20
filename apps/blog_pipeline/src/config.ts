import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PipelineConfig, PipelineConfigSchema } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CliOptions {
  topic?: number;
  slug?: string;
  pillar?: number;
  all?: boolean;
  mock?: boolean;
  concurrency?: number;
  outputDir?: string;
  evalDir?: string;
  topicsFile?: string;
  force?: boolean;
  dryRun?: boolean;
  model?: string;
  maxRetries?: number;
  delay?: number;
  help?: boolean;
  version?: boolean;
}

/**
 * Parses simple .env file key-value pairs and assigns them to process.env if not already set.
 */
export function loadEnv(envPath?: string): void {
  const defaultPaths = [
    envPath,
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/blog_pipeline/.env.local'),
    path.resolve(process.cwd(), 'apps/blog_pipeline/.env')
  ].filter(Boolean) as string[];

  for (const filePath of defaultPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            // Strip outer quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Ignore reading errors for optional env files
    }
  }
}

/**
 * Robust command line argument parser supporting --flag=value, --flag value, and boolean toggles.
 */
export function parseCliArgs(args: string[] = process.argv.slice(2)): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--all' || arg === '-a') {
      options.all = true;
    } else if (arg === '--mock' || arg === '-m') {
      options.mock = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--topic=')) {
      options.topic = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--topic' || arg === '-t') {
      options.topic = parseInt(args[++i], 10);
    } else if (arg.startsWith('--slug=')) {
      options.slug = arg.split('=')[1];
    } else if (arg === '--slug') {
      options.slug = args[++i];
    } else if (arg.startsWith('--pillar=')) {
      options.pillar = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--pillar' || arg === '-p') {
      options.pillar = parseInt(args[++i], 10);
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--concurrency' || arg === '-c') {
      options.concurrency = parseInt(args[++i], 10);
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.split('=')[1];
    } else if (arg === '--output-dir' || arg === '-o') {
      options.outputDir = args[++i];
    } else if (arg.startsWith('--eval-dir=')) {
      options.evalDir = arg.split('=')[1];
    } else if (arg === '--eval-dir' || arg === '-e') {
      options.evalDir = args[++i];
    } else if (arg.startsWith('--topics-file=')) {
      options.topicsFile = arg.split('=')[1];
    } else if (arg === '--topics-file' || arg === '-f') {
      options.topicsFile = args[++i];
    } else if (arg.startsWith('--model=')) {
      options.model = arg.split('=')[1];
    } else if (arg === '--model') {
      options.model = args[++i];
    } else if (arg.startsWith('--max-retries=')) {
      options.maxRetries = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--max-retries') {
      options.maxRetries = parseInt(args[++i], 10);
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--delay') {
      options.delay = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * Loads configuration from environment variables and overrides with CLI flags.
 * Validates the resulting configuration against PipelineConfigSchema.
 */
export function loadConfig(cliOptions?: CliOptions): PipelineConfig {
  loadEnv();

  const rawConfig = {
    geminiApiKey:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY,
    geminiModel: cliOptions?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    concurrency:
      cliOptions?.concurrency !== undefined
        ? cliOptions.concurrency
        : process.env.PIPELINE_CONCURRENCY
        ? parseInt(process.env.PIPELINE_CONCURRENCY, 10)
        : 2,
    maxRetries:
      cliOptions?.maxRetries !== undefined
        ? cliOptions.maxRetries
        : process.env.PIPELINE_MAX_RETRIES
        ? parseInt(process.env.PIPELINE_MAX_RETRIES, 10)
        : 3,
    requestDelayMs:
      cliOptions?.delay !== undefined
        ? cliOptions.delay
        : process.env.REQUEST_DELAY_MS
        ? parseInt(process.env.REQUEST_DELAY_MS, 10)
        : 1500,
    mockLlm:
      cliOptions?.mock === true ||
      process.env.MOCK_LLM === 'true' ||
      process.env.NODE_ENV === 'test',
    topicsFilePath:
      cliOptions?.topicsFile ||
      process.env.TOPICS_FILE_PATH ||
      findDefaultTopicsFilePath(),
    outputDir: cliOptions?.outputDir || process.env.OUTPUT_DIR || 'output',
    evalDir: cliOptions?.evalDir || process.env.EVAL_DIR || '.evaluations',
    targetTopicIndex: cliOptions?.topic,
    targetPillarId: cliOptions?.pillar,
    targetSlug: cliOptions?.slug,
    force: cliOptions?.force === true || process.env.FORCE_REGENERATE === 'true',
    dryRun: cliOptions?.dryRun === true,
    runAll: cliOptions?.all === true
  };

  return PipelineConfigSchema.parse(rawConfig);
}

/**
 * Locates the default seo_50_blog_topics.md file across standard project paths.
 */
function findDefaultTopicsFilePath(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), 'data/seo_50_blog_topics.md'),
    path.resolve(process.cwd(), 'apps/blog_pipeline/data/seo_50_blog_topics.md'),
    path.resolve(__dirname, '../data/seo_50_blog_topics.md')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'data/seo_50_blog_topics.md';
}

/**
 * Displays CLI usage and available options.
 */
export function printHelp(): void {
  console.log(`
HeroPips SEO Content Production Pipeline (50 Topics Batch Runner)

USAGE:
  npx tsx src/index.ts [options]
  npm start -- [options]

OPTIONS:
  --topic=<index>, -t <index>       Run pipeline for a specific topic index (1-50)
  --slug=<slug>                     Run pipeline for a specific topic slug
  --pillar=<id>, -p <id>            Run pipeline for all topics in a pillar (1-5)
  --all, -a                         Run pipeline across all 50 topics (default if no topic specified)
  --mock, -m                        Run offline with deterministic institutional Mock LLM
  --concurrency=<N>, -c <N>         Number of concurrent topic workers (default: 2)
  --output-dir=<path>, -o <path>    Output directory for approved Markdown posts (default: output)
  --eval-dir=<path>, -e <path>      Directory for rubric evaluation JSON audits (default: .evaluations)
  --topics-file=<path>, -f <path>   Path to topics markdown file (default: data/seo_50_blog_topics.md)
  --model=<name>                    Gemini model (default: gemini-2.5-flash)
  --max-retries=<N>                 Maximum refinement attempts per topic (default: 3)
  --delay=<ms>                      Delay between requests in ms (default: 1500)
  --force                           Force regeneration of already approved topics
  --dry-run                         Parse and display topics without generating content
  --help, -h                        Display this help message
  --version, -v                     Display version number

EXAMPLES:
  # Run a single topic with deterministic mock LLM
  npx tsx src/index.ts --topic=1 --mock

  # Run all topics in Pillar 1
  npx tsx src/index.ts --pillar=1 --mock

  # Run the full 50-topic production batch with concurrency 4
  npx tsx src/index.ts --all --concurrency=4
`);
}
