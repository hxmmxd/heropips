import fs from 'fs';
import path from 'path';
import os from 'os';
import { SAMPLE_PASSING_EVALUATION, SAMPLE_FAILING_EVALUATION, RubricEvaluationResult } from './fixtures/sample_evaluations';
import { TopicFixture } from './fixtures/topics.fixture';

/**
 * Strips YAML frontmatter from a markdown string.
 */
export function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith('---')) {
    const end = markdown.indexOf('\n---', 3);
    if (end !== -1) {
      return markdown.slice(end + 4).trim();
    }
  }
  return markdown.trim();
}

/**
 * Counts body words in a Markdown document (excluding frontmatter and markdown code delimiters).
 */
export function countWords(markdown: string): number {
  const body = stripFrontmatter(markdown);
  // Remove markdown code fences and special tokens
  const cleanBody = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`_~>[\]()|\\+=$-]/g, ' ')
    .trim();

  if (!cleanBody) return 0;
  const words = cleanBody.split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Extracts YAML frontmatter as key-value pairs.
 */
export function extractFrontmatter(markdown: string): Record<string, any> {
  if (!markdown.startsWith('---')) return {};
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return {};

  const frontmatterStr = markdown.slice(3, end).trim();
  const lines = frontmatterStr.split('\n');
  const result: Record<string, any> = {};

  let currentKey = '';
  let inArray = false;
  let arrayValues: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inArray) {
      if (trimmed.startsWith('- ')) {
        arrayValues.push(trimmed.slice(2).replace(/^["']|["']$/g, '').trim());
        continue;
      } else {
        result[currentKey] = arrayValues;
        inArray = false;
        arrayValues = [];
      }
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (val === '') {
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        let parsedVal: any = val.replace(/^["']|["']$/g, '');
        if (parsedVal === 'true') parsedVal = true;
        else if (parsedVal === 'false') parsedVal = false;
        else if (!isNaN(Number(parsedVal)) && parsedVal !== '') parsedVal = Number(parsedVal);
        result[key] = parsedVal;
      }
    }
  }

  if (inArray && currentKey) {
    result[currentKey] = arrayValues;
  }

  return result;
}

/**
 * Validates markdown structural components and heading hierarchy.
 */
export function validateMarkdownStructure(markdown: string) {
  const errors: string[] = [];
  const hasFrontmatter = markdown.startsWith('---') && markdown.indexOf('\n---', 3) !== -1;

  const lines = markdown.split('\n');
  const headings: Array<{ level: number; text: string; line: number }> = [];
  let tableCount = 0;
  let hasFaq = false;
  let hasDisclaimer = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        headings.push({ level, text, line: i + 1 });

        if (text.toLowerCase().includes('frequently asked questions') || text.toLowerCase().includes('faq')) {
          hasFaq = true;
        }
      }
    }

    if (line.includes('| --- |') || line.includes('| :--- |') || line.includes('| :---: |') || line.includes('| ---: |')) {
      tableCount++;
    }

    if (line.toLowerCase().includes('disclaimer') || line.toLowerCase().includes('does not constitute financial')) {
      hasDisclaimer = true;
    }
  }

  const h1List = headings.filter((h) => h.level === 1);
  const h2List = headings.filter((h) => h.level === 2);
  const h3List = headings.filter((h) => h.level === 3);

  if (h1List.length !== 1) {
    errors.push(`Expected exactly 1 H1 heading, found ${h1List.length}`);
  }

  if (h2List.length < 4) {
    errors.push(`Expected at least 4 H2 headings, found ${h2List.length}`);
  }

  // Hierarchy check: No heading should jump levels (e.g., H1 -> H3 without H2)
  let isValidHierarchy = true;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    if (curr > prev + 1) {
      isValidHierarchy = false;
      errors.push(`Invalid heading jump from H${prev} to H${curr} at line ${headings[i].line}`);
    }
  }

  return {
    hasFrontmatter,
    h1Count: h1List.length,
    h2Count: h2List.length,
    h3Count: h3List.length,
    tableCount,
    hasFaq,
    hasDisclaimer,
    isValidHierarchy: isValidHierarchy && errors.length === 0,
    errors
  };
}

/**
 * Computes canonical slug from index and keyword: {padZero2(index)}_{snake_case(keyword)}
 */
export function generateCanonicalSlug(index: number, keyword: string): string {
  const paddedIndex = String(index).padStart(2, '0');
  const cleanKeyword = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${paddedIndex}_${cleanKeyword}`;
}

/**
 * Calculates weighted composite score from dimension scores.
 */
export function calculateCompositeScore(
  dimensions: Record<string, { score: number; weight: number }>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of Object.values(dimensions)) {
    weightedSum += dim.score * dim.weight;
    totalWeight += dim.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Validates a Topic object against the specification schema.
 */
export function validateTopicSchema(topic: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!topic || typeof topic !== 'object') {
    return { valid: false, errors: ['Topic must be a non-null object'] };
  }

  if (typeof topic.index !== 'number' || topic.index < 1 || topic.index > 50) {
    errors.push(`Topic index must be an integer between 1 and 50, got ${topic.index}`);
  }
  if (typeof topic.pillarId !== 'number' || topic.pillarId < 1 || topic.pillarId > 5) {
    errors.push(`Topic pillarId must be an integer between 1 and 5, got ${topic.pillarId}`);
  }
  if (!topic.pillarName || typeof topic.pillarName !== 'string') {
    errors.push('Topic pillarName must be a non-empty string');
  }
  if (!topic.primaryKeyword || typeof topic.primaryKeyword !== 'string') {
    errors.push('Topic primaryKeyword must be a non-empty string');
  }
  if (!topic.title || typeof topic.title !== 'string') {
    errors.push('Topic title must be a non-empty string');
  }
  const validIntents = ['Transactional', 'Educational', 'Informational', 'Commercial'];
  if (!validIntents.includes(topic.searchIntent)) {
    errors.push(`Topic searchIntent must be one of ${validIntents.join(', ')}, got ${topic.searchIntent}`);
  }
  if (!topic.slug || typeof topic.slug !== 'string' || !/^\d{2}_[a-z0-9_]+$/.test(topic.slug)) {
    errors.push(`Topic slug must match format XX_slug_name, got ${topic.slug}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a RubricEvaluationResult against the specification schema.
 */
export function validateRubricEvaluationSchema(evaluation: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!evaluation || typeof evaluation !== 'object') {
    return { valid: false, errors: ['Evaluation must be an object'] };
  }

  if (!evaluation.evaluation_timestamp) errors.push('Missing evaluation_timestamp');
  if (typeof evaluation.topic_slug !== 'string') errors.push('Missing or invalid topic_slug');
  if (typeof evaluation.overall_score !== 'number' || evaluation.overall_score < 0 || evaluation.overall_score > 100) {
    errors.push('overall_score must be a number between 0 and 100');
  }
  if (typeof evaluation.passed !== 'boolean') errors.push('passed must be a boolean');

  if (!evaluation.hard_gates || typeof evaluation.hard_gates !== 'object') {
    errors.push('Missing hard_gates object');
  } else {
    const requiredGates = [
      'min_word_count_met',
      'no_critical_factual_errors',
      'no_hyperbolic_marketing_fluff',
      'valid_markdown_hierarchy',
      'no_llm_boilerplate_artifacts'
    ];
    for (const gate of requiredGates) {
      if (typeof evaluation.hard_gates[gate] !== 'boolean') {
        errors.push(`hard_gates.${gate} must be a boolean`);
      }
    }
  }

  if (!evaluation.dimension_scores || typeof evaluation.dimension_scores !== 'object') {
    errors.push('Missing dimension_scores object');
  } else {
    const requiredDimensions = [
      'institutional_tone',
      'financial_crypto_accuracy',
      'word_count_depth',
      'markdown_structure',
      'seo_optimization',
      'readability_formatting'
    ];
    for (const dim of requiredDimensions) {
      const d = evaluation.dimension_scores[dim];
      if (!d || typeof d !== 'object' || typeof d.score !== 'number' || typeof d.passed !== 'boolean') {
        errors.push(`dimension_scores.${dim} is missing or invalid`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Clean JSON parser and repair utility for LLM responses.
 */
export function extractAndParseJson<T = any>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt basic repair: remove trailing commas before closing braces/brackets
    const repaired = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    return JSON.parse(repaired);
  }
}

/**
 * Options for LLM Generation
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

/**
 * Unified LLM Client Interface Contract
 */
export interface LlmClient {
  generateContent(prompt: string, options?: GenerationOptions): Promise<string>;
}

/**
 * Comprehensive Mock LLM Client Test Double for offline E2E verification.
 */
export class MockLlmClient implements LlmClient {
  public callCount = 0;
  public callHistory: Array<{ prompt: string; options?: GenerationOptions; response: string }> = [];
  private responses: string[] = [];
  private defaultResponse: string = '';
  private scenario: 'default' | 'fail_then_pass' | 'always_fail' | 'rate_limit_once' | 'malformed_json' = 'default';
  private rateLimitTriggered = false;

  constructor(defaultResponse?: string) {
    if (defaultResponse) {
      this.defaultResponse = defaultResponse;
    }
  }

  public setScenario(
    scenario: 'default' | 'fail_then_pass' | 'always_fail' | 'rate_limit_once' | 'malformed_json'
  ) {
    this.scenario = scenario;
  }

  public queueResponse(response: string) {
    this.responses.push(response);
  }

  public async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    this.callCount++;

    if (this.scenario === 'rate_limit_once' && !this.rateLimitTriggered) {
      this.rateLimitTriggered = true;
      const error: any = new Error('HTTP 429: Resource has been exhausted (rate limit exceeded)');
      error.status = 429;
      throw error;
    }

    let response = '';

    if (this.responses.length > 0) {
      response = this.responses.shift()!;
    } else if (options?.jsonMode || prompt.includes('RubricEvaluationResult') || prompt.includes('Chief Editorial Auditor')) {
      // Evaluation / Judge prompt handling
      if (this.scenario === 'always_fail') {
        response = JSON.stringify(SAMPLE_FAILING_EVALUATION, null, 2);
      } else if (this.scenario === 'fail_then_pass') {
        if (this.callCount <= 2) {
          response = JSON.stringify(SAMPLE_FAILING_EVALUATION, null, 2);
        } else {
          response = JSON.stringify(SAMPLE_PASSING_EVALUATION, null, 2);
        }
      } else if (this.scenario === 'malformed_json') {
        // Return JSON wrapped with markdown fences and extra commentary
        response = `\`\`\`json\n${JSON.stringify(SAMPLE_PASSING_EVALUATION, null, 2)}\n\`\`\``;
      } else {
        response = JSON.stringify(SAMPLE_PASSING_EVALUATION, null, 2);
      }
    } else {
      // Content Generation or Refinement handling
      if (this.defaultResponse) {
        response = this.defaultResponse;
      } else {
        // Read valid institutional draft fixture if available
        try {
          const fixturePath = path.join(__dirname, 'fixtures', 'valid_institutional_draft.md');
          if (fs.existsSync(fixturePath)) {
            response = fs.readFileSync(fixturePath, 'utf-8');
          } else {
            response = `# Mock Title\n\nMock body content with sufficient words.\n`;
          }
        } catch {
          response = `# Mock Title\n\nMock body content.\n`;
        }
      }
    }

    this.callHistory.push({ prompt, options, response });
    return response;
  }

  public reset() {
    this.callCount = 0;
    this.callHistory = [];
    this.responses = [];
    this.rateLimitTriggered = false;
    this.scenario = 'default';
  }
}

/**
 * Isolated Temporary Sandbox for E2E filesystem tests.
 */
export class TestSandbox {
  public baseDir: string;
  public outputDir: string;
  public evalDir: string;

  constructor(prefix = 'blog_pipeline_test_') {
    this.baseDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    this.outputDir = path.join(this.baseDir, 'output');
    this.evalDir = path.join(this.baseDir, '.evaluations');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(this.evalDir, { recursive: true });
  }

  public cleanup() {
    try {
      if (fs.existsSync(this.baseDir)) {
        fs.rmSync(this.baseDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error in temp
    }
  }
}
