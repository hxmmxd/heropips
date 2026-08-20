import { Topic, LlmClient, GenerationOptions, RubricEvaluationResult } from '../types.js';
import { generateInitialDraft } from './generator.js';
import { evaluateDraft } from './judge.js';

export interface LoopOptions {
  maxRetries?: number; // default: 2 (total 3 attempts)
  initialTemperature?: number;
  onAttemptComplete?: (attempt: number, draft: string, evaluation: RubricEvaluationResult) => void;
}

export interface LoopResult {
  finalDraft: string;
  finalEvaluation: RubricEvaluationResult;
  attempts: number;
  isApproved: boolean;
  history: Array<{
    attempt: number;
    draft: string;
    evaluation: RubricEvaluationResult;
  }>;
}

/**
 * Builds a targeted refinement prompt instructing the LLM to resolve specific rubric critiques,
 * expand technical depth, eliminate fluff, and fix structural defects.
 */
export function buildRefinementPrompt(
  topic: Topic,
  currentDraft: string,
  evaluation: RubricEvaluationResult,
  attempt: number
): string {
  const failedGates = Object.entries(evaluation.hard_gates)
    .filter(([_, passed]) => !passed)
    .map(([gate]) => `- FAILED HARD GATE: ${gate}`);

  const issuesList = evaluation.identified_issues
    .map(
      (issue, i) =>
        `${i + 1}. [${issue.severity.toUpperCase()}] Dimension: ${issue.dimension} (Location: ${issue.location})\n` +
        `   Issue: ${issue.issue_description}\n` +
        `   Fix Required: ${issue.suggested_fix}`
    )
    .join('\n\n');

  return `You are a Senior Quantitative Strategist and Institutional Content Director for HeroPips.

A previous draft of our blog post for Topic #${topic.index} ("${topic.title}") was audited by the Chief Editorial Auditor and FAILED to meet our Institutional Grade Rubric standards.

Your mission is to perform a surgical, comprehensive refinement of the draft to resolve EVERY critique, achieve an overall score >= 85, and pass all 5 hard gates.

---

### TOPIC METADATA
- **Index**: ${topic.index}
- **Pillar**: ${topic.pillarName} (${topic.pillarDescriptor})
- **Primary Keyword**: "${topic.primaryKeyword}"
- **Title**: "${topic.title}"
- **Slug**: "${topic.slug}"
- **Required Body Word Count**: >= ${topic.targetWordCount || 1200} substantive body words

---

### AUDIT DEFECTS & REMEDIATION GUIDANCE

${failedGates.length > 0 ? `#### HARD GATE FAILURES:\n${failedGates.join('\n')}\n` : ''}

#### AUDITOR REFINEMENT GUIDANCE:
${evaluation.refinement_prompt_guidance}

#### SPECIFIC IDENTIFIED ISSUES:
${issuesList || 'None specified. Ensure all 6 dimensions exceed 85 points.'}

---

### CRITICAL REFINEMENT INSTRUCTIONS:
1. **EXPAND THIN SECTIONS (Word Count >= 1,200 words)**:
   - Ensure the body text contains at least 1,300–1,600 substantive words.
   - Add concrete quantitative mechanics, mathematical formulas, and deep institutional explanations.
2. **PURGE ALL MARKETING HYPE & BUZZWORDS**:
   - Eliminate retail hype words ("moon", "100x", "guaranteed", "revolutionize", "easy profits").
   - Replace with probabilistic risk paradigms, Sharpe ratios, and variance models.
3. **STRICT MARKDOWN STRUCTURE**:
   - Preserve YAML frontmatter at the top.
   - Exactly 1 H1 heading.
   - At least 4–6 comprehensive H2 sections with H3 subsections.
   - At least 1 Markdown comparison table.
   - Structured FAQ section with at least 3 technical Q&As.
   - Risk disclosure at the end.
4. **NO AI FILLER**:
   - Do NOT include conversational framing ("Certainly! Here is...", "In this revised version..."). Start directly with the YAML frontmatter.

---

### PREVIOUS CANDIDATE DRAFT TO REVISE:
\`\`\`markdown
${currentDraft}
\`\`\`

Generate the complete, fully refined Markdown article now:`;
}

/**
 * Refines an existing candidate draft based on judge evaluation feedback.
 */
export async function refineDraft(
  client: LlmClient,
  topic: Topic,
  currentDraft: string,
  evaluation: RubricEvaluationResult,
  attempt: number,
  options?: GenerationOptions
): Promise<string> {
  const prompt = buildRefinementPrompt(topic, currentDraft, evaluation, attempt);
  
  // Temperature ramp: Lower temperature on subsequent attempts for increased precision
  // Attempt 1: 0.7 -> Attempt 2: 0.4 -> Attempt 3: 0.2
  const defaultTemp = attempt === 2 ? 0.4 : attempt >= 3 ? 0.2 : 0.5;

  const genOptions: GenerationOptions = {
    temperature: options?.temperature ?? defaultTemp,
    maxTokens: options?.maxTokens ?? 4000,
    ...options
  };

  const refinedDraft = await client.generateContent(prompt, genOptions);
  if (!refinedDraft || typeof refinedDraft !== 'string' || refinedDraft.trim().length === 0) {
    throw new Error(`Refinement failed: received empty response from LLM on attempt ${attempt}`);
  }

  return refinedDraft.trim();
}

/**
 * Executes the complete autonomous Generation, Deterministic Pre-check, LLM Judge Evaluation,
 * and Targeted Refinement Loop.
 */
export async function executeGenerationAndEvaluationLoop(
  client: LlmClient,
  topic: Topic,
  options: LoopOptions = {}
): Promise<LoopResult> {
  const maxRetries = options.maxRetries ?? 2; // 1 initial + 2 retries = 3 attempts max
  const history: Array<{ attempt: number; draft: string; evaluation: RubricEvaluationResult }> = [];

  let currentAttempt = 1;
  let currentDraft = '';
  let currentEvaluation: RubricEvaluationResult | null = null;
  let isApproved = false;

  while (currentAttempt <= maxRetries + 1 && !isApproved) {
    if (currentAttempt === 1) {
      // 1. Initial Generation
      currentDraft = await generateInitialDraft(client, topic, {
        temperature: options.initialTemperature ?? 0.7
      });
    } else {
      // 2. Refinement of previous draft with critique
      currentDraft = await refineDraft(
        client,
        topic,
        currentDraft,
        currentEvaluation!,
        currentAttempt
      );
    }

    // 3. Evaluation Step
    currentEvaluation = await evaluateDraft(client, topic, currentDraft);

    history.push({
      attempt: currentAttempt,
      draft: currentDraft,
      evaluation: currentEvaluation
    });

    if (options.onAttemptComplete) {
      options.onAttemptComplete(currentAttempt, currentDraft, currentEvaluation);
    }

    if (currentEvaluation.passed && currentEvaluation.overall_score >= 85) {
      isApproved = true;
      break;
    }

    currentAttempt++;
  }

  return {
    finalDraft: currentDraft,
    finalEvaluation: currentEvaluation!,
    attempts: history.length,
    isApproved,
    history
  };
}
