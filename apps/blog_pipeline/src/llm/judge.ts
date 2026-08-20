import { Topic, LlmClient, RubricEvaluationResult, RubricEvaluationResultSchema } from '../types.js';
import { deterministicPreCheck, countWords, validateMarkdownStructure } from '../rubric/deterministic.js';
import { buildJudgePrompt, calculateCompositeScore, PASSING_SCORE_THRESHOLD, RUBRIC_WEIGHTS } from '../rubric/institutionalGrade.js';

/**
 * Resilient JSON extractor and repair utility for LLM outputs.
 * Handles markdown code fences, unescaped characters, and trailing commas.
 */
export function extractAndParseJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('extractAndParseJson error: input is empty or not a string');
  }

  let cleaned = rawText.trim();

  // Strip leading/trailing markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt basic repair
    try {
      const repaired = cleaned
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas before closing braces/brackets
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // Quote unquoted keys
      return JSON.parse(repaired);
    } catch (secondErr: any) {
      // Find first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = cleaned.slice(firstBrace, lastBrace + 1)
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(slice);
      }
      throw new Error(`Failed to parse JSON response from LLM judge: ${secondErr.message}\nRaw response:\n${rawText}`);
    }
  }
}

/**
 * Evaluates a candidate draft against the Institutional Grade Rubric using LLM-as-a-Judge
 * combined with deterministic pre-check verification.
 */
export async function evaluateDraft(
  client: LlmClient,
  topic: Topic,
  draftMarkdown: string
): Promise<RubricEvaluationResult> {
  // 1. Run local deterministic pre-checks
  const preCheck = deterministicPreCheck(draftMarkdown, topic.targetWordCount || 1200);

  // 2. Build prompt and call LLM Judge
  const prompt = buildJudgePrompt(topic, draftMarkdown);
  const rawResponse = await client.generateContent(prompt, {
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 4000
  });

  // 3. Resiliently parse judge JSON response
  let rawEval: any = extractAndParseJson(rawResponse);

  // 4. Normalize and merge deterministic results
  const actualWordCount = preCheck.wordCount;
  const hardGates = {
    min_word_count_met: Boolean(rawEval.hard_gates?.min_word_count_met && preCheck.wordCountPassed),
    no_critical_factual_errors: Boolean(rawEval.hard_gates?.no_critical_factual_errors ?? true),
    no_hyperbolic_marketing_fluff: Boolean(rawEval.hard_gates?.no_hyperbolic_marketing_fluff ?? true),
    valid_markdown_hierarchy: Boolean(rawEval.hard_gates?.valid_markdown_hierarchy && preCheck.structurePassed),
    no_llm_boilerplate_artifacts: Boolean(rawEval.hard_gates?.no_llm_boilerplate_artifacts ?? true)
  };

  // Ensure dimension scores are complete and structured
  const rawDims = rawEval.dimension_scores || {};
  const normalizeDim = (key: keyof typeof RUBRIC_WEIGHTS, defaultWeight: number) => {
    const raw = rawDims[key] || {};
    const score = typeof raw.score === 'number' ? Math.min(100, Math.max(0, raw.score)) : 70;
    const passed = typeof raw.passed === 'boolean' ? raw.passed : score >= PASSING_SCORE_THRESHOLD;
    const weight = typeof raw.weight === 'number' ? raw.weight : defaultWeight;
    const critique = raw.critique || `Evaluation for ${key}`;
    const remediation = Array.isArray(raw.actionable_remediation)
      ? raw.actionable_remediation
      : Array.isArray(raw.weaknesses)
      ? raw.weaknesses
      : [];

    return {
      score,
      passed,
      weight,
      critique,
      actionable_remediation: remediation,
      strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
      weaknesses: remediation
    };
  };

  const dimensionScores = {
    institutional_tone: normalizeDim('institutional_tone', RUBRIC_WEIGHTS.institutional_tone),
    financial_crypto_accuracy: normalizeDim('financial_crypto_accuracy', RUBRIC_WEIGHTS.financial_crypto_accuracy),
    word_count_depth: normalizeDim('word_count_depth', RUBRIC_WEIGHTS.word_count_depth),
    markdown_structure: normalizeDim('markdown_structure', RUBRIC_WEIGHTS.markdown_structure),
    seo_optimization: normalizeDim('seo_optimization', RUBRIC_WEIGHTS.seo_optimization),
    readability_formatting: normalizeDim('readability_formatting', RUBRIC_WEIGHTS.readability_formatting)
  };

  // If deterministic word count failed, penalize word_count_depth score
  if (!preCheck.wordCountPassed) {
    dimensionScores.word_count_depth.score = Math.min(dimensionScores.word_count_depth.score, 40);
    dimensionScores.word_count_depth.passed = false;
  }
  if (!preCheck.structurePassed) {
    dimensionScores.markdown_structure.score = Math.min(dimensionScores.markdown_structure.score, 50);
    dimensionScores.markdown_structure.passed = false;
  }

  // 5. Calculate composite score
  const compositeScore = calculateCompositeScore(dimensionScores);
  const allHardGatesPassed = Object.values(hardGates).every(Boolean);
  const isApproved = compositeScore >= PASSING_SCORE_THRESHOLD && allHardGatesPassed;

  // 6. Assemble identified issues
  const identifiedIssues = Array.isArray(rawEval.identified_issues)
    ? rawEval.identified_issues.map((issue: any) => ({
        severity: ['fatal', 'major', 'minor'].includes(issue.severity) ? issue.severity : 'major',
        dimension: issue.dimension || 'general',
        location: issue.location || 'Section',
        issue_description: issue.issue_description || 'Identified issue',
        suggested_fix: issue.suggested_fix || 'Improve content quality'
      }))
    : [];

  // Add deterministic errors as fatal issues if any
  if (!preCheck.wordCountPassed) {
    identifiedIssues.unshift({
      severity: 'fatal' as const,
      dimension: 'word_count_depth',
      location: 'Full Document',
      issue_description: `Actual word count (${actualWordCount}) is less than the required ${topic.targetWordCount || 1200} words.`,
      suggested_fix: `Expand technical depth across sections to reach at least ${topic.targetWordCount || 1200} words.`
    });
  }

  for (const err of preCheck.structure.errors) {
    identifiedIssues.push({
      severity: 'major' as const,
      dimension: 'markdown_structure',
      location: 'Heading Structure',
      issue_description: err,
      suggested_fix: 'Ensure exactly 1 H1 heading and at least 4 H2 headings without jumping heading levels.'
    });
  }

  const result: RubricEvaluationResult = {
    evaluation_timestamp: rawEval.evaluation_timestamp || new Date().toISOString(),
    topic_slug: topic.slug,
    topic_index: topic.index,
    word_count_actual: actualWordCount,
    overall_score: compositeScore,
    passed: isApproved,
    hard_gates: hardGates,
    dimension_scores: dimensionScores,
    identified_issues: identifiedIssues,
    refinement_prompt_guidance:
      rawEval.refinement_prompt_guidance ||
      (isApproved
        ? 'Article meets institutional grade criteria and is approved for publication.'
        : `CRITICAL FIXES REQUIRED: Address all identified issues to achieve >= 85 overall score and pass all hard gates.`)
  };

  // 7. Validate with Zod schema
  const parsed = RubricEvaluationResultSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error(`Evaluation schema validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
}
